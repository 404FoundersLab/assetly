const { desktopCapturer, ipcMain, BrowserWindow } = require('electron');
const { exec, spawn } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const os = require('os');
const execAsync = util.promisify(exec);

// Persistent PowerShell worker that injects mouse/keyboard input with very low latency.
// (Spawning a new PowerShell per event was far too slow for interactive control.)
const INPUT_WORKER_SCRIPT = String.raw`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, int d, int e);
}
"@
[void][W]::SetProcessDPIAware()
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$map = @{
  'Enter'='{ENTER}'; 'Backspace'='{BACKSPACE}'; 'Tab'='{TAB}'; 'Escape'='{ESC}'; 'Delete'='{DELETE}';
  'ArrowUp'='{UP}'; 'ArrowDown'='{DOWN}'; 'ArrowLeft'='{LEFT}'; 'ArrowRight'='{RIGHT}';
  'Home'='{HOME}'; 'End'='{END}'; 'PageUp'='{PGUP}'; 'PageDown'='{PGDN}'; 'Insert'='{INSERT}';
  'F1'='{F1}'; 'F2'='{F2}'; 'F3'='{F3}'; 'F4'='{F4}'; 'F5'='{F5}'; 'F6'='{F6}';
  'F7'='{F7}'; 'F8'='{F8}'; 'F9'='{F9}'; 'F10'='{F10}'; 'F11'='{F11}'; 'F12'='{F12}'
}
while (($line = [Console]::In.ReadLine()) -ne $null) {
  try {
    $i = $line | ConvertFrom-Json
    if ($i.type -eq 'keydown') {
      $k = [string]$i.key
      $s = $null
      if ($k.Length -eq 1) {
        $s = $k
        if ('+^%~(){}[]'.Contains($s)) { $s = '{' + $s + '}' }
      } elseif ($map.ContainsKey($k)) {
        $s = $map[$k]
      }
      if ($s) {
        $pre = ''
        if ($i.ctrl) { $pre += '^' }
        if ($i.alt) { $pre += '%' }
        if ($i.shift -and $k.Length -ne 1) { $pre += '+' }
        [System.Windows.Forms.SendKeys]::SendWait($pre + $s)
      }
      continue
    }
    $x = [int]($b.X + $b.Width * [double]$i.xPct)
    $y = [int]($b.Y + $b.Height * [double]$i.yPct)
    [void][W]::SetCursorPos($x, $y)
    switch ($i.type) {
      'down'       { if ($i.button -eq 2) { [W]::mouse_event(0x08,0,0,0,0) } else { [W]::mouse_event(0x02,0,0,0,0) } }
      'up'         { if ($i.button -eq 2) { [W]::mouse_event(0x10,0,0,0,0) } else { [W]::mouse_event(0x04,0,0,0,0) } }
      'click'      { [W]::mouse_event(0x02,0,0,0,0); [W]::mouse_event(0x04,0,0,0,0) }
      'rightclick' { [W]::mouse_event(0x08,0,0,0,0); [W]::mouse_event(0x10,0,0,0,0) }
      'dblclick'   { 1..2 | ForEach-Object { [W]::mouse_event(0x02,0,0,0,0); [W]::mouse_event(0x04,0,0,0,0) } }
      'scroll'     {
        $amt = [int](-1.2 * [double]$i.deltaY)
        if ($amt -gt 1200) { $amt = 1200 }
        if ($amt -lt -1200) { $amt = -1200 }
        [W]::mouse_event(0x0800,0,0,$amt,0)
      }
    }
  } catch { }
}
`;

// Enterprise Remote Desktop Daemon.
// Primary transport: WebRTC (hidden host window streams the screen, data channel carries input).
// Fallback transport: JPEG frames over the HTTP relay (used until WebRTC connects, or if it fails).
class RemoteDaemon {
  constructor() {
    this.activeSession = false;
    this.sessionInterval = null;
    this.quality = '720p'; // fallback relay quality: '1080p' | '720p' | '480p'
    this.fps = 15;
    this.mainWindow = null;
    this.managerUrl = null;
    this.tenantId = null;
    this.endpointId = null;
    this.lastFrameHash = null;

    this.relayUrl = null;
    this.relayHeaders = {};
    this.lastSignalId = 0;
    this.sessionStartedAt = 0;
    this.rtcState = 'closed';
    this.hostWindow = null;
    this.hostReady = null;
    this.hostReadyResolve = null;
    this.inputWorker = null;
  }

