const { desktopCapturer, ipcMain } = require('electron');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// ─── Enterprise Remote Desktop Daemon ─────────────────────────────────────────
class RemoteDaemon {
  constructor() {
    this.activeSession = false;
    this.sessionInterval = null;
    this.quality = '720p'; // '1080p' | '720p' | '480p'
    this.fps = 15;
    this.mainWindow = null;
    this.managerUrl = null;
    this.tenantId = null;
    this.endpointId = null;
    this.overlayWindow = null;
    this.lastFrameHash = null;
  }

  init({ mainWindow, managerUrl, tenantId, endpointId }) {
    this.mainWindow = mainWindow;
    this.managerUrl = managerUrl;
    this.tenantId = tenantId;
    this.endpointId = endpointId;

    // Listen for IPC remote control events from main process or renderer
    ipcMain.handle('remote:start-session', async (event, params) => {
      return this.startSession(params);
    });

    ipcMain.handle('remote:stop-session', async () => {
      return this.stopSession();
    });

    ipcMain.handle('remote:inject-input', async (event, inputData) => {
      return this.injectInput(inputData);
    });

    ipcMain.handle('remote:execute-cmd', async (event, command) => {
      return this.executeRemoteCmd(command);
    });

    console.log('[RemoteDaemon] Enterprise Remote Desktop service initialized in background.');
    this.startRelayPolling();
  }

  startRelayPolling() {
    const axios = require('axios');

    const poll = async () => {
      if (!this.endpointId || !this.managerUrl) {
        setTimeout(poll, 3000);
        return;
      }

      try {
        const url = `${this.managerUrl}/api/endpoints/${this.endpointId}/remote-relay?role=agent`;
        const headers = {};
        if (process.env.AGENT_SECRET) {
          headers['X-Agent-Token'] = process.env.AGENT_SECRET;
        }

        // GET current state and queued inputs
        const res = await axios.get(url, { headers, timeout: 5000 });
        const { is_active, input_queue } = res.data;

        if (is_active && !this.activeSession) {
          console.log('[RemoteDaemon] Web relay active. Initiating remote session.');
          this.activeSession = true;
          this.lastFrameHash = null;
        } else if (!is_active && this.activeSession) {
          console.log('[RemoteDaemon] Web relay inactive. Terminating remote session.');
          this.activeSession = false;
          this.lastFrameHash = null;
        }

        if (this.activeSession) {
          if (Array.isArray(input_queue) && input_queue.length > 0) {
            await this.processInputQueue(input_queue, url, headers, axios);
          }

          this.pollCount = (this.pollCount || 0) + 1;
          const forceFrame = this.pollCount % 5 === 0;
          const frame = await this.captureScreenFrame(forceFrame);
          if (frame) {
            await axios.post(url, { frame }, { headers, timeout: 5000 });
          }
        }
      } catch (err) {
        console.error('[RemoteDaemon] Relay poll warning:', err.message);
      }

      const nextDelay = this.activeSession ? 150 : 3000;
      setTimeout(poll, nextDelay);
    };

    poll();
  }

