import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

export function registerFsIpc() {
	ipcMain.handle('fs-readFile', async (event, filePath) => {
		return new Promise((resolve, reject) => {
			fs.readFile(filePath, 'utf8', (err, data) => {
				if (err) reject(err);
				else resolve(data);
			});
		});
	});

	ipcMain.handle('fs-writeFile', async (event, filePath, data) => {
		return new Promise((resolve, reject) => {
			const dir = path.dirname(filePath);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}

			fs.writeFile(filePath, data, 'utf8', err => {
				if (err) reject(err);
				else resolve();
			});
		});
	});

	ipcMain.handle('fs-mkdir', async (event, dirPath) => {
		return new Promise((resolve, reject) => {
			fs.mkdir(dirPath, { recursive: true }, err => {
				if (err && err.code !== 'EEXIST') reject(err);
				else resolve();
			});
		});
	});

	ipcMain.handle('fs-exists', async (event, filePath) => {
		return fs.existsSync(filePath);
	});

	ipcMain.handle('fs-copyFile', async (event, src, dest) => {
		return new Promise((resolve, reject) => {
			const destDir = path.dirname(dest);
			if (!fs.existsSync(destDir)) {
				fs.mkdirSync(destDir, { recursive: true });
			}

			fs.copyFile(src, dest, err => {
				if (err) reject(err);
				else resolve();
			});
		});
	});

	ipcMain.handle('fs-readdir', async (event, dirPath) => {
		return new Promise((resolve, reject) => {
			fs.readdir(dirPath, (err, files) => {
				if (err) reject(err);
				else resolve(files);
			});
		});
	});

	ipcMain.handle('fs-stat', async (event, filePath) => {
		return new Promise((resolve, reject) => {
			fs.stat(filePath, (err, stats) => {
				if (err) reject(err);
				else resolve(stats);
			});
		});
	});

	ipcMain.handle('fs-deleteFile', async (event, filePath) => {
		return new Promise((resolve, reject) => {
			fs.unlink(filePath, err => {
				if (err) reject(err);
				else resolve();
			});
		});
	});
}
