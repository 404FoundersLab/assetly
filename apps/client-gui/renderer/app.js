// ─── State ────────────────────────────────────────────────────────────────────
let currentView = 'status';
let telemetry = null;
let scanState = { active: false, type: null, progress: 0, timer: null };

// ─── DOM Ready ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar navigation — event delegation
  document.getElementById('sidebar').addEventListener('click', (e) => {
    const item = e.target.closest('[data-view]');
    if (item) navigate(item.dataset.view);
  });

  // Help button
  document.getElementById('btn-help').addEventListener('click', showHelp);

  // Boot the app
  boot();
});

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigate(view) {
  currentView = view;

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById(`nav-${view}`);
  if (navEl) navEl.classList.add('active');

  // Update title bar
  const titles = {
    status: 'Status - AssetManager Security Client',
    scan: 'Scan for Threats - AssetManager Security Client',
    settings: 'Change Settings - AssetManager Security Client',
    quarantine: 'View Quarantine - AssetManager Security Client',
    logs: 'View Logs - AssetManager Security Client',
    liveupdate: 'LiveUpdate - AssetManager Security Client',
  };
  const titleEl = document.getElementById('title-bar-text');
  if (titleEl) titleEl.textContent = titles[view] || 'AssetManager Security Client';

  render();
}

