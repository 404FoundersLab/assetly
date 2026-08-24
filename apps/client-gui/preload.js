const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('securityAPI', {
  getTelemetry: () => ipcRenderer.invoke('get-telemetry'),
  getHistory: () => ipcRenderer.invoke('get-history'),
  getTenantId: () => ipcRenderer.invoke('get-tenant-id'),
  getEndpointId: () => ipcRenderer.invoke('get-endpoint-id'),
  getManagerUrl: () => ipcRenderer.invoke('get-manager-url'),
  runScan: () => ipcRenderer.invoke('run-scan'),
  runFullScan: () => ipcRenderer.invoke('run-full-scan'),
  runLiveUpdate: () => ipcRenderer.invoke('run-liveupdate'),
  refreshTelemetry: () => ipcRenderer.invoke('refresh-telemetry'),
  openWindowsSecurity: () => ipcRenderer.invoke('open-windows-security'),
  startRemoteSession: (params) => ipcRenderer.invoke('remote:start-session', params),
  stopRemoteSession: () => ipcRenderer.invoke('remote:stop-session'),
  captureFrame: () => ipcRenderer.invoke('remote:capture-frame'),
  injectInput: (data) => ipcRenderer.invoke('remote:inject-input', data),
  executeRemoteCmd: (cmd) => ipcRenderer.invoke('remote:execute-cmd', cmd),
  onRemoteStatusChanged: (callback) => {
    ipcRenderer.on('remote:status-changed', (_, data) => callback(data));
  },
  onTelemetryUpdate: (callback) => {
    ipcRenderer.on('telemetry-update', (_, data) => callback(data));
  },
  removeTelemetryListeners: () => {
    ipcRenderer.removeAllListeners('telemetry-update');
    ipcRenderer.removeAllListeners('remote:status-changed');
  }
});
