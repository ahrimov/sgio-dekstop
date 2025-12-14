import { BrowserWindow, Menu } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';

const isDev = process.argv.includes('--dev');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.on('did-finish-load', () => mainWindow.webContents.openDevTools());
  } else {
    mainWindow.loadFile('public/dist/index.html');
  }

  Menu.setApplicationMenu(null);
}