// ─── Toast Notifications ──────────────────────────────────────────────────────
function showToast(message, type = 'info', durationMs = 4000) {
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${escHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, durationMs);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtBytes(bytes) {
  if (!bytes) return '—';
  const gb = bytes / (1024 ** 3);
  return gb >= 1 ? `${Math.round(gb)}.0 GB` : `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
}

function fmtUptime(secs) {
  if (!secs) return '—';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const s = dateStr.replace(' ', 'T');
    const utc = s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
    const d = new Date(utc);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

function fmtDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const s = dateStr.replace(' ', 'T');
    const utc = s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
    const d = new Date(utc);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString();
  } catch { return dateStr; }
}

function isAvOutdated(dateStr) {
  if (!dateStr) return true;
  try {
    const s = dateStr.replace(' ', 'T');
    const utc = s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
    const d = new Date(utc);
    return (Date.now() - d.getTime()) >= 3 * 24 * 60 * 60 * 1000;
  } catch { return true; }
}

function getOverallStatus(t) {
  if (!t) return { issues: [], level: 'loading' };
  const issues = [];
  if (t.firewall_status !== 'ON') issues.push('Firewall is OFF');
  if (t.defender_status !== 'Active') issues.push('Real-Time Protection disabled');
  if (isAvOutdated(t.antivirus_updated_at)) issues.push('Virus definitions are outdated');
  if (t.threats && t.threats.some(th => !th.resolved)) issues.push(`${t.threats.filter(th => !th.resolved).length} active threat(s)`);
  return { issues, level: issues.length === 0 ? 'ok' : issues.length <= 1 ? 'warn' : 'bad' };
}

function getPlatformLabel(platform) {
  if (platform === 'darwin') return 'macOS';
  if (platform === 'linux') return 'Linux';
  return 'Windows';
}

function getEncryptionLabel(platform) {
  if (platform === 'darwin') return 'FileVault';
  if (platform === 'linux') return 'LUKS Encryption';
  return 'BitLocker Drive Encryption';
}

// ─── Main Render ──────────────────────────────────────────────────────────────
function render() {
  const main = document.getElementById('main-content');

  if (!telemetry && currentView === 'status') {
    main.innerHTML = `
      <div class="loading-overlay">
        <div class="spinner"></div>
        <div>Collecting security information…</div>
      </div>`;
    return;
  }

  switch (currentView) {
    case 'status':     main.innerHTML = renderStatus(); attachStatusEvents(); break;
    case 'scan':       main.innerHTML = renderScan(); attachScanEvents(); break;
    case 'settings':   renderSettingsAsync(main); return;
    case 'quarantine': main.innerHTML = renderQuarantine(); attachQuarantineEvents(); break;
    case 'logs':       main.innerHTML = renderLogs(); break;
    case 'liveupdate': main.innerHTML = renderLiveUpdate(); attachLiveUpdateEvents(); break;
    default:           main.innerHTML = renderStatus(); attachStatusEvents();
  }
}

// ─── STATUS VIEW ─────────────────────────────────────────────────────────────
function renderStatus() {
  const t = telemetry;
  const { issues, level } = getOverallStatus(t);
  const platform = t ? (t.os_platform || 'win32') : 'win32';
  const outdated = isAvOutdated(t ? t.antivirus_updated_at : null);
  const encLabel = getEncryptionLabel(platform);

  const bannerClass = level === 'ok' ? '' : level === 'warn' ? 'at-risk' : 'critical';
  const bannerIcon = level === 'ok' ? '✓' : level === 'warn' ? '⚠' : '✕';
  const bannerTitle = level === 'ok'
    ? 'Your computer is protected.'
    : level === 'warn' ? 'Your computer may be at risk.' : 'Your computer is at risk!';
  const bannerSubtitle = level === 'ok'
    ? 'No problems detected.'
    : issues[0] || 'Security issues detected.';
  const defLink = level === 'ok'
    ? 'Protection definitions are current'
    : `${issues.length} issue${issues.length > 1 ? 's' : ''} require${issues.length === 1 ? 's' : ''} attention`;

  const avBadge = t && t.defender_status === 'Active'
    ? `<span class="component-status-badge badge-ok">✓ Active</span>`
    : `<span class="component-status-badge badge-bad">✕ Disabled</span>`;
  const avCardClass = t && t.defender_status === 'Active' && !outdated ? '' : outdated ? 'warning' : 'danger';

  const fwBadge = t && t.firewall_status === 'ON'
    ? `<span class="component-status-badge badge-ok">✓ Enabled</span>`
    : `<span class="component-status-badge badge-bad">✕ Disabled</span>`;
  const fwCardClass = t && t.firewall_status === 'ON' ? '' : 'danger';

  const encOk = t && t.bitlocker_status === 'enabled';
  const encBadge = encOk
    ? `<span class="component-status-badge badge-ok">✓ Encrypted</span>`
    : `<span class="component-status-badge badge-warn">⚠ Not Encrypted</span>`;
  const encCardClass = encOk ? '' : 'warning';

  const rtpBadge = t && t.defender_status === 'Active'
    ? `<span class="component-status-badge badge-ok">✓ Running</span>`
    : `<span class="component-status-badge badge-bad">✕ Stopped</span>`;
  const rtpCardClass = t && t.defender_status === 'Active' ? '' : 'danger';

  return `
    <div class="status-banner ${bannerClass}">
      <div class="status-icon">${bannerIcon}</div>
      <div class="status-text">
        <h2>${escHtml(bannerTitle)}</h2>
        <p>${escHtml(bannerSubtitle)}</p>
        <span class="status-link">${escHtml(defLink)}</span>
      </div>
    </div>

    <div class="components-section">
      <div class="components-header">
        The following AssetManager security components are installed on your computer:
      </div>

      <div class="component-card ${avCardClass}">
        <div class="component-icon">🛡️</div>
        <div class="component-info">
          <div class="component-name">Virus and Spyware Protection ${avBadge}</div>
          <div class="component-desc">Protects against viruses, malware, and spyware</div>
          <div class="component-meta">Definitions: &nbsp;<span>${outdated ? '⚠ Outdated' : fmtDate(t ? t.antivirus_updated_at : null)}</span></div>
        </div>
        <button class="options-btn" data-options="antivirus">Options</button>
      </div>

      <div class="component-card ${rtpCardClass}">
        <div class="component-icon">🔍</div>
        <div class="component-info">
          <div class="component-name">Proactive Threat Protection ${rtpBadge}</div>
          <div class="component-desc">Provides advanced behavioral protection against unknown threats</div>
          <div class="component-meta">Engine: &nbsp;<span>${escHtml(getPlatformLabel(platform))} Security Engine v${escHtml(t ? t.agent_version || '2.0.0' : '2.0.0')}</span></div>
        </div>
        <button class="options-btn" data-options="rtp">Options</button>
      </div>

      <div class="component-card ${fwCardClass}">
        <div class="component-icon">🔥</div>
        <div class="component-info">
          <div class="component-name">Network and Host Exploit Mitigation ${fwBadge}</div>
          <div class="component-desc">Protects against Web, network threats, and zero-day exploits</div>
          <div class="component-meta">
            Firewall: &nbsp;<span>${escHtml(t ? t.firewall_status || 'Unknown' : 'Unknown')}</span>
            &nbsp;·&nbsp; Active Connections: &nbsp;<span>${t ? (t.active_ports || []).length : 0}</span>
          </div>
        </div>
        <button class="options-btn" data-options="firewall">Options</button>
      </div>

      <div class="component-card ${encCardClass}">
        <div class="component-icon">🔒</div>
        <div class="component-info">
          <div class="component-name">${escHtml(encLabel)} ${encBadge}</div>
          <div class="component-desc">Encrypts your drive to protect data from unauthorized access</div>
          <div class="component-meta">
            Drive: &nbsp;<span>${escHtml(t ? t.bitlocker_drive || 'System Drive' : 'System Drive')}</span>
            &nbsp;·&nbsp; Status: &nbsp;<span>${encOk ? 'Protection On' : 'Protection Off'}</span>
          </div>
        </div>
        <button class="options-btn" data-options="encryption">Options</button>
      </div>
    </div>
  `;
}

function attachStatusEvents() {
  document.querySelectorAll('[data-options]').forEach(btn => {
    btn.addEventListener('click', () => openOptions(btn.dataset.options));
  });
}

// ─── SCAN VIEW ────────────────────────────────────────────────────────────────
function renderScan() {
  const scanRunning = scanState.active;
  const progress = scanState.progress || 0;

  return `
    <div class="view-panel">
      <div class="view-title">🔍 Scan for Threats</div>
      <div class="view-subtitle">Run an on-demand scan to detect malware, viruses, and suspicious activity.</div>

      ${scanRunning ? `
        <div style="background:#fff;border:1px solid #ddd;border-radius:4px;padding:16px;max-width:440px;margin-bottom:16px;">
          <div style="font-weight:700;margin-bottom:8px;color:#1a3a5c;">
            ${escHtml(scanState.type === 'full' ? '⏳ Full Scan in Progress…' : '⏳ Quick Scan in Progress…')}
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" id="scan-progress-fill" style="width:${progress}%;"></div>
          </div>
          <div style="font-size:11px;color:#888;margin-top:4px;" id="scan-progress-label">Scanning system files and memory… ${progress}% complete</div>
          <div style="margin-top:10px;">
            <button class="action-btn warn-btn" id="btn-cancel-scan">⏹ Stop Scan</button>
          </div>
        </div>
      ` : `
        <div class="scan-options">
          <div class="scan-option-card" id="scan-quick">
            <div class="scan-icon">⚡</div>
            <div class="scan-info">
              <h3>Quick Scan</h3>
              <p>Scans the most likely locations for malware. Typically takes 5–15 minutes.</p>
            </div>
          </div>
          <div class="scan-option-card" id="scan-full">
            <div class="scan-icon">🔎</div>
            <div class="scan-info">
              <h3>Full Scan</h3>
              <p>Comprehensive scan of all files. May take 30+ minutes.</p>
            </div>
          </div>
          <div class="scan-option-card" id="scan-custom">
            <div class="scan-icon">📁</div>
            <div class="scan-info">
              <h3>Custom Scan</h3>
              <p>Select specific folders or drives to scan.</p>
            </div>
          </div>
        </div>
      `}

      ${telemetry && telemetry.threats && telemetry.threats.length > 0 ? `
        <div style="margin-top:16px;">
          <div style="font-weight:700;font-size:13px;color:#1a3a5c;margin-bottom:8px;">⚠️ Previously Detected Threats</div>
          <table class="log-table">
            <thead><tr><th>Threat Name</th><th>Detected</th><th>Action</th><th>Status</th></tr></thead>
            <tbody>
              ${telemetry.threats.slice(0, 10).map(t => `
                <tr>
                  <td>${escHtml(t.name || t.threat_type || 'Unknown Threat')}</td>
                  <td style="white-space:nowrap;font-size:11px;color:#888;">${fmtDateTime(t.detected_at)}</td>
                  <td>${escHtml(t.action || 'Quarantined')}</td>
                  <td><span class="pill ${t.resolved ? 'pill-ok' : 'pill-bad'}">${t.resolved ? 'Resolved' : 'Active'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div style="margin-top:16px;color:#888;font-size:12px;">✅ No threats detected in last scan.</div>
      `}
    </div>
  `;
}

function attachScanEvents() {
  const quickBtn = document.getElementById('scan-quick');
  const fullBtn = document.getElementById('scan-full');
  const customBtn = document.getElementById('scan-custom');
  const cancelBtn = document.getElementById('btn-cancel-scan');

  if (quickBtn) quickBtn.addEventListener('click', () => startScan('quick'));
  if (fullBtn) fullBtn.addEventListener('click', () => startScan('full'));
  if (customBtn) customBtn.addEventListener('click', () => startScan('custom'));
  if (cancelBtn) cancelBtn.addEventListener('click', cancelScan);
}

// ─── QUARANTINE VIEW ──────────────────────────────────────────────────────────
function renderQuarantine() {
  const items = (telemetry && telemetry.quarantine) ? telemetry.quarantine : [];

  if (items.length === 0) {
    return `
      <div class="view-panel">
        <div class="view-title">🗂️ Quarantine</div>
        <div class="view-subtitle">Items that have been isolated to prevent harm to your computer.</div>
        <div class="quarantine-empty">
          <div class="big-icon">🛡️</div>
          <div style="font-weight:700;font-size:14px;color:#1a3a5c;">Quarantine is Empty</div>
          <div style="font-size:12px;">No threats have been quarantined on this computer.</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="view-panel">
      <div class="view-title">🗂️ Quarantine</div>
      <div class="view-subtitle">Items isolated to prevent harm — ${items.length} item${items.length > 1 ? 's' : ''} in quarantine.</div>
      <table class="log-table">
        <thead><tr><th>Threat Name</th><th>Severity</th><th>Detected</th><th>Action</th></tr></thead>
        <tbody>
          ${items.map((t, i) => `
            <tr>
              <td>${escHtml(t.name || t.threat_type || 'Unknown')}</td>
              <td><span class="pill pill-bad">${escHtml(t.severity || 'high')}</span></td>
              <td style="font-size:11px;color:#888;white-space:nowrap;">${fmtDateTime(t.detected_at)}</td>
              <td>
                <button class="options-btn" data-q-action="delete" data-q-idx="${i}">Delete</button>
                &nbsp;
                <button class="options-btn" data-q-action="restore" data-q-idx="${i}">Restore</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function attachQuarantineEvents() {
  document.querySelectorAll('[data-q-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.qAction;
      if (action === 'delete') showToast('Threat removed from quarantine.', 'success');
      if (action === 'restore') showToast('Threat restored. Use caution!', 'error');
    });
  });
}

// ─── LOGS VIEW ────────────────────────────────────────────────────────────────
function renderLogs() {
  const t = telemetry;
  const scanEvents = (t && t.scan_history) ? t.scan_history : [];

  const systemEvents = t ? [
    { time: t.collected_at, type: 'info', message: `Telemetry collected from ${t.hostname}` },
    { time: t.last_reboot_at, type: 'info', message: 'System last rebooted' },
    { time: t.antivirus_updated_at, type: 'ok', message: 'Virus definitions updated' },
  ].filter(e => e.time) : [];

  const allEvents = [
    ...scanEvents.map(e => ({ time: e.time, type: 'info', message: e.message })),
    ...systemEvents
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 30);

  return `
    <div class="view-panel">
      <div class="view-title">📋 View Logs</div>
      <div class="view-subtitle">Security event log — recent activity on this endpoint.</div>

      ${t ? `
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-value">${(t.running_processes || []).length}</div>
            <div class="stat-label">Running Processes</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${(t.active_ports || []).length}</div>
            <div class="stat-label">Open Connections</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${(t.threats || []).filter(x => !x.resolved).length}</div>
            <div class="stat-label">Active Threats</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Math.round(t.cpu_usage || 0)}%</div>
            <div class="stat-label">CPU Usage</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${fmtUptime(t.uptime_seconds)}</div>
            <div class="stat-label">Uptime</div>
          </div>
        </div>
      ` : ''}

      ${allEvents.length > 0 ? `
        <div style="margin-bottom:14px;">
          <div style="font-weight:700;font-size:13px;color:#1a3a5c;margin-bottom:8px;">Recent Events</div>
          <table class="log-table">
            <thead><tr><th>Time</th><th>Event</th><th>Type</th></tr></thead>
            <tbody>
              ${allEvents.map(e => `
                <tr>
                  <td style="white-space:nowrap;font-size:11px;color:#888;">${fmtDateTime(e.time)}</td>
                  <td style="font-size:12px;">${escHtml(e.message)}</td>
                  <td><span class="pill ${e.type === 'ok' ? 'pill-ok' : e.type === 'warn' ? 'pill-warn' : e.type === 'bad' ? 'pill-bad' : 'pill-info'}">${escHtml(e.type)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="quarantine-empty"><div class="big-icon">📋</div><div>No log entries yet.</div></div>`}

      ${t && (t.running_processes || []).length > 0 ? `
        <div>
          <div style="font-weight:700;font-size:13px;color:#1a3a5c;margin-bottom:8px;">🖥️ Running Processes (Top 15)</div>
          <table class="log-table">
            <thead><tr><th>Process</th><th>PID</th><th>CPU %</th><th>MEM %</th></tr></thead>
            <tbody>
              ${t.running_processes.slice(0, 15).map(p => `
                <tr>
                  <td>${escHtml(p.name)}</td>
                  <td style="font-family:monospace;font-size:11px;color:#888;">${p.pid}</td>
                  <td>${(p.cpu || 0).toFixed(1)}%</td>
                  <td>${(p.mem || 0).toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;
}

// ─── LIVE UPDATE VIEW ─────────────────────────────────────────────────────────
function renderLiveUpdate() {
  const t = telemetry;
  const outdated = isAvOutdated(t && t.antivirus_updated_at);
  const lastUpdate = t ? fmtDate(t.antivirus_updated_at) : '—';
  const platform = t ? getPlatformLabel(t.os_platform) : 'Windows';

  return `
    <div class="view-panel">
      <div class="view-title">🔄 LiveUpdate</div>
      <div class="view-subtitle">Check for and install the latest virus definitions and security updates.</div>

      <div class="settings-group" style="max-width:480px;">
        <div class="settings-group-header">Definition Status</div>
        <div class="settings-row">
          <div class="settings-label">Current Status</div>
          <div>${outdated ? `<span class="pill pill-warn">⚠ Outdated</span>` : `<span class="pill pill-ok">✓ Up to Date</span>`}</div>
        </div>
        <div class="settings-row">
          <div class="settings-label">Last Updated</div>
          <div class="settings-value">${escHtml(lastUpdate)}</div>
        </div>
        <div class="settings-row">
          <div class="settings-label">Platform</div>
          <div class="settings-value">${escHtml(platform)} Security Engine</div>
        </div>
        <div class="settings-row">
          <div class="settings-label">Agent Version</div>
          <div class="settings-value">${escHtml(t ? t.agent_version : '2.0.0')}</div>
        </div>
      </div>

      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="action-btn success-btn" id="btn-liveupdate">🔄 Run LiveUpdate Now</button>
        <button class="action-btn" id="btn-back-status">← Back to Status</button>
      </div>

      <div style="margin-top:16px;font-size:11.5px;color:#888;max-width:480px;line-height:1.6;">
        <strong>About LiveUpdate:</strong> LiveUpdate downloads the latest virus definitions
        and security content updates directly from ${escHtml(platform)} security services.
        Keeping definitions current ensures your computer is protected against the latest threats.
      </div>
    </div>
  `;
}

function attachLiveUpdateEvents() {
  const luBtn = document.getElementById('btn-liveupdate');
  const backBtn = document.getElementById('btn-back-status');
  if (luBtn) luBtn.addEventListener('click', runLiveUpdate);
  if (backBtn) backBtn.addEventListener('click', () => navigate('status'));
}

// Cache static settings info
let cachedSettingsInfo = null;

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────
async function renderSettingsAsync(main) {
  if (!cachedSettingsInfo || !cachedSettingsInfo.endpointId || cachedSettingsInfo.endpointId === 'Not registered yet') {
    main.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><div>Loading settings…</div></div>`;
    const [tenantId, endpointId, managerUrl] = await Promise.all([
      window.securityAPI.getTenantId(),
      window.securityAPI.getEndpointId(),
      window.securityAPI.getManagerUrl()
    ]);
    cachedSettingsInfo = { tenantId, endpointId, managerUrl };
  }

  const { tenantId, endpointId, managerUrl } = cachedSettingsInfo;
  const t = telemetry;

  main.innerHTML = `
    <div class="view-panel">
      <div class="view-title">⚙️ Change Settings</div>
      <div class="view-subtitle">Agent configuration and security component settings.</div>

      <div class="settings-group" style="max-width:520px;">
        <div class="settings-group-header">Agent Configuration</div>
        <div class="settings-row"><div class="settings-label">Manager URL</div><div class="settings-value">${escHtml(managerUrl || '—')}</div></div>
        <div class="settings-row"><div class="settings-label">Tenant ID</div><div class="settings-value">${escHtml(tenantId || '—')}</div></div>
        <div class="settings-row"><div class="settings-label">Endpoint ID</div><div class="settings-value">${escHtml(endpointId || 'Not registered yet')}</div></div>
        <div class="settings-row"><div class="settings-label">Agent Version</div><div class="settings-value">${escHtml(t ? t.agent_version : '2.0.0')}</div></div>
        <div class="settings-row"><div class="settings-label">Telemetry Interval</div><div class="settings-value">Every 60 seconds</div></div>
      </div>

      ${t ? `
        <div class="settings-group" style="max-width:520px;">
          <div class="settings-group-header">Device Information</div>
          ${[
            ['Hostname', t.hostname],
            ['Serial Number', t.serial_number || '—'],
            ['Operating System', t.os_version],
            ['IP Address', t.ip_address],
            ['MAC Address', t.mac_address],
            ['CPU', t.cpu_model || '—'],
            ['RAM Total', fmtBytes(t.memory_total)],
            ['Logged-in User', t.last_logged_user || '—'],
            ['System Uptime', fmtUptime(t.uptime_seconds)],
            ['Last Reboot', fmtDateTime(t.last_reboot_at)],
          ].map(([label, value]) => `
            <div class="settings-row">
              <div class="settings-label">${escHtml(label)}</div>
              <div class="settings-value">${escHtml(String(value || '—'))}</div>
            </div>
          `).join('')}
        </div>

        <div class="settings-group" style="max-width:520px;">
          <div class="settings-group-header">Security Controls</div>
          ${[
            ['Windows Firewall', t.firewall_status || 'Unknown', t.firewall_status === 'ON'],
            ['Real-Time Protection', t.defender_status || 'Unknown', t.defender_status === 'Active'],
            ['Drive Encryption', t.bitlocker_status === 'enabled' ? 'Enabled' : 'Disabled', t.bitlocker_status === 'enabled'],
          ].map(([label, value, ok]) => `
            <div class="settings-row">
              <div class="settings-label">${escHtml(label)}</div>
              <div><span class="pill ${ok ? 'pill-ok' : 'pill-bad'}">${ok ? '✓' : '✕'} ${escHtml(value)}</span></div>
            </div>
          `).join('')}
        </div>

        ${t.active_ports && t.active_ports.length > 0 ? `
          <div class="settings-group" style="max-width:520px;">
            <div class="settings-group-header">Active Network Connections (Top 10)</div>
            <table class="log-table">
              <thead><tr><th>Protocol</th><th>Local Port</th><th>Peer</th><th>State</th></tr></thead>
              <tbody>
                ${t.active_ports.slice(0, 10).map(p => `
                  <tr>
                    <td style="font-family:monospace;font-size:11px;">${escHtml(p.protocol || '—')}</td>
                    <td style="font-family:monospace;font-size:11px;font-weight:700;">${escHtml(String(p.local_port || '—'))}</td>
                    <td style="font-family:monospace;font-size:11px;color:#888;">${escHtml(p.peer_address || '—')}</td>
                    <td><span class="pill ${p.state === 'ESTABLISHED' ? 'pill-info' : 'pill-ok'}" style="font-size:10px;">${escHtml(p.state || '—')}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      ` : ''}

      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="action-btn" id="btn-refresh-settings">🔃 Refresh Data</button>
        <button class="action-btn warn-btn" id="btn-open-security">🔓 Open System Security</button>
      </div>
    </div>
  `;

  // Attach events after render
  const refreshBtn = document.getElementById('btn-refresh-settings');
  const secBtn = document.getElementById('btn-open-security');
  if (refreshBtn) refreshBtn.addEventListener('click', refreshNow);
  if (secBtn) secBtn.addEventListener('click', openWindowsSecurity);
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function startScan(type) {
  if (scanState.active) return;
  scanState = { active: true, type, progress: 0, timer: null };
  render();

  try {
    let p = 0;
    scanState.timer = setInterval(() => {
      p = Math.min(p + Math.random() * 6 + 2, 90);
      scanState.progress = Math.round(p);
      const fill = document.getElementById('scan-progress-fill');
      const label = document.getElementById('scan-progress-label');
      if (fill) fill.style.width = `${scanState.progress}%`;
      if (label) label.textContent = `Scanning system files and memory… ${scanState.progress}% complete`;
    }, 700);

    let result;
    if (type === 'full') result = await window.securityAPI.runFullScan();
    else if (type === 'quick') result = await window.securityAPI.runScan();
    else result = { success: true, message: 'Custom scan initiated.' };

    clearInterval(scanState.timer);
    scanState.progress = 100;
    const fill = document.getElementById('scan-progress-fill');
    if (fill) fill.style.width = '100%';

    setTimeout(() => {
      scanState = { active: false, type: null, progress: 0, timer: null };
      showToast(result.message || 'Scan complete!', result.success ? 'success' : 'error');
      render();
    }, 800);
  } catch (e) {
    if (scanState.timer) clearInterval(scanState.timer);
    scanState = { active: false, type: null, progress: 0, timer: null };
    showToast('Scan error: ' + e.message, 'error');
    render();
  }
}

function cancelScan() {
  if (scanState.timer) clearInterval(scanState.timer);
  scanState = { active: false, type: null, progress: 0, timer: null };
  showToast('Scan cancelled.', 'info');
  render();
}

async function runLiveUpdate() {
  const btn = document.getElementById('btn-liveupdate');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Updating…'; }
  showToast('Checking for definition updates…', 'info');
  try {
    const result = await window.securityAPI.runLiveUpdate();
    showToast(result.message || 'LiveUpdate complete!', result.success ? 'success' : 'error');
    if (result.success) await refreshNow();
  } catch (e) {
    showToast('LiveUpdate failed: ' + e.message, 'error');
  }
  if (btn) { btn.disabled = false; btn.textContent = '🔄 Run LiveUpdate Now'; }
}

async function refreshNow() {
  showToast('Refreshing security data…', 'info');
  try {
    const fresh = await window.securityAPI.refreshTelemetry();
    if (fresh) {
      telemetry = fresh;
      render();
      showToast('Security data refreshed.', 'success');
    }
  } catch (e) {
    showToast('Refresh failed: ' + e.message, 'error');
  }
}

function closeModal() {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();
}

function openOptions(component) {
  closeModal();
  const t = telemetry || {};

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  let title = 'Component Options';
  let bodyHtml = '';

  if (component === 'antivirus') {
    title = 'Virus and Spyware Protection Options';
    bodyHtml = `
      <div class="modal-section-title">Protection Settings</div>
      <div class="modal-option-row">
        <div>
          <label for="opt-rtp">Real-Time Antivirus Protection</label>
          <div class="modal-option-desc">Scan files and programs before execution</div>
        </div>
        <input type="checkbox" id="opt-rtp" ${t.defender_status === 'Active' ? 'checked' : ''} />
      </div>
      <div class="modal-option-row">
        <div>
          <label for="opt-archives">Scan Compressed Archives (.zip, .rar, .7z)</label>
          <div class="modal-option-desc">Inspect archived files during background scans</div>
        </div>
        <input type="checkbox" id="opt-archives" checked />
      </div>
      <div class="modal-option-row">
        <div>
          <label for="opt-scan-schedule">Automatic Scan Schedule</label>
          <div class="modal-option-desc">Perform background threat scans periodically</div>
        </div>
        <select id="opt-scan-schedule" class="btn" style="padding:3px 8px;">
          <option value="daily">Daily @ 02:00 AM</option>
          <option value="weekly" selected>Weekly (Sunday)</option>
          <option value="manual">Manual Only</option>
        </select>
      </div>
      <div class="modal-section-title" style="margin-top:14px;">Definitions & Updates</div>
      <div style="background:#f4f6f9; padding:8px 12px; border-radius:4px; font-size:11px; margin-top:4px;">
        <div><strong>Definitions Date:</strong> ${escHtml(fmtDate(t.antivirus_updated_at))}</div>
        <div><strong>Engine Version:</strong> Windows Security Engine v2.0.0</div>
      </div>
    `;
  } else if (component === 'rtp') {
    title = 'Proactive Threat Protection Options';
    bodyHtml = `
      <div class="modal-section-title">Behavioral Threat Analysis</div>
      <div class="modal-option-row">
        <div>
          <label for="opt-behavior">Behavioral Heuristic Engine</label>
          <div class="modal-option-desc">Block suspicious process behavior in real time</div>
        </div>
        <input type="checkbox" id="opt-behavior" checked />
      </div>
      <div class="modal-option-row">
        <div>
          <label for="opt-ransomware">Ransomware Folder Shield</label>
          <div class="modal-option-desc">Protect Documents, Pictures, and User data folders</div>
        </div>
        <input type="checkbox" id="opt-ransomware" checked />
      </div>
      <div class="modal-option-row">
        <div>
          <label for="opt-sensitivity">Heuristic Sensitivity Level</label>
          <div class="modal-option-desc">Adjust detection threshold for unknown threats</div>
        </div>
        <select id="opt-sensitivity" class="btn" style="padding:3px 8px;">
          <option value="low">Standard (Recommended)</option>
          <option value="high" selected>Aggressive (Strict)</option>
        </select>
      </div>
    `;
  } else if (component === 'firewall') {
    title = 'Network and Exploit Mitigation Options';
    bodyHtml = `
      <div class="modal-section-title">Firewall & Intrusion Prevention</div>
      <div class="modal-option-row">
        <div>
          <label for="opt-fw">Windows System Firewall</label>
          <div class="modal-option-desc">Filter incoming network traffic and block unauthorized ports</div>
        </div>
        <input type="checkbox" id="opt-fw" ${t.firewall_status === 'ON' ? 'checked' : ''} />
      </div>
      <div class="modal-option-row">
        <div>
          <label for="opt-stealth">Stealth Mode (Ignore External Pings)</label>
          <div class="modal-option-desc">Hide open ports from unauthorized network sweeps</div>
        </div>
        <input type="checkbox" id="opt-stealth" checked />
      </div>
      <div class="modal-section-title" style="margin-top:14px;">Active Network Connections</div>
      <div style="background:#f4f6f9; padding:8px 12px; border-radius:4px; font-size:11px; margin-top:4px;">
        <div><strong>Active Monitored Connections:</strong> ${t.active_ports ? t.active_ports.length : 50}</div>
        <div><strong>Active Connection IP:</strong> ${escHtml(t.ip_address || '—')}</div>
      </div>
    `;
  } else if (component === 'encryption') {
    title = 'Drive Encryption Options';
    bodyHtml = `
      <div class="modal-section-title">BitLocker / FileVault Protection</div>
      <div class="modal-option-row">
        <div>
          <label>Encrypted System Volume</label>
          <div class="modal-option-desc">Drive: ${escHtml(t.bitlocker_drive || 'C:')}</div>
        </div>
        <span class="status-badge ${t.bitlocker_status === 'enabled' ? 'success' : 'warning'}">
          ${t.bitlocker_status === 'enabled' ? 'Encrypted' : 'Not Encrypted'}
        </span>
      </div>
      <div class="modal-option-row">
        <div>
          <label>Hardware TPM Security Chip</label>
          <div class="modal-option-desc">TPM 2.0 Hardware Key Backup</div>
        </div>
        <span class="status-badge success">Active</span>
      </div>
      <div style="margin-top:14px; text-align:center;">
        <button class="btn" id="btn-open-sys-security" style="padding:6px 14px; font-weight:600;">
          Launch System Drive Security Panel ↗
        </button>
      </div>
    `;
  }

  overlay.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <span>${escHtml(title)}</span>
        <button class="modal-close-btn" id="btn-modal-close">&times;</button>
      </div>
      <div class="modal-body">
        ${bodyHtml}
      </div>
      <div class="modal-footer">
        <button class="btn" id="btn-modal-cancel">Cancel</button>
        <button class="btn primary" id="btn-modal-save">Save Changes</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Attach event handlers inside modal
  document.getElementById('btn-modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);

  const saveBtn = document.getElementById('btn-modal-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      closeModal();
      showToast(`${title} updated successfully.`, 'success');
    });
  }

  const sysSecBtn = document.getElementById('btn-open-sys-security');
  if (sysSecBtn) {
    sysSecBtn.addEventListener('click', () => {
      openWindowsSecurity();
      closeModal();
    });
  }
}

function openWindowsSecurity() {
  window.securityAPI.openWindowsSecurity();
  showToast('Opening system security panel…', 'info');
}

function showHelp() {
  showToast('AssetManager Security Client v2.0 — Endpoint protection & real-time telemetry agent.', 'info', 6000);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  try {
    // 1. Subscribe to live telemetry pushes from main process
    window.securityAPI.onTelemetryUpdate((data) => {
      telemetry = data;
      render();
    });

    // 2. Fetch initial telemetry from main process (uses instant native OS metrics)
    const cached = await window.securityAPI.getTelemetry();
    if (cached) {
      telemetry = cached;
      render();
    }

    // 3. Trigger async non-blocking full telemetry refresh (network interfaces, defender, processes)
    const fresh = await window.securityAPI.refreshTelemetry();
    if (fresh) {
      telemetry = fresh;
      render();
    }
  } catch (e) {
    if (!telemetry) render();
  }
}
