const { contextBridge, ipcRenderer } = require('electron');

// Expose basic Electron info and window controls (if still used)
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  platform: process.platform,
  appVersion: process.env.npm_package_version || '0.1.0', 
  
  sendMessage: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  removeListener: (channel, func) => {
    ipcRenderer.removeListener(channel, func);
  },
  
  minimizeWindow: () => ipcRenderer.send('window-control', 'minimize'),
  maximizeWindow: () => ipcRenderer.send('window-control', 'maximize'),
  closeWindow: () => ipcRenderer.send('window-control', 'close'),
});

// Expose gRPC IPC API to the renderer process
contextBridge.exposeInMainWorld('electronApi', {
  getTodos: () => ipcRenderer.invoke('get-todos'),
  editTodo: (payload) => ipcRenderer.invoke('edit-todo', payload),
  addTodo: (payload) => ipcRenderer.invoke('add-todo', payload),
  markDone: (payload) => ipcRenderer.invoke('mark-done', payload),
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (config) => ipcRenderer.invoke('update-config', config),
});
