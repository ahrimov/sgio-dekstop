import { app } from 'electron';
import { createMainWindow } from './mainWindow.js';
import { registerFsIpc } from './ipc/fsHandlers.js';
import { registerPathIpc } from './ipc/pathHandlers.js';
import { registerDbIpc, closeAllDatabases } from './ipc/dbHandlers.js';
import { ensureProjectResources } from './resources.js';
import { registerDialogIpc } from './ipc/dialogHandlers.js';
import { registerIliImportIpc } from './ipc/iliImportHandlers.js';
import { registerIliCalcIpc } from './ipc/iliCalcHandlers.js';
import { registerVirtMarkerIpc } from './ipc/virtMarkerHandlers.js';
import { registerTileProtocol, registerTileSchemePrivileges } from './tiles/tileProtocol.js';

registerTileSchemePrivileges();

app.whenReady().then(async () => {
	await ensureProjectResources();
	registerTileProtocol();
	createMainWindow();
	registerFsIpc();
	registerPathIpc();
	registerDbIpc();
	registerDialogIpc();
	registerIliImportIpc();
	registerIliCalcIpc();
	registerVirtMarkerIpc();
});

app.on('window-all-closed', () => {
	closeAllDatabases();
	app.quit();
});
