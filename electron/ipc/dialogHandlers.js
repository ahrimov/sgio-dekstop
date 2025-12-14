import { ipcMain, dialog } from 'electron';

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
}
