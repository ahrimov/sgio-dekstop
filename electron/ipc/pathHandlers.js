import { ipcMain, app } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerPathIpc() {
	ipcMain.handle('get-app-data-path', () => {
		return getAppDataPath();
	});

	ipcMain.handle('get-user-data-path', () => {
		return app.getPath('userData');
	});

	ipcMain.handle('get-resource-path', () => {
		return path.join(getAppDataPath(), 'resources');
	});

	ipcMain.handle('get-source-path', () => {
		return getSourcePath();
	});

	ipcMain.handle('get-absolute-path', (event, relativePath) => {
		const sourcePath = getSourcePath();
		return path.join(sourcePath, relativePath);
	});
}

export function getResourcesPath() {
	if (app.isPackaged) {
		return path.join(process.resourcesPath, 'resources');
	} else {
		return path.join(__dirname, '../../src/assets/resources');
	}
}

export function getAppDataPath() {
	if (app.isPackaged) {
		return path.join(app.getPath('userData'), 'sgio-data');
	} else {
		return path.join(__dirname, '../../sgio-data');
	}
}

export function getSourcePath() {
	if (app.isPackaged) {
		return process.resourcesPath;
	} else {
		return path.join(__dirname, '../../src/assets');
	}
}
