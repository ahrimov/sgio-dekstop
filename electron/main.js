import { app } from 'electron';
import { createMainWindow } from './mainWindow.js';
import { registerFsIpc } from './ipc/fsHandlers.js';
import { registerPathIpc } from './ipc/pathHandlers.js';
import { registerDbIpc, closeAllDatabases } from './ipc/dbHandlers.js';
import { ensureProjectResources } from './resources.js';
import { registerDialogIpc } from './ipc/dialogHandlers.js';
import { registerIliImportIpc } from './ipc/iliImportHandlers.js';
import { registerIliCalcIpc } from './ipc/iliCalcHandlers.js';

app.whenReady().then(async () => {
	await ensureProjectResources();
	createMainWindow();
	registerFsIpc();
	registerPathIpc();
	registerDbIpc();
	registerDialogIpc();
	registerIliImportIpc();
	registerIliCalcIpc();
});

app.on('window-all-closed', () => {
	closeAllDatabases();
	app.quit();
});
