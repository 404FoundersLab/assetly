const si = require('systeminformation');
const axios = require('axios');
const { execSync } = require('child_process');

const fs = require('fs');
const path = require('path');

const MANAGER_URL = process.env.MANAGER_URL || 'https://assetly-azure.vercel.app/';

// Extract Tenant ID from binary signature (___TENANT_ID___:{uuid}) or fallback to env/default
let TENANT_ID = process.env.TENANT_ID || '11111111-1111-1111-1111-111111111111';
try {
  const exePath = process.execPath;
  if (fs.existsSync(exePath)) {
    // Read the last 256 bytes to look for our injected signature
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
      console.log('Successfully extracted Tenant ID from binary signature.');
    }
  }
} catch (e) {
  console.log('Could not read binary for Tenant ID signature, using fallback.');
}

let endpointId = process.env.ENDPOINT_ID || null;
let command_results = [];

async function collectTelemetry() {
  try {
    const [cpu, mem, osInfo, network, processes, netConns] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.osInfo(),
      si.networkInterfaces(),
      si.processes(),
      si.networkConnections()
    ]);

    let firewall_status = 'Unknown';
    let defender_status = 'Unknown';
    let antivirus_updated_at = 'Unknown';
    let bitlocker_status = 'unknown';
    let bitlocker_drive = null;
    let last_logged_user = require('os').userInfo().username;
    let uptime_seconds = Math.floor(require('os').uptime());
    let last_reboot_at = new Date(Date.now() - uptime_seconds * 1000).toISOString();
    let agent_version = '1.0.0';
    let threats = [];

    if (process.platform === 'win32') {
      try {
        const fw = execSync('netsh advfirewall show allprofiles state', { encoding: 'utf8' });
        firewall_status = fw.includes('ON') ? 'ON' : 'OFF';
      } catch (e) { }

      try {
        const cmd = 'powershell -NoProfile -Command "$mp = Get-MpComputerStatus; $sig = if ($null -ne $mp.AntivirusSignatureLastUpdated) { Get-Date $mp.AntivirusSignatureLastUpdated -Format o } else { $null }; [PSCustomObject]@{ rt = $mp.RealTimeProtectionEnabled; sig = $sig } | ConvertTo-Json -Compress"';
        const mpStatus = execSync(cmd, { encoding: 'utf8' });
        if (mpStatus.trim()) {
          const parsedMp = JSON.parse(mpStatus);
          defender_status = parsedMp.rt ? 'Active' : 'Disabled';
          antivirus_updated_at = parsedMp.sig || 'Unknown';
        }
      } catch (e) { }

      try {
        const bde = execSync('manage-bde -status C:', { encoding: 'utf8' });
        if (bde.includes('Protection On')) {
          bitlocker_status = 'enabled';
        } else if (bde.includes('Protection Off')) {
          bitlocker_status = 'disabled';
        }
        bitlocker_drive = 'C:';
      } catch (e) { }

      try {
        const mpThreats = execSync('powershell -NoProfile -Command "Get-MpThreatDetection | Select-Object ThreatName, InitialDetectionTime, ActionSuccess | ConvertTo-Json"', { encoding: 'utf8' });
        if (mpThreats.trim()) {
          const parsedThreats = JSON.parse(mpThreats);
          const tArray = Array.isArray(parsedThreats) ? parsedThreats : [parsedThreats];
          threats = tArray.map((t) => ({
            threat_type: t.ThreatName,
            severity: 'high',
            description: 'Detected by Windows Defender',
            detected_at: t.InitialDetectionTime || new Date().toISOString(),
            resolved: t.ActionSuccess || false
          }));
        }
      } catch (e) { }
    } else if (process.platform === 'darwin') {
      // macOS Security Telemetry
      try {
        const fw = execSync('defaults read /Library/Preferences/com.apple.alf globalstate', { encoding: 'utf8' }).trim();
        firewall_status = parseInt(fw, 10) > 0 ? 'ON' : 'OFF';
      } catch (e) { firewall_status = 'ON'; }

      try {
        const gatekeeper = execSync('spctl --status', { encoding: 'utf8' });
        defender_status = gatekeeper.includes('assessments enabled') ? 'Active' : 'Disabled';
      } catch (e) { defender_status = 'Active'; }

      try {
        const fv = execSync('fdesetup status', { encoding: 'utf8' });
        bitlocker_status = fv.includes('FileVault is On') ? 'enabled' : 'disabled';
        bitlocker_drive = 'Macintosh HD';
      } catch (e) { }
    } else if (process.platform === 'linux') {
      // Linux Security Telemetry
      try {
        const ufw = execSync('ufw status 2>/dev/null || iptables -L -n 2>/dev/null', { encoding: 'utf8' });
        firewall_status = (ufw.includes('active') || ufw.includes('Chain INPUT')) ? 'ON' : 'OFF';
      } catch (e) { firewall_status = 'ON'; }

      try {
        const selinux = execSync('sestatus 2>/dev/null || aa-status 2>/dev/null', { encoding: 'utf8' });
        defender_status = (selinux.includes('enforcing') || selinux.includes('apparmor module is loaded')) ? 'Active' : 'Disabled';
      } catch (e) { defender_status = 'Active'; }

      try {
        const luks = execSync('lsblk -f 2>/dev/null', { encoding: 'utf8' });
        bitlocker_status = luks.includes('crypto_LUKS') ? 'enabled' : 'disabled';
        bitlocker_drive = '/dev/sda';
      } catch (e) { }
    }

    const active_ports = netConns
      .filter(c => c.state === 'LISTEN' || c.state === 'ESTABLISHED')
      .slice(0, 50)
      .map(c => ({
        protocol: c.protocol,
        local_address: c.localAddress,
        local_port: c.localPort,
        peer_address: c.peerAddress,
        peer_port: c.peerPort,
        state: c.state
      }));

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

    // Try to get the default gateway
    let gatewayIp = null;
    try {
      gatewayIp = await si.networkGatewayDefault();
    } catch (e) {}

    const allIfaces = Array.isArray(network) ? network : [];
    const physicalIfaces = allIfaces.filter(n =>
      n.ip4 &&
      !n.ip4.startsWith('127.') &&
      !n.ip4.startsWith('169.254.') &&
      !isVirtualAdapter(n.iface || n.ifaceName || '')
    );

    // Priority 1: shares subnet with gateway
    let defaultNet = null;
    if (gatewayIp && physicalIfaces.length > 0) {
      const gwPrefix = gatewayIp.split('.').slice(0, 3).join('.');
      defaultNet = physicalIfaces.find(n => n.ip4.startsWith(gwPrefix + '.'));
    }
    // Priority 2: 192.168.x or 10.x physical
    if (!defaultNet) defaultNet = physicalIfaces.find(n => n.ip4.startsWith('192.168.') || n.ip4.startsWith('10.'));
    // Priority 3: any physical
    if (!defaultNet) defaultNet = physicalIfaces[0];
    // Priority 4: any non-loopback fallback
    if (!defaultNet) defaultNet = allIfaces.find(n => n.ip4 && !n.ip4.startsWith('127.') && !n.ip4.startsWith('169.254.')) || allIfaces[0];

    let osVersion = `${osInfo.distro} ${osInfo.release}`;
    if (process.platform === 'win32' && typeof require('os').version === 'function') {
      try { const v = require('os').version(); if (v) osVersion = v; } catch (e) {}
    }

    return {
      hostname: osInfo.hostname,
      os_version: osVersion,
      ip_address: defaultNet ? defaultNet.ip4 : 'unknown',
      mac_address: defaultNet ? defaultNet.mac : 'unknown',
      cpu_usage: cpu.currentLoad,
      memory_total: mem.total,
      memory_used: mem.used,
      running_processes: processes.list.slice(0, 50).map(p => ({
        name: p.name,
        pid: p.pid,
        cpu: p.cpu,
        mem: p.mem
      })),
      firewall_status,
      defender_status,
      antivirus_updated_at,
      active_ports,
      last_logged_user,
      uptime_seconds,
      last_reboot_at,
      agent_version,
      bitlocker_status,
      bitlocker_drive,
      threats
    };
  } catch (error) {
    console.error('Error collecting telemetry:', error);
    return null;
  }
}

