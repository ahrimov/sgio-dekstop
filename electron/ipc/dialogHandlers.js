import { ipcMain, dialog, BrowserWindow } from 'electron';

export function registerDialogIpc() {
	ipcMain.handle('dialog-openFile', async (event, options) => {
		const result = await dialog.showOpenDialog({
			...options,
			properties: ['openFile'],
		});

		if (result.canceled || result.filePaths.length === 0) {
			return null;
		}

		return result.filePaths[0];
	});
	ipcMain.handle('show-message-box', (event, opts) => dialog.showMessageBox(BrowserWindow.getFocusedWindow(), opts));
	ipcMain.handle('show-save-dialog', (event, opts) => dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), opts));
}
