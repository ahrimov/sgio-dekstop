const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	readFile: filePath => ipcRenderer.invoke('fs-readFile', filePath),
	writeFile: (filePath, data) => ipcRenderer.invoke('fs-writeFile', filePath, data),
	mkdir: dirPath => ipcRenderer.invoke('fs-mkdir', dirPath),
	exists: filePath => ipcRenderer.invoke('fs-exists', filePath),
	copyFile: (src, dest) => ipcRenderer.invoke('fs-copyFile', src, dest),

	getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
	readdir: dirPath => ipcRenderer.invoke('fs-readdir', dirPath),
	stat: filePath => ipcRenderer.invoke('fs-stat', filePath),

	getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
	getResourcePath: () => ipcRenderer.invoke('get-resource-path'),
	getSourcePath: () => ipcRenderer.invoke('get-source-path'),
	getAbsolutePath: relativePath => ipcRenderer.invoke('get-absolute-path', relativePath),

	openFileDialog: options => ipcRenderer.invoke('dialog-openFile', options),

	openDatabase: dbPath => ipcRenderer.invoke('db-open', dbPath),
	executeSQL: (dbPath, query) => ipcRenderer.invoke('db-execute', dbPath, query),

	inspectElement: (x, y) => ipcRenderer.send('inspect-element', x, y),
	showContextMenu: () => ipcRenderer.send('show-context-menu'),

	deleteFile: filePath => ipcRenderer.invoke('fs-deleteFile', filePath),

	showMessageBox: (opts) => ipcRenderer.invoke('show-message-box', opts),
	showSaveDialog: (opts) => ipcRenderer.invoke('show-save-dialog', opts),
});

window.addEventListener('contextmenu', e => {
	e.preventDefault();

	ipcRenderer.send('show-context-menu', {
		x: e.x,
		y: e.y,
		tagName: e.target.tagName,
		id: e.target.id,
		className: e.target.className,
	});
});
