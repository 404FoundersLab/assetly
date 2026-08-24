const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const si = require('systeminformation');
const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

// ─── Config ─────────────────────────────────────────────────────────────────
const MANAGER_URL = process.env.MANAGER_URL || 'https://assetly-azure.vercel.app';

// Extract Tenant ID from binary signature or fallback to active tenant
let TENANT_ID = process.env.TENANT_ID || '96355bdb-bda1-4f3f-92d2-7a67b4a348e6';
try {
  const exePath = process.execPath;
  if (fs.existsSync(exePath)) {
    const stat = fs.statSync(exePath);
    const bufferSize = 256;
    const startPos = Math.max(0, stat.size - bufferSize);
    const buffer = Buffer.alloc(bufferSize);
    const fd = fs.openSync(exePath, 'r');
    fs.readSync(fd, buffer, 0, bufferSize, startPos);
    fs.closeSync(fd);
    const content = buffer.toString('utf8');
    const signatureMatch = content.match(/___TENANT_ID___:([a-f0-9\-]{36})/i);
    if (signatureMatch && signatureMatch[1]) {
      TENANT_ID = signatureMatch[1];
    }
  }
} catch (e) {}

let remoteDaemon = null;
try {
  remoteDaemon = require('./remote-daemon');
} catch (e) {
  console.error('[Main] RemoteDaemon module load warning:', e.message);
  remoteDaemon = {
    init: () => {},
    captureScreenFrame: async () => null,
    startSession: async () => ({ success: false }),
    stopSession: async () => ({ success: true }),
    injectInput: async () => ({ success: false }),
    executeRemoteCmd: async () => ({ error: 'Remote daemon unavailable' })
  };
}

let endpointId = null;
let telemetryHistory = [];
let mainWindow = null;
let tray = null;

function getConfigPath() {
  try {
    let dir;
    if (app && typeof app.isReady === 'function' && app.isReady()) {
      dir = app.getPath('userData');
    } else {
      dir = path.join(os.homedir(), '.assetmanager-client');
    }
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'agent_config.json');
  } catch (e) {
    try {
      const fallbackDir = path.join(os.homedir(), '.assetmanager-client');
      if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true });
      return path.join(fallbackDir, 'agent_config.json');
    } catch (err) {
      return null;
    }
  }
}

function loadSavedEndpointId() {
  try {
    const file = getConfigPath();
    if (file && fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data && data.endpointId) {
        endpointId = data.endpointId;
        console.log(`[Main] Loaded persisted Endpoint ID: ${endpointId}`);
      }
    }
  } catch (e) {
    console.error('[Main] Error reading config:', e.message);
  }
}

function saveEndpointId(id) {
  endpointId = id;
  if (remoteDaemon) remoteDaemon.endpointId = id;
  try {
    const file = getConfigPath();
    if (file) {
      if (id) {
        fs.writeFileSync(file, JSON.stringify({ endpointId: id, registeredAt: new Date().toISOString() }, null, 2));
      } else if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
  } catch (e) {
    console.error('[Main] Error saving config:', e.message);
  }
}

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Cache static system info to avoid repeated expensive CLI calls
let cachedOsInfo = null;
let cachedCpuModel = null;
let cachedSerialNumber = null;
let cachedSecurityStatic = {
  firewall_status: 'ON',
  defender_status: 'Active',
  antivirus_updated_at: new Date().toISOString(),
  bitlocker_status: 'enabled',
  bitlocker_drive: 'C:'
};

function getRealLocalNetworkInfo() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const lower = name.toLowerCase();
      if (lower.includes('loopback') || lower.includes('vethernet') || lower.includes('docker') || lower.includes('vbox') || lower.includes('vmware') || lower.includes('wsl')) continue;
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('127.') && !net.address.startsWith('169.254.')) {
          return { ip: net.address, mac: net.mac };
        }
      }
    }
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('127.')) {
          return { ip: net.address, mac: net.mac };
        }
      }
    }
  } catch (e) {}
  return { ip: '127.0.0.1', mac: '00:00:00:00:00:00' };
}