  // Coalesce queued inputs and execute in batched execution script to eliminate CPU overhead
  async processInputQueue(inputQueue, url, headers, axios) {
    const commands = [];
    const nonCommandInputs = [];

    for (const input of inputQueue) {
      if (input.type === 'command') {
        commands.push(input);
      } else {
        nonCommandInputs.push(input);
      }
    }

    // Execute any remote shell commands
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
        if (lastMove) {
          optimizedInputs.push(lastMove);
          lastMove = null;
        }
        optimizedInputs.push(input);
      }
    }
    if (lastMove) optimizedInputs.push(lastMove);

    // Execute optimized inputs in batch
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
        const primarySource = sources[0];
        // High clarity JPEG quality set to 85 for crisp text and sharp UI rendering
        const jpegBuffer = primarySource.thumbnail.toJPEG(85);
        if (jpegBuffer && jpegBuffer.length > 0) {
          const base64Str = jpegBuffer.toString('base64');
          // Deduplicate identical frames to save bandwidth unless forced
          if (!force && base64Str === this.lastFrameHash) {
            return null;
          }
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
    console.log('[RemoteDaemon] Remote control session terminated.');

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('remote:status-changed', { active: false });
    }

    return { success: true };
  }

  async injectInput(input) {
    if (!this.activeSession) return { success: false, reason: 'No active session' };

    const { type, xPct, yPct, button, key, deltaY } = input;

    try {
      if (process.platform === 'win32') {
        let psCode = `
          Add-Type -AssemblyName System.Windows.Forms;
          Add-Type -AssemblyName System.Drawing;
        `;

        if (type === 'click' || type === 'move' || type === 'rightclick' || type === 'dblclick' || type === 'scroll') {
          psCode += `
            $w = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width;
            $h = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height;
            $posX = [int]($w * ${xPct || 0});
            $posY = [int]($h * ${yPct || 0});
            [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($posX, $posY);
          `;

          if (type === 'click' || type === 'rightclick' || type === 'dblclick' || type === 'scroll') {
            psCode += `
              if (-not ([System.Management.Automation.PSTypeName]'WinApiMouse').Type) {
                Add-Type -TypeDefinition @"
                using System;
                using System.Runtime.InteropServices;
                public class WinApiMouse {
                  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);
                }
"@
              }
            `;
            if (type === 'click') {
              psCode += `[WinApiMouse]::mouse_event(0x02, 0, 0, 0, 0); [WinApiMouse]::mouse_event(0x04, 0, 0, 0, 0);`;
            } else if (type === 'rightclick') {
              psCode += `[WinApiMouse]::mouse_event(0x08, 0, 0, 0, 0); [WinApiMouse]::mouse_event(0x10, 0, 0, 0, 0);`;
            } else if (type === 'dblclick') {
              psCode += `[WinApiMouse]::mouse_event(0x02, 0, 0, 0, 0); [WinApiMouse]::mouse_event(0x04, 0, 0, 0, 0); [WinApiMouse]::mouse_event(0x02, 0, 0, 0, 0); [WinApiMouse]::mouse_event(0x04, 0, 0, 0, 0);`;
            } else if (type === 'scroll') {
              const scrollAmt = (deltaY || 0) < 0 ? 120 : -120;
              psCode += `[WinApiMouse]::mouse_event(0x0800, 0, 0, ${scrollAmt}, 0);`;
            }
          }
        } else if (type === 'keydown' && key) {
          // Translate key names for SendKeys
          let sendKeyStr = key;
          if (key.length === 1) {
            sendKeyStr = key;
          } else {
            const keyMap = {
              'Enter': '{ENTER}', 'Backspace': '{BACKSPACE}', 'Tab': '{TAB}',
              'Escape': '{ESC}', 'Delete': '{DELETE}', 'ArrowUp': '{UP}',
              'ArrowDown': '{DOWN}', 'ArrowLeft': '{LEFT}', 'ArrowRight': '{RIGHT}',
              'Home': '{HOME}', 'End': '{END}', 'PageUp': '{PGUP}', 'PageDown': '{PGDN}',
              ' ': ' '
            };
            sendKeyStr = keyMap[key] || '';
          }
          if (sendKeyStr) {
            psCode += `[System.Windows.Forms.SendKeys]::SendWait('${sendKeyStr.replace(/'/g, "''")}');`;
          }
        }

        const singleLinePs = psCode.replace(/\s+/g, ' ').trim();
        await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${singleLinePs}"`, { timeout: 1500 });
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async executeRemoteCmd(command) {
    if (!command) return { error: 'Empty command' };

    try {
      const shellCmd = process.platform === 'win32'
        ? `powershell -NoProfile -Command "${command.replace(/"/g, '\"')}"`
        : command;

      const { stdout, stderr } = await execAsync(shellCmd, { timeout: 10000, encoding: 'utf8' });
      return { output: stdout || stderr || 'Command executed successfully.' };
    } catch (e) {
      return { error: e.message || 'Execution error' };
    }
  }
}

module.exports = new RemoteDaemon();
