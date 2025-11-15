const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    readFile: (filePath) => ipcRenderer.invoke('fs-readFile', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('fs-writeFile', filePath, data),
    mkdir: (dirPath) => ipcRenderer.invoke('fs-mkdir', dirPath),
    exists: (filePath) => ipcRenderer.invoke('fs-exists', filePath),
    copyFile: (src, dest) => ipcRenderer.invoke('fs-copyFile', src, dest),
  
    getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
    readdir: (dirPath) => ipcRenderer.invoke('fs-readdir', dirPath),
    stat: (filePath) => ipcRenderer.invoke('fs-stat', filePath),

    getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
    getResourcePath: () => ipcRenderer.invoke('get-resource-path'),
    getSourcePath: () => ipcRenderer.invoke('get-source-path'),
    getAbsolutePath: (relativePath) => ipcRenderer.invoke('get-absolute-path', relativePath),
    
    openFileDialog: (options) => ipcRenderer.invoke('dialog-openFile', options),

    openDatabase: (dbPath) => ipcRenderer.invoke('db-open', dbPath),
    executeSQL: (dbPath, query) => ipcRenderer.invoke('db-execute', dbPath, query),
});