async function registerEndpoint(telemetry) {
  try {
    // Collect static hardware info and updates once per registration
    const [cpuInfo, diskInfo] = await Promise.all([
      si.cpu(),
      si.diskLayout()
    ]);

    let windows_updates = [];
    let installed_apps = [];
    try {
      if (process.platform === 'win32') {
        const out = execSync('systeminfo', { encoding: 'utf8' });
        windows_updates = out.split('\n')
          .filter(l => l.includes('[') && l.includes(']: KB'))
          .map(l => l.split(']: ')[1].trim());

        const appsOut64 = execSync('powershell -NoProfile -Command "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion, Publisher, InstallDate | Where-Object { $_.DisplayName } | ConvertTo-Json"', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
        const appsOut32 = execSync('powershell -NoProfile -Command "Get-ItemProperty HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion, Publisher, InstallDate | Where-Object { $_.DisplayName } | ConvertTo-Json"', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
        
        const parseApps = (raw) => {
          if (!raw || !raw.trim()) return [];
          const parsed = JSON.parse(raw);
          return (Array.isArray(parsed) ? parsed : [parsed]).map((a) => ({
            app_name: a.DisplayName,
            version: a.DisplayVersion || null,
            publisher: a.Publisher || null,
            install_date: a.InstallDate ? `${a.InstallDate.substring(0, 4)}-${a.InstallDate.substring(4, 6)}-${a.InstallDate.substring(6, 8)}` : null,
            cve_count: 0,
            cve_ids: []
          }));
        };
        
        const apps64 = parseApps(appsOut64);
        const apps32 = parseApps(appsOut32);
        
        const seen = new Set();
        installed_apps = [...apps64, ...apps32].filter(a => {
          if (!a.app_name || seen.has(a.app_name.toLowerCase())) return false;
          seen.add(a.app_name.toLowerCase());
          return true;
        });
      } else if (process.platform === 'darwin') {
        try {
          const appsDir = fs.readdirSync('/Applications');
          installed_apps = appsDir.filter(f => f.endsWith('.app')).map(f => ({
            app_name: f.replace(/\.app$/, ''),
            version: null,
            publisher: 'Apple / macOS Application',
            install_date: null,
            cve_count: 0,
            cve_ids: []
          }));
        } catch (e) {}
      } else if (process.platform === 'linux') {
        try {
          const pkgs = execSync("dpkg-query -W -f='${Package}\t${Version}\n' 2>/dev/null || rpm -qa --queryformat '%{NAME}\t%{VERSION}\n' 2>/dev/null", { encoding: 'utf8' });
          installed_apps = pkgs.split('\n').filter(Boolean).slice(0, 100).map(line => {
            const [name, ver] = line.split('\t');
            return {
              app_name: name,
              version: ver || null,
              publisher: 'Linux Package Manager',
              install_date: null,
              cve_count: 0,
              cve_ids: []
            };
          });
        } catch (e) {}
      }
    } catch (e) {
      console.log('Could not fetch updates or apps:', e.message);
    }

    const ram_total_gb = Math.round(telemetry.memory_total / (1024 * 1024 * 1024));
    const storage_total_gb = Math.round(diskInfo.reduce((acc, disk) => acc + (disk.size || 0), 0) / (1024 * 1024 * 1024));

    // Collect device serial number (cross-platform, one-time)
    let serial_number = null;
    try {
      if (process.platform === 'win32') {
        const raw = execSync('powershell -NoProfile -Command "(Get-WmiObject Win32_BIOS).SerialNumber"', { encoding: 'utf8', timeout: 5000 }).trim();
        if (raw && raw !== 'To Be Filled By O.E.M.' && raw !== 'Default string') serial_number = raw;
      } else if (process.platform === 'darwin') {
        serial_number = execSync("system_profiler SPHardwareDataType | awk '/Serial Number/{print $NF}'", { encoding: 'utf8', timeout: 5000 }).trim() || null;
      } else {
        const raw = execSync('cat /sys/class/dmi/id/product_serial 2>/dev/null', { encoding: 'utf8', timeout: 5000 }).trim();
        if (raw && raw !== 'Not Specified') serial_number = raw;
      }
    } catch (e) { /* serial number not available on this device */ }

    const response = await axios.post(`${MANAGER_URL}/api/endpoints/register`, {
      tenant_id: TENANT_ID,
      hostname: telemetry.hostname,
      os_version: telemetry.os_version,
      ip_address: telemetry.ip_address,
      mac_address: telemetry.mac_address,
      cpu_model: `${cpuInfo.manufacturer} ${cpuInfo.brand}`.trim(),
      ram_total_gb,
      storage_total_gb,
      serial_number,
      windows_updates,
      installed_apps,
      firewall_status: telemetry.firewall_status,
      defender_status: telemetry.defender_status,
      antivirus_updated_at: telemetry.antivirus_updated_at
    });

    endpointId = response.data.endpoint.id;
    console.log(`Registered as endpoint: ${endpointId}`);
  } catch (error) {
    console.error('Failed to register:', error.message);
  }
}

async function sendTelemetry() {
  const telemetry = await collectTelemetry();
  if (!telemetry) return;

  if (!endpointId) {
    await registerEndpoint(telemetry);
    if (!endpointId) return; // Still failed
  }

  const currentResults = [...command_results];
  command_results = [];

  try {
    const response = await axios.post(`${MANAGER_URL}/api/endpoints/telemetry`, {
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
      threats: telemetry.threats,
      command_results: currentResults
    });
    console.log(`[${new Date().toISOString()}] Telemetry sent successfully.`);

    if (response.data && Array.isArray(response.data.pending_commands)) {
      for (const cmd of response.data.pending_commands) {
        console.log(`[!] Executing received command: ${cmd.command}`);
        let status = 'completed';
        let result = '';
        try {
          if (cmd.command === 'force-scan') {
            result = execSync('powershell -NoProfile -Command "Start-MpScan -ScanType QuickScan"', { encoding: 'utf8' });
          } else if (cmd.command === 'isolate') {
            result = execSync('netsh advfirewall firewall add rule name="Assetly_Isolate_Demo" dir=out action=block remoteport=9999 protocol=TCP', { encoding: 'utf8' });
            console.log('Safe Demo Isolation applied (blocked port 9999)');
          } else if (cmd.command === 'sync') {
            await registerEndpoint(telemetry);
            result = 'Sync completed successfully';
          } else {
            throw new Error(`Unknown command: ${cmd.command}`);
          }
        } catch (e) {
          status = 'failed';
          result = e.message || String(e);
          console.error(`Command ${cmd.command} failed:`, result);
        }
        command_results.push({ id: cmd.id, status, result: String(result).substring(0, 1000) });
      }
    }
  } catch (error) {
    console.error('Failed to send telemetry:', error.message);
    // restore results so we don't drop them
    command_results = [...currentResults, ...command_results];
    if (error.response && error.response.status === 404) {
      // Endpoint might have been deleted, re-register
      endpointId = null;
    }
  }
}

// Self-Installation Logic for Windows
const TARGET_FOLDER = 'C:\\Program Files\\AssetManagerAgent';
const TARGET_PATH = path.join(TARGET_FOLDER, 'AssetManager_Agent.exe');

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--uninstall')) {
    console.log('--- AssetManager Agent Uninstaller ---');
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (query) => new Promise((resolve) => readline.question(query, resolve));

    try {
      const email = await askQuestion('Enter IT Admin Email: ');
      // Hide password input using standard terminal masking if possible, or simple read
      const password = await askQuestion('Enter IT Admin Password: ');
      readline.close();

      console.log('Verifying credentials...');
      const response = await axios.post(`${MANAGER_URL}/api/auth/login`, { email, password });
      
      const { user } = response.data;
      const isAdmin = user.role === 'tenant_admin' || user.role === 'it_admin' || user.role === 'platform_admin';
      const isCorrectTenant = user.tenantId === TENANT_ID || user.role === 'platform_admin';

      if (isAdmin && isCorrectTenant) {
        console.log('Credentials verified. Uninstalling...');
        try {
          execSync('schtasks /delete /tn "AssetManagerAgent" /f', { stdio: 'ignore' });
        } catch(e) {}
        
        console.log('----------------------------------------------------');
        console.log('AssetManager Agent successfully uninstalled.');
        console.log('The scheduled background task has been removed.');
        console.log('You can now safely delete the executable file.');
        console.log('----------------------------------------------------');
        await new Promise(resolve => setTimeout(resolve, 5000));
        process.exit(0);
      } else {
        console.error('Error: Unauthorized. You must be an IT Admin for this tenant to uninstall this agent.');
        await new Promise(resolve => setTimeout(resolve, 5000));
        process.exit(1);
      }
    } catch (err) {
      readline.close();
      console.error('Authentication failed:', err.response?.data?.error || err.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
      process.exit(1);
    }
  }

  if (process.platform === 'win32') {
    const currentExe = process.execPath;
    
    // If not running from the installed path, perform installation
    if (currentExe.toLowerCase() !== TARGET_PATH.toLowerCase()) {
      console.log('Running installer...');
      try {
        // Create folder
        if (!fs.existsSync(TARGET_FOLDER)) {
          fs.mkdirSync(TARGET_FOLDER, { recursive: true });
        }
        
        // Stop existing scheduled task & terminate old running binary if locked
        try {
          execSync('schtasks /end /tn "AssetManagerAgent"', { stdio: 'ignore' });
        } catch (e) {}
        try {
          execSync(`taskkill /f /fi "PID ne ${process.pid}" /im "AssetManager_Agent.exe"`, { stdio: 'ignore' });
        } catch (e) {}

        // Copy binary
        console.log(`Copying agent to ${TARGET_PATH}...`);
        fs.copyFileSync(currentExe, TARGET_PATH);
        
        // Register in Task Scheduler to run on boot as SYSTEM
        console.log('Creating Windows Scheduled Task...');
        const createCmd = `schtasks /create /tn "AssetManagerAgent" /tr "\\"${TARGET_PATH}\\" --run" /sc onstart /ru SYSTEM /f`;
        execSync(createCmd, { stdio: 'inherit' });
        
        // Start the task immediately
        console.log('Starting Agent Service...');
        execSync('schtasks /run /tn "AssetManagerAgent"', { stdio: 'inherit' });
        
        console.log('----------------------------------------------------');
        console.log('AssetManager Agent installed successfully!');
        console.log('It is now running continuously in the background.');
        console.log('----------------------------------------------------');
        
        // Wait 5 seconds so the user can read the success message if run via terminal
        await new Promise(resolve => setTimeout(resolve, 5000));
        process.exit(0);
      } catch (err) {
        console.error('Installation failed:', err.message);
        console.log('\n[!] Please make sure to run this file as an ADMINISTRATOR.');
        await new Promise(resolve => setTimeout(resolve, 10000));
        process.exit(1);
      }
    }
  }

  console.log('Starting Endpoint Security Client...');
  sendTelemetry();
  setInterval(sendTelemetry, 60000); // Every minute
}

main();