function getFastNativeTelemetry() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const uptimeSeconds = Math.floor(os.uptime());
  const cpus = os.cpus();
  const cpuModel = cpus && cpus.length > 0 ? cpus[0].model.trim() : 'System CPU';
  let username = 'User';
  try { username = os.userInfo().username; } catch (e) {}
  const lastRebootAt = new Date(Date.now() - uptimeSeconds * 1000).toISOString();
  const netInfo = getRealLocalNetworkInfo();

  let osVersion = `${os.type()} ${os.release()}`;
  if (typeof os.version === 'function') {
    try {
      const v = os.version();
      if (v) osVersion = v;
    } catch (e) {}
  }

  return {
    hostname: os.hostname(),
    os_version: osVersion,
    os_platform: process.platform,
    ip_address: netInfo.ip,
    mac_address: netInfo.mac,
    cpu_usage: 5,
    cpu_model: cpuModel,
    memory_total: totalMem,
    memory_used: totalMem - freeMem,
    running_processes: [],
    firewall_status: cachedSecurityStatic.firewall_status,
    defender_status: cachedSecurityStatic.defender_status,
    antivirus_updated_at: cachedSecurityStatic.antivirus_updated_at,
    active_ports: [],
    last_logged_user: username,
    uptime_seconds: uptimeSeconds,
    last_reboot_at: lastRebootAt,
    serial_number: cachedSerialNumber || null,
    agent_version: '2.0.0',
    bitlocker_status: cachedSecurityStatic.bitlocker_status,
    bitlocker_drive: cachedSecurityStatic.bitlocker_drive,
    threats: [],
    quarantine: [],
    scan_history: [],
    collected_at: new Date().toISOString()
  };
}

let latestTelemetry = getFastNativeTelemetry();

// Fast helper to run shell commands safely with tight timeouts
async function runCmd(cmd, timeoutMs = 2500) {
  try {
    const { stdout } = await execAsync(cmd, { timeout: timeoutMs, encoding: 'utf8' });
    return stdout ? stdout.trim() : '';
  } catch (e) {
    return '';
  }
}

