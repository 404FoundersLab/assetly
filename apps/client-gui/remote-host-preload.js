const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hostAPI', {
  onSignal: (cb) => ipcRenderer.on('rtc:signal-in', (_, s) => cb(s)),
  sendSignal: (s) => ipcRenderer.send('rtc:signal-out', s),
  sendInput: (i) => ipcRenderer.send('rtc:input', i),
  setState: (st) => ipcRenderer.send('rtc:state', st),
  getSourceId: () => ipcRenderer.invoke('rtc:get-source'),
  ready: () => ipcRenderer.send('rtc:host-ready')
});

