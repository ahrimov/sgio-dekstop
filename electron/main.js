const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.argv.includes('--dev');
const spatialite = require('spatialite');

const databases = new Map();

if (isDev) {
  require('electron-reload')(path.join(__dirname, '../public/dist'), {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

function getResourcesPath() {
    if (app.isPackaged) {
        return path.join(path.dirname(app.getPath('exe')), 'resources');
    } else {
        return path.join(__dirname, '../src/assets/resources');
    }
}

function getAppDataPath() {
    if (app.isPackaged) {
        return path.join(path.dirname(app.getPath('exe')), 'sgio-data');
    } else {
        return path.join(__dirname, '../sgio-data');
    }
}

function getSourcePath() {
    if (app.isPackaged) {
        return getResourcesPath();
    } else {
        return path.join(__dirname, '../src/assets');
    }
}

function copyResourcesToAppData() {
    const sourceResources = path.join(__dirname, '../src/assets/resources');
    const targetResources = path.join(getAppDataPath(), 'resources');
    
    console.log('Copying resources from:', sourceResources);
    console.log('Copying resources to:', targetResources);
    
    if (fs.existsSync(sourceResources)) {
        copyRecursiveSync(sourceResources, targetResources);
        console.log('Resources copied successfully');
    } else {
        console.log('Source resources not found:', sourceResources);
    }
}

function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    
    for (const file of files) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        
        const stat = fs.statSync(srcPath);
        
        if (stat.isDirectory()) {
            copyRecursiveSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function createWindow() {
    console.log('=== ELECTRON STARTUP ===');
    console.log('isPackaged:', app.isPackaged);
    console.log('Resources path:', getResourcesPath());
    console.log('App data path:', getAppDataPath());
    console.log('Source path:', getSourcePath());
    copyResourcesToAppData();
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });


  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ['geolocation'];
        if (allowedPermissions.includes(permission)) {
            callback(true);
        } else {
            callback(false);
        }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile('public/index.html');
  }

  if (isDev) {
    mainWindow.webContents.openDevTools();
    
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.openDevTools();
    });
  }

  Menu.setApplicationMenu(null);
}

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
    
    fs.writeFile(filePath, data, 'utf8', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

ipcMain.handle('fs-mkdir', async (event, dirPath) => {
  return new Promise((resolve, reject) => {
    fs.mkdir(dirPath, { recursive: true }, (err) => {
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
    
    fs.copyFile(src, dest, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
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

ipcMain.handle('db-open', async (event, dbPath) => {
    return new Promise((resolve, reject) => {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const db = new spatialite.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
            } else {
                console.log('Connected to Spatialite database:', dbPath);
                
                db.spatialite((err) => {
                    if (err) {
                        console.error(' Error loading spatialite extension:', err);
                        reject(err);
                    } else {
                        console.log('Spatialite extension loaded successfully');
                        databases.set(dbPath, db);
                        resolve({
                            filename: path.basename(dbPath),
                            path: dbPath,
                            connected: true
                        });
                    }
                });
            }
        });
    });
});

ipcMain.handle('db-execute', async (event, dbPath, query) => {
    return new Promise((resolve, reject) => {
        console.log('Looking for database in cache:', dbPath);
        console.log('Available databases:', Array.from(databases.keys()));
        
        const db = databases.get(dbPath);
        
        if (!db) {
            console.error(' Database not found in cache:', dbPath);
            reject(new Error(`Database not found: ${dbPath}`));
            return;
        }
        
        console.log('Database found, executing SQL:', query);
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error(' SQL Error:', err);
                reject(err);
            } else {
                console.log('Query successful, rows:', rows.length);
                resolve({ rows });
            }
        });
    });
});

app.on('window-all-closed', () => {
    databases.forEach((db, path) => {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database closed:', path);
            }
        });
    });
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('dialog-openFile', async (event, options) => {
  const result = await dialog.showOpenDialog({
    ...options,
    properties: ['openFile']
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  
  return result.filePaths[0];
});