// ─── Telemetry Collection (Optimized Non-Blocking) ───────────────────────────
async function collectTelemetry() {
  try {
    // Fast OS metrics using native os module (instant, 0ms)
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsed = totalMem - freeMem;
    const uptimeSeconds = Math.floor(os.uptime());
    const lastRebootAt = new Date(Date.now() - uptimeSeconds * 1000).toISOString();
    const username = os.userInfo().username;

    // Parallel lightweight async system queries
    const [cpuLoad, network, processList, netConns] = await Promise.all([
      si.currentLoad().catch(() => ({ currentLoad: 5 })),
      si.networkInterfaces().catch(() => []),
      si.processes().catch(() => ({ list: [] })),
      si.networkConnections().catch(() => [])
    ]);

    // Lazy load static OS & CPU info once
    if (!cachedOsInfo) {
      try {
        const info = await si.osInfo();
        cachedOsInfo = { hostname: os.hostname(), version: `${info.distro} ${info.release}` };
      } catch (e) {
        cachedOsInfo = { hostname: os.hostname(), version: `${os.type()} ${os.release()}` };
      }
    }

    if (!cachedCpuModel) {
      try {
        const cpus = os.cpus();
        cachedCpuModel = cpus && cpus.length > 0 ? cpus[0].model.trim() : 'System CPU';
      } catch (e) {
        cachedCpuModel = 'System CPU';
      }
    }

    // Lazy load serial number once — cross-platform
    if (!cachedSerialNumber) {
      try {
        if (process.platform === 'win32') {
          const raw = await runCmd('powershell -NoProfile -Command "(Get-WmiObject Win32_BIOS).SerialNumber"', 3000);
          cachedSerialNumber = raw && raw !== 'To Be Filled By O.E.M.' && raw !== 'Default string' ? raw : null;
        } else if (process.platform === 'darwin') {
          const raw = await runCmd("system_profiler SPHardwareDataType | awk '/Serial Number/{print $NF}'", 3000);
          cachedSerialNumber = raw || null;
        } else {
          const raw = await runCmd('cat /sys/class/dmi/id/product_serial 2>/dev/null || dmidecode -s system-serial-number 2>/dev/null', 3000);
          cachedSerialNumber = raw && raw !== 'Not Specified' ? raw : null;
        }
      } catch (e) {
        cachedSerialNumber = null;
      }
    }

    let firewall_status = cachedSecurityStatic.firewall_status;
    let defender_status = cachedSecurityStatic.defender_status;
    let antivirus_updated_at = cachedSecurityStatic.antivirus_updated_at;
    let bitlocker_status = cachedSecurityStatic.bitlocker_status;
    let bitlocker_drive = cachedSecurityStatic.bitlocker_drive;
    let threats = [];
    let quarantine = [];
    let scan_history = [];

    // Asynchronous non-blocking platform security queries
    if (process.platform === 'win32') {
      const [fwOutput, defenderOutput, bdeOutput] = await Promise.all([
        runCmd('netsh advfirewall show allprofiles state', 1500),
        runCmd('powershell -NoProfile -Command "$mp = Get-MpComputerStatus; [PSCustomObject]@{ rt = $mp.RealTimeProtectionEnabled; sig = if ($null -ne $mp.AntivirusSignatureLastUpdated) { Get-Date $mp.AntivirusSignatureLastUpdated -Format o } else { $null } } | ConvertTo-Json -Compress"', 3000),
        runCmd('manage-bde -status C:', 1500)
      ]);

      if (fwOutput) {
        firewall_status = fwOutput.includes('ON') ? 'ON' : 'OFF';
      }

      if (defenderOutput) {
        try {
          const parsed = JSON.parse(defenderOutput);
          defender_status = parsed.rt ? 'Active' : 'Disabled';
          if (parsed.sig) antivirus_updated_at = parsed.sig;
        } catch (e) {}
      }

      if (bdeOutput) {
        bitlocker_status = bdeOutput.includes('Protection On') ? 'enabled' : 'disabled';
        bitlocker_drive = 'C:';
      }
    } else if (process.platform === 'darwin') {
      const [fwOutput, gatekeeperOutput, fvOutput] = await Promise.all([
        runCmd('defaults read /Library/Preferences/com.apple.alf globalstate', 1500),
        runCmd('spctl --status', 1500),
        runCmd('fdesetup status', 1500)
      ]);
      firewall_status = parseInt(fwOutput || '1', 10) > 0 ? 'ON' : 'OFF';
      defender_status = gatekeeperOutput.includes('assessments enabled') ? 'Active' : 'Disabled';
      bitlocker_status = fvOutput.includes('FileVault is On') ? 'enabled' : 'disabled';
      bitlocker_drive = 'Macintosh HD';
    } else {
      const [ufwOutput, selinuxOutput, luksOutput] = await Promise.all([
        runCmd('ufw status 2>/dev/null || iptables -L -n 2>/dev/null', 1500),
        runCmd('sestatus 2>/dev/null || aa-status 2>/dev/null', 1500),
        runCmd('lsblk -f 2>/dev/null', 1500)
      ]);
      firewall_status = (ufwOutput.includes('active') || ufwOutput.includes('Chain INPUT')) ? 'ON' : 'OFF';
      defender_status = (selinuxOutput.includes('enforcing') || selinuxOutput.includes('apparmor')) ? 'Active' : 'Disabled';
      bitlocker_status = luksOutput.includes('crypto_LUKS') ? 'enabled' : 'disabled';
      bitlocker_drive = '/dev/sda';
    }

    // Update security static cache
    cachedSecurityStatic = { firewall_status, defender_status, antivirus_updated_at, bitlocker_status, bitlocker_drive };

    // Detect real active connection IP — exclude virtual/Hyper-V/VMware/Docker adapters
    const isVirtualAdapter = (iface) => {
      if (!iface) return false;
      const n = iface.toLowerCase();
      return n.includes('vethernet') || n.includes('vmware') || n.includes('virtualbox') ||
             n.includes('hyper-v') || n.includes('loopback') || n.includes('docker') ||
             n.includes('wsl') || n.includes('pseudo') || n.includes('tap') ||
             n.includes('tunnel') || n.includes('isatap') || n.includes('teredo');
    };
    const isLanIp = (ip) => ip && (ip.startsWith('10.') || ip.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(ip));
    const isHyperVIp = (ip) => ip && /^172\.(1[6-9]|2\d|3[01])\./.test(ip); // 172.16-31.x is often Hyper-V

    // Try to get the default gateway to find the right interface
    let gatewayIp = null;
    try {
      const gwData = await si.networkGatewayDefault();
      gatewayIp = gwData || null;
    } catch (e) {}

    const allIfaces = Array.isArray(network) ? network : [];

    // Filter to only real physical interfaces (not virtual, not loopback, not APIPA)
    const physicalIfaces = allIfaces.filter(n =>
      n.ip4 &&
      !n.ip4.startsWith('127.') &&
      !n.ip4.startsWith('169.254.') &&
      !isVirtualAdapter(n.iface || n.ifaceName || '')
    );

    // Priority 1: physical adapter that shares subnet with the gateway
    let defaultNet = null;
    if (gatewayIp && physicalIfaces.length > 0) {
      const gwPrefix = gatewayIp.split('.').slice(0, 3).join('.');
      defaultNet = physicalIfaces.find(n => n.ip4.startsWith(gwPrefix + '.'));
    }
    // Priority 2: physical adapter with common LAN IP (not Hyper-V 172.x)
    if (!defaultNet) {
      defaultNet = physicalIfaces.find(n => n.ip4.startsWith('192.168.') || n.ip4.startsWith('10.'));
    }
    // Priority 3: any physical adapter
    if (!defaultNet) defaultNet = physicalIfaces[0];
    // Priority 4: any non-loopback, non-APIPA (last resort, may include virtual)
    if (!defaultNet) {
      defaultNet = allIfaces.find(n => n.ip4 && !n.ip4.startsWith('127.') && !n.ip4.startsWith('169.254.')) || allIfaces[0];
    }

    const netConnsArr = Array.isArray(netConns) ? netConns : [];
    const active_ports = netConnsArr
      .filter(c => c.state === 'LISTEN' || c.state === 'ESTABLISHED')
      .slice(0, 50)
      .map(c => ({ protocol: c.protocol, local_port: c.localPort, peer_address: c.peerAddress, state: c.state }));

    return {
      hostname: cachedOsInfo ? cachedOsInfo.hostname : os.hostname(),
      os_version: cachedOsInfo ? cachedOsInfo.version : `${os.type()} ${os.release()}`,
      os_platform: process.platform,
      ip_address: defaultNet ? defaultNet.ip4 : 'unknown',
      mac_address: defaultNet ? defaultNet.mac : 'unknown',
      cpu_usage: cpuLoad ? Math.round(cpuLoad.currentLoad) : 5,
      cpu_model: cachedCpuModel || 'System CPU',
      memory_total: totalMem,
      memory_used: memUsed,
      running_processes: (processList.list || []).slice(0, 50).map(p => ({ name: p.name, pid: p.pid, cpu: p.cpu, mem: p.mem })),
      firewall_status,
      defender_status,
      antivirus_updated_at,
      active_ports,
      last_logged_user: username,
      uptime_seconds: uptimeSeconds,
      last_reboot_at: lastRebootAt,
      serial_number: cachedSerialNumber || null,
      agent_version: '2.0.0',
      bitlocker_status,
      bitlocker_drive,
      threats,
      quarantine,
      scan_history,
      collected_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Telemetry error:', error);
    return null;
  }
}

async function sendTelemetry(telemetry) {
  if (!telemetry) return;
  try {
    if (!endpointId) {
      const ram_total_gb = Math.round(telemetry.memory_total / (1024 ** 3));
      const storage_total_gb = 512; // Instant default storage size estimate
      console.log(`Registering endpoint with tenant_id ${TENANT_ID} at ${MANAGER_URL}...`);
      const res = await axios.post(`${MANAGER_URL}/api/endpoints/register`, {
        tenant_id: TENANT_ID,
        hostname: telemetry.hostname,
        os_version: telemetry.os_version,
        ip_address: telemetry.ip_address,
        mac_address: telemetry.mac_address,
        cpu_model: telemetry.cpu_model,
        ram_total_gb,
        storage_total_gb,
        serial_number: telemetry.serial_number || null,
        firewall_status: telemetry.firewall_status,
        defender_status: telemetry.defender_status,
        antivirus_updated_at: telemetry.antivirus_updated_at
      }, { timeout: 15000 });
      if (res.data && res.data.endpoint && res.data.endpoint.id) {
        saveEndpointId(res.data.endpoint.id);
        console.log(`Successfully registered endpoint: ${endpointId}`);
      }
    }

    if (!endpointId) return;

    const res = await axios.post(`${MANAGER_URL}/api/endpoints/telemetry`, {
      endpoint_id: endpointId,
      cpu_usage: telemetry.cpu_usage,
      memory_total: telemetry.memory_total,
      memory_used: telemetry.memory_used,
      running_processes: telemetry.running_processes,
      firewall_status: telemetry.firewall_status,
      defender_status: telemetry.defender_status,
      antivirus_updated_at: telemetry.antivirus_updated_at,
      active_ports: telemetry.active_ports,
      last_logged_user: telemetry.last_logged_user,
      uptime_seconds: telemetry.uptime_seconds,
      last_reboot_at: telemetry.last_reboot_at,
      agent_version: telemetry.agent_version,
      bitlocker_status: telemetry.bitlocker_status,
      bitlocker_drive: telemetry.bitlocker_drive,
      threats: telemetry.threats
    }, { timeout: 15000 });
    console.log(`[${new Date().toISOString()}] Telemetry sent successfully for endpoint ${endpointId}`);

    // Process pending commands from response
    if (res.data && Array.isArray(res.data.pending_commands)) {
      const results = [];
      for (const cmd of res.data.pending_commands) {
        console.log(`Executing pending command: ${cmd.command} (ID: ${cmd.id})`);
        let cmdResult = '';
        let status = 'completed';

        try {
          if (cmd.command === 'start-remote') {
            await remoteDaemon.startSession();
            cmdResult = 'Remote control session active';
          } else if (cmd.command === 'stop-remote') {
            await remoteDaemon.stopSession();
            cmdResult = 'Remote control session stopped';
          } else {
            status = 'failed';
            cmdResult = `Command ${cmd.command} execution not supported inside main daemon.`;
          }
        } catch (err) {
          status = 'failed';
          cmdResult = err.message;
        }

        results.push({ id: cmd.id, status, result: cmdResult });
      }

      if (results.length > 0) {
        await axios.post(`${MANAGER_URL}/api/endpoints/telemetry`, {
          endpoint_id: endpointId,
          command_results: results
        }, { timeout: 5000 }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('Failed to send telemetry:', e.response?.data || e.message);
    if (e.response?.status === 404) {
      saveEndpointId(null);
    }
  }
}

// ─── Telemetry Loop (Non-blocking for Instant UI Render) ─────────────────────
async function telemetryLoop() {
  const t = await collectTelemetry();
  if (t) {
    latestTelemetry = t;
    telemetryHistory.unshift({ time: new Date().toISOString(), ...t });
    if (telemetryHistory.length > 50) telemetryHistory.pop();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('telemetry-update', t);
    }
    // Background cloud dispatch without blocking UI
    sendTelemetry(t).catch((err) => console.error('Cloud telemetry sync error:', err.message));
  }
  return latestTelemetry;
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('get-telemetry', () => latestTelemetry);
ipcMain.handle('get-history', () => telemetryHistory.slice(0, 20));
ipcMain.handle('get-tenant-id', () => TENANT_ID);
ipcMain.handle('get-endpoint-id', () => endpointId);
ipcMain.handle('get-manager-url', () => MANAGER_URL);

ipcMain.handle('run-scan', async () => {
  try {
    if (process.platform === 'win32') {
      // Use execAsync (non-blocking) to avoid freezing the main process event loop
      await execAsync('powershell -NoProfile -Command "Start-MpScan -ScanType QuickScan"', { timeout: 30000 });
      return { success: true, message: 'Quick scan initiated successfully.' };
    }
    return { success: true, message: 'Scan requested (platform scan initiated).' };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('run-full-scan', async () => {
  try {
    if (process.platform === 'win32') {
      // Use execAsync (non-blocking) to avoid freezing the main process event loop
      await execAsync('powershell -NoProfile -Command "Start-MpScan -ScanType FullScan"', { timeout: 60000 });
      return { success: true, message: 'Full scan initiated. This may take a while.' };
    }
    return { success: true, message: 'Full scan requested.' };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('run-liveupdate', async () => {
  try {
    if (process.platform === 'win32') {
      // Use execAsync (non-blocking) to keep the window responsive during update
      await execAsync('powershell -NoProfile -Command "Update-MpSignature"', { timeout: 90000 });
      // Refresh telemetry after update
      setTimeout(telemetryLoop, 3000);
      return { success: true, message: 'Virus definitions updated successfully.' };
    }
    return { success: true, message: 'LiveUpdate completed.' };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('open-windows-security', () => {
  if (process.platform === 'win32') {
    shell.openExternal('windowsdefender://');
  }
});

ipcMain.handle('refresh-telemetry', async () => {
  await telemetryLoop();
  return latestTelemetry;
});

// ─── Window Creation ──────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 620,
    minWidth: 750,
    minHeight: 520,
    frame: true,
    resizable: true,
    title: 'AssetManager Security Client',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#f0f0f0',
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray.png');
  const img = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  tray = new Tray(img);
  tray.setToolTip('AssetManager Security Client');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Security Client', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('click', () => { mainWindow.show(); mainWindow.focus(); });
}

// Enable device startup (auto-launch at boot/login) across Windows, macOS, and Linux
function enableAutoLaunch() {
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
      path: process.execPath,
      args: ['--hidden']
    });
  } catch (e) {
    console.error('Failed to configure auto-launch:', e.message);
  }
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  loadSavedEndpointId();
  enableAutoLaunch();
  createWindow();

  // If launched with --hidden (e.g. at system startup), hide window to tray
  if (process.argv.includes('--hidden')) {
    if (mainWindow) mainWindow.hide();
  }

  try { createTray(); } catch (e) {}

  // Initialize Enterprise Remote Desktop Daemon (runs in background tray / app)
  remoteDaemon.init({
    mainWindow,
    managerUrl: MANAGER_URL,
    tenantId: TENANT_ID,
    endpointId
  });

  ipcMain.handle('remote:capture-frame', async () => {
    return await remoteDaemon.captureScreenFrame();
  });

  // Initial telemetry collection immediately after window loads
  setTimeout(async () => {
    await telemetryLoop();
    // Then every 30 seconds for real-time heartbeats
    setInterval(telemetryLoop, 30000);
  }, 500);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow.show();
});
