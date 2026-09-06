const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	loadOnlineTile: (tree, url) => ipcRenderer.invoke('tiles-load-online', tree, url),
	readFile: filePath => ipcRenderer.invoke('fs-readFile', filePath),
	readFileBase64: filePath => ipcRenderer.invoke('fs-readFileBase64', filePath),
	writeFile: (filePath, data) => ipcRenderer.invoke('fs-writeFile', filePath, data),
	writeFileBinary: (filePath, base64Data) =>
		ipcRenderer.invoke('fs-writeFileBinary', filePath, base64Data),
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

	deleteFile: filePath => ipcRenderer.invoke('fs-deleteFile', filePath),

	showMessageBox: opts => ipcRenderer.invoke('show-message-box', opts),
	showSaveDialog: opts => ipcRenderer.invoke('show-save-dialog', opts),

	// ILI Import
	iliImportXml: (dbPath, params) => ipcRenderer.invoke('ili-import-xml', dbPath, params),
	iliGetRoutes: dbPath => ipcRenderer.invoke('ili-get-routes', dbPath),
	iliGetRoutesByType: (dbPath, typeCl) =>
		ipcRenderer.invoke('ili-get-routes-by-type', dbPath, typeCl),
	iliCheckExisting: (dbPath, routeId) =>
		ipcRenderer.invoke('ili-check-existing', dbPath, routeId),
	iliDeleteInspection: (dbPath, inspectionId) =>
		ipcRenderer.invoke('ili-delete-inspection', dbPath, inspectionId),
	iliDeleteAll: dbPath => ipcRenderer.invoke('ili-delete-all', dbPath),
	onIliImportProgress: callback => {
		const handler = (_event, data) => callback(data);
		ipcRenderer.on('ili-import-progress', handler);
		return () => ipcRenderer.removeListener('ili-import-progress', handler);
	},

	// ILI Coordinate Calculation
	iliCalcCoordinates: (dbPath, params) =>
		ipcRenderer.invoke('ili-calc-coordinates', dbPath, params),
	iliGetInspections: dbPath => ipcRenderer.invoke('ili-get-inspections', dbPath),
	onIliCalcProgress: callback => {
		const handler = (_event, data) => callback(data);
		ipcRenderer.on('ili-calc-progress', handler);
		return () => ipcRenderer.removeListener('ili-calc-progress', handler);
	},

	// ILI Report Reversal
	iliReverseReport: (dbPath, params) => ipcRenderer.invoke('ili-reverse-report', dbPath, params),
	onIliReverseProgress: callback => {
		const handler = (_event, data) => callback(data);
		ipcRenderer.on('ili-reverse-progress', handler);
		return () => ipcRenderer.removeListener('ili-reverse-progress', handler);
	},

	// ILI Coordinate Calculation without reper linking (used after virtual reper changes)
	iliCalcCoordinatesNoLink: (dbPath, params) =>
		ipcRenderer.invoke('ili-calc-coordinates-no-link', dbPath, params),

	// Virtual reper (виртуальный репер) CRUD
	iliProjectPointOnRoute: (dbPath, params) =>
		ipcRenderer.invoke('ili-project-point-on-route', dbPath, params),
	iliVirtMarkerInsert: (dbPath, params) =>
		ipcRenderer.invoke('ili-virt-marker-insert', dbPath, params),
	iliVirtMarkerUpdate: (dbPath, params) =>
		ipcRenderer.invoke('ili-virt-marker-update', dbPath, params),
	iliVirtMarkerDelete: (dbPath, params) =>
		ipcRenderer.invoke('ili-virt-marker-delete', dbPath, params),
});
