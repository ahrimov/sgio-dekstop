import { BrowserWindow, Menu, app } from 'electron';
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
			devTools: isDev,
			webSecurity: false,
			allowRunningInsecureContent: true,
			preload: path.join(__dirname, 'preload.js'),
		},
		icon: iconPath,
	});

	if (isDev) {
		mainWindow.loadFile('public/dist/dev/index.html');
		mainWindow.webContents.on('did-finish-load', () => mainWindow.webContents.openDevTools());
	} else {
		mainWindow.loadFile('public/dist/prod/index.html');
	}

	mainWindow.webContents.on('context-menu', (_event, params) => {
		const isTextField =
			params.isEditable || Boolean(params.inputFieldType && params.inputFieldType !== 'none');
		const template = isTextField
			? [
					...(params.isEditable ? [{ label: 'Вырезать', role: 'cut' }] : []),
					{ label: 'Копировать', role: 'copy' },
					...(params.isEditable ? [{ label: 'Вставить', role: 'paste' }] : []),
				]
			: isDev
				? [
						{
							label: 'Inspect Element',
							click: () => {
								mainWindow.webContents.inspectElement(params.x, params.y);
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
					]
				: [];

		if (template.length === 0) {
			return;
		}

		const menu = Menu.buildFromTemplate(template);
		menu.popup({ window: mainWindow });
	});

	Menu.setApplicationMenu(null);
}
