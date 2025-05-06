const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // Basic information
  isElectron: true,
  platform: process.platform,
  osVersion: os.release(),
  appVersion: process.env.npm_package_version || '0.1.0',
  
  // Functions for communicating with main process
  sendMessage: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  removeListener: (channel, func) => {
    ipcRenderer.removeListener(channel, func);
  },
  
  // App window control
  minimizeWindow: () => ipcRenderer.send('window-control', 'minimize'),
  maximizeWindow: () => ipcRenderer.send('window-control', 'maximize'),
  closeWindow: () => ipcRenderer.send('window-control', 'close'),
});
