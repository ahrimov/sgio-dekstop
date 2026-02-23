import { BrowserWindow, Menu, ipcMain, app } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';

const isDev = process.argv.includes('--dev');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createMainWindow() {
	// Определяем путь к иконке в зависимости от режима
	const iconPath = isDev
		? path.join(app.getAppPath(), 'build', 'icons', 'icon.png')
		: path.join(__dirname, '..', 'build', 'icons', 'icon.png');

	const mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		titleBarStyle: 'hidden',
		...(process.platform !== 'darwin'
			? {
					titleBarOverlay: {
						color: '#003366',
						symbolColor: '#ffffff',
						height: 30,
					},
				}
			: {}),
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true,
			enableRemoteModule: true,
			webSecurity: false,
			allowRunningInsecureContent: true,
			preload: path.join(__dirname, 'preload.js'),
		},
		icon: iconPath,
	});

	if (isDev) {
		mainWindow.loadFile('public/dist/dev/index.html');
		mainWindow.webContents.on('did-finish-load', () => mainWindow.webContents.openDevTools());

		ipcMain.on('show-context-menu', (event, data) => {
			const template = [
				{
					label: 'Inspect Element',
					click: () => {
						mainWindow.webContents.inspectElement(data.x, data.y);
						mainWindow.webContents.openDevTools();
					},
				},
				{
					label: 'Open DevTools',
					click: () => mainWindow.webContents.openDevTools(),
				},
				{
					label: 'Reload',
					click: () => mainWindow.webContents.reload(),
				},
			];

			const menu = Menu.buildFromTemplate(template);
			menu.popup({ window: mainWindow });
		});
	} else {
		mainWindow.loadFile('public/dist/prod/index.html');

		ipcMain.on('show-context-menu', (event, data) => {
			const template = [
				{
					label: 'Inspect Element',
					click: () => {
						mainWindow.webContents.inspectElement(data.x, data.y);
						mainWindow.webContents.openDevTools();
					},
				},
				{
					label: 'Open DevTools',
					click: () => mainWindow.webContents.openDevTools(),
				},
				{
					label: 'Reload',
					click: () => mainWindow.webContents.reload(),
				},
			];

			const menu = Menu.buildFromTemplate(template);
			menu.popup({ window: mainWindow });
		});
	}

	Menu.setApplicationMenu(null);
}