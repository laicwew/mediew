const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  getSubfolders: (dirPath) => ipcRenderer.invoke('get-subfolders', dirPath),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  watchDirectory: (dirPath) => ipcRenderer.send('watch-directory', dirPath),
  unwatchDirectory: () => ipcRenderer.send('unwatch-directory'),
  onDirectoryChanged: (callback) => ipcRenderer.on('directory-changed', (event, dirPath) => callback(dirPath))
});
