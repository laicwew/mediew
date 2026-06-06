const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readDirectory: (dirPath, sortMode, sortDir) => ipcRenderer.invoke('read-directory', dirPath, sortMode, sortDir),
  getSubfolders: (dirPath) => ipcRenderer.invoke('get-subfolders', dirPath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  deleteFiles: (filePaths) => ipcRenderer.invoke('delete-files', filePaths),
  renameFile: (filePath, newName) => ipcRenderer.invoke('rename-file', filePath, newName),
  moveFile: (filePath, destDir) => ipcRenderer.invoke('move-file', filePath, destDir),
  createFolder: (parentDir, folderName) => ipcRenderer.invoke('create-folder', parentDir, folderName),
  deleteFolder: (dirPath) => ipcRenderer.invoke('delete-folder', dirPath),
  renameFolder: (dirPath, newName) => ipcRenderer.invoke('rename-folder', dirPath, newName),
  moveFolder: (srcPath, destDir) => ipcRenderer.invoke('move-folder', srcPath, destDir),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  watchDirectory: (dirPath) => ipcRenderer.send('watch-directory', dirPath),
  unwatchDirectory: () => ipcRenderer.send('unwatch-directory'),
  onDirectoryChanged: (callback) => ipcRenderer.on('directory-changed', (event, dirPath) => callback(dirPath))
});