  init({ mainWindow, managerUrl, tenantId, endpointId }) {
    this.mainWindow = mainWindow;
    this.managerUrl = managerUrl;
    this.tenantId = tenantId;
    this.endpointId = endpointId;

    ipcMain.handle('remote:start-session', async (event, params) => this.startSession(params));
    ipcMain.handle('remote:stop-session', async () => this.stopSession());
    ipcMain.handle('remote:inject-input', async (event, inputData) => this.injectInput(inputData));
    ipcMain.handle('remote:execute-cmd', async (event, command) => this.executeRemoteCmd(command));

    // WebRTC host window IPC
    ipcMain.handle('rtc:get-source', async () => {
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } });
      return sources.length ? sources[0].id : null;
    });
    ipcMain.on('rtc:host-ready', () => { if (this.hostReadyResolve) this.hostReadyResolve(); });
    ipcMain.on('rtc:signal-out', (event, signal) => this.postSignal(signal));
    ipcMain.on('rtc:input', (event, input) => { this.injectInput(input); });
    ipcMain.on('rtc:state', (event, state) => {
      this.rtcState = state;
      console.log(`[RemoteDaemon] WebRTC state: ${state}`);
    });

    console.log('[RemoteDaemon] Enterprise Remote Desktop service initialized in background.');
    this.startRelayPolling();
  }

  // ---- WebRTC host window ---------------------------------------------------------------------
  ensureHostWindow() {
    if (this.hostWindow && !this.hostWindow.isDestroyed()) return this.hostReady;

    this.hostReady = new Promise((resolve) => { this.hostReadyResolve = resolve; });
    this.hostWindow = new BrowserWindow({
      show: false,
      width: 320,
      height: 240,
      webPreferences: {
        preload: path.join(__dirname, 'remote-host-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    });
    this.hostWindow.on('closed', () => { this.hostWindow = null; this.rtcState = 'closed'; });
    this.hostWindow.loadFile(path.join(__dirname, 'remote-host.html')).catch((e) => {
      console.error('[RemoteDaemon] Failed to load host window:', e.message);
    });
    return this.hostReady;
  }

  closeHostWindow() {
    if (this.hostWindow && !this.hostWindow.isDestroyed()) {
      this.hostWindow.destroy();
    }
    this.hostWindow = null;
    this.rtcState = 'closed';
  }

  async deliverSignal(signal) {
    await this.ensureHostWindow();
    if (this.hostWindow && !this.hostWindow.isDestroyed()) {
      this.hostWindow.webContents.send('rtc:signal-in', signal);
    }
  }

  async postSignal(signal) {
    if (!this.relayUrl) return;
    try {
      const axios = require('axios');
      await axios.post(this.relayUrl, { signal }, { headers: this.relayHeaders, timeout: 5000 });
    } catch (e) {
      console.error('[RemoteDaemon] Signal post failed:', e.message);
    }
  }

  // ---- Relay polling --------------------------------------------------------------------------
  startRelayPolling() {
    const axios = require('axios');

    const poll = async () => {
      if (!this.endpointId || !this.managerUrl) {
        setTimeout(poll, 3000);
        return;
      }

      try {
        const base = `${this.managerUrl}/api/endpoints/${this.endpointId}/remote-relay?role=agent`;
        const url = base;
        this.relayUrl = base;
        const headers = {};
        if (process.env.AGENT_SECRET) {
          headers['X-Agent-Token'] = process.env.AGENT_SECRET;
        }
        this.relayHeaders = headers;

        const res = await axios.get(`${base}&since=${this.lastSignalId}`, { headers, timeout: 5000 });
        const { is_active, input_queue, signals } = res.data;

        if (is_active && !this.activeSession) {
          console.log('[RemoteDaemon] Web relay active. Initiating remote session.');
          this.activeSession = true;
          this.sessionStartedAt = Date.now();
          this.lastFrameHash = null;
        } else if (!is_active && this.activeSession) {
          console.log('[RemoteDaemon] Web relay inactive. Terminating remote session.');
          this.activeSession = false;
          this.lastFrameHash = null;
          this.closeHostWindow();
          this.stopInputWorker();
        }

        if (this.activeSession) {
          // WebRTC signaling
          if (Array.isArray(signals)) {
            for (const s of signals) {
              this.lastSignalId = Math.max(this.lastSignalId, Number(s.id) || 0);
              await this.deliverSignal(s.payload);
            }
          }

          if (Array.isArray(input_queue) && input_queue.length > 0) {
            await this.processInputQueue(input_queue, url, headers, axios);
          }

          // JPEG relay fallback: only while WebRTC is not connected (after a short grace period)
          const rtcConnected = this.rtcState === 'connected';
          if (!rtcConnected && Date.now() - this.sessionStartedAt > 4000) {
            this.pollCount = (this.pollCount || 0) + 1;
            const forceFrame = this.pollCount % 5 === 0;
            const frame = await this.captureScreenFrame(forceFrame);
            if (frame) {
              await axios.post(url, { frame }, { headers, timeout: 5000 });
            }
          }
        }
      } catch (err) {
        console.error('[RemoteDaemon] Relay poll warning:', err.message);
      }

      let nextDelay = 3000;
      if (this.activeSession) nextDelay = this.rtcState === 'connected' ? 500 : 200;
      setTimeout(poll, nextDelay);
    };

    poll();
  }

  // Remote shell commands and relay-mode (fallback) input events
  async processInputQueue(inputQueue, url, headers, axios) {
    const commands = [];
    const nonCommandInputs = [];

    for (const input of inputQueue) {
      if (input.type === 'command') commands.push(input);
      else nonCommandInputs.push(input);
    }

    for (const cmdInput of commands) {
      const cmdRes = await this.executeRemoteCmd(cmdInput.command);
      await axios.post(url, { commandResult: cmdRes.output || cmdRes.error }, { headers, timeout: 5000 }).catch(() => {});
    }

    if (nonCommandInputs.length === 0) return;

    // Coalesce mouse moves: keep only the latest move event, but preserve all clicks/keys
    const optimizedInputs = [];
    let lastMove = null;
    for (const input of nonCommandInputs) {
      if (input.type === 'move') {
        lastMove = input;
      } else {
        if (lastMove) { optimizedInputs.push(lastMove); lastMove = null; }
        optimizedInputs.push(input);
      }
    }
    if (lastMove) optimizedInputs.push(lastMove);

    for (const input of optimizedInputs) {
      await this.injectInput(input);
    }
  }

  async captureScreenFrame(force = false) {
    try {
      const dim = this.getThumbnailDimensions();
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: dim
      });

      if (sources && sources.length > 0) {
        const jpegBuffer = sources[0].thumbnail.toJPEG(85);
        if (jpegBuffer && jpegBuffer.length > 0) {
          const base64Str = jpegBuffer.toString('base64');
          if (!force && base64Str === this.lastFrameHash) return null;
          this.lastFrameHash = base64Str;
          return `data:image/jpeg;base64,${base64Str}`;
        }
      }
      return null;
    } catch (e) {
      console.error('[RemoteDaemon] Frame capture error:', e.message);
      return null;
    }
  }

  getThumbnailDimensions() {
    switch (this.quality) {
      case '1080p': return { width: 1920, height: 1080 };
      case '480p':  return { width: 854, height: 480 };
      case '720p':
      default:      return { width: 1280, height: 720 };
    }
  }

  async startSession(params = {}) {
    if (params.quality) this.quality = params.quality;
    this.activeSession = true;
    this.sessionStartedAt = Date.now();
    this.lastFrameHash = null;
    console.log(`[RemoteDaemon] Remote session started. Quality: ${this.quality}`);

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('remote:status-changed', { active: true, quality: this.quality });
    }
    return { success: true, message: 'Remote control session active' };
  }

  async stopSession() {
    this.activeSession = false;
    this.lastFrameHash = null;
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval);
      this.sessionInterval = null;
    }
    this.closeHostWindow();
    this.stopInputWorker();
    console.log('[RemoteDaemon] Remote control session terminated.');

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('remote:status-changed', { active: false });
    }
    return { success: true };
  }

  // ---- Input injection (persistent PowerShell worker) ------------------------------------------
  startInputWorker() {
    if (this.inputWorker && !this.inputWorker.killed) return this.inputWorker;
    const scriptPath = path.join(os.tmpdir(), 'assetly-input-worker.ps1');
    fs.writeFileSync(scriptPath, INPUT_WORKER_SCRIPT, 'utf8');
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
      stdio: ['pipe', 'ignore', 'ignore'],
      windowsHide: true
    });
    child.on('exit', () => { if (this.inputWorker === child) this.inputWorker = null; });
    child.stdin.on('error', () => {});
    this.inputWorker = child;
    return child;
  }

  stopInputWorker() {
    if (this.inputWorker) {
      try { this.inputWorker.kill(); } catch (e) {}
      this.inputWorker = null;
    }
  }

  async injectInput(input) {
    if (!this.activeSession) return { success: false, reason: 'No active session' };
    if (!input || typeof input !== 'object') return { success: false, reason: 'Bad input' };
    if (process.platform !== 'win32') return { success: false, reason: 'Input injection only supported on Windows' };

    try {
      const worker = this.startInputWorker();
      worker.stdin.write(JSON.stringify(input) + '\n');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async executeRemoteCmd(command) {
    if (!command) return { error: 'Empty command' };

    try {
      const shellCmd = process.platform === 'win32'
        ? `powershell -NoProfile -Command "${command.replace(/"/g, '\\"')}"`
        : command;

      const { stdout, stderr } = await execAsync(shellCmd, { timeout: 10000, encoding: 'utf8' });
      return { output: stdout || stderr || 'Command executed successfully.' };
    } catch (e) {
      return { error: e.message || 'Execution error' };
    }
  }
}

module.exports = new RemoteDaemon();

