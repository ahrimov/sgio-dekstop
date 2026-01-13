import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import spatialite from 'spatialite';
import { getSourcePath } from './pathHandlers.js';

const databases = new Map();

export function registerDbIpc() {
ipcMain.handle('db-open', async (event, dbPath) => {
        return new Promise((resolve, reject) => {
            const dir = path.dirname(dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const db = new spatialite.Database(dbPath, err => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                    return;
                }

                console.log('Connected to Spatialite database:', dbPath);
                
                const tryLoadWithPath = () => {
                    const spatialitePath = getSpatialitePath();
                    console.log('Attempting to load spatialite from:', spatialitePath);
                    
                    if (!fs.existsSync(spatialitePath)) {
                        const error = `Spatialite file not found at: ${spatialitePath}`;
                        console.error(error);
                        reject(new Error(error));
                        return;
                    }
                    
                    db.loadExtension(spatialitePath, err => {
                        if (err) {
                            console.error('Error loading spatialite extension with path:', err);
                            
                            console.log('Trying to load with simple name: mod_spatialite');
                            db.loadExtension('mod_spatialite', err2 => {
                                if (err2) {
                                    console.error('Error loading spatialite with simple name:', err2);
                                    reject(err2);
                                } else {
                                    console.log('Spatialite loaded successfully with simple name');
                                    onSuccess();
                                }
                            });
                        } else {
                            console.log('Spatialite extension loaded successfully with path');
                            onSuccess();
                        }
                    });
                };

                const onSuccess = () => {
                    databases.set(dbPath, db);
                    resolve({
                        filename: path.basename(dbPath),
                        path: dbPath,
                        connected: true,
                    });
                };

                try {
                    console.log('Trying to load spatialite using .spatialite() method...');
                    db.spatialite(err => {
                        if (err) {
                            console.error('Error with .spatialite() method:', err);
                            tryLoadWithPath();
                        } else {
                            console.log('Spatialite loaded successfully using .spatialite() method');
                            onSuccess();
                        }
                    });
                } catch (e) {
                    console.error('Exception in .spatialite() method:', e);
                    tryLoadWithPath();
                }
            });
        });
    });

	ipcMain.handle('db-execute', async (event, dbPath, query) => {
		return new Promise((resolve, reject) => {

			const db = databases.get(dbPath);

			if (!db) {
				console.error(' Database not found in cache:', dbPath);
				reject(new Error(`Database not found: ${dbPath}`));
				return;
			}

			db.all(query, [], (err, rows) => {
				if (err) {
					console.error(' SQL Error:', err);
					reject(err);
				} else {
					resolve({ rows });
				}
			});
		});
	});
}

export function closeAllDatabases() {
	databases.forEach(db => {
		db.close();
	});
}

const getSpatialitePath = () => {
	const platform = process.platform;
	const sourcePath = getSourcePath();
	const spatialiteModPath = path.join(sourcePath, 'spatialite');

	let spatialiteFile = null;

	if (platform === 'darwin') {
		spatialiteFile = path.join(spatialiteModPath, 'darwin', 'mod_spatialite.dylib');
	} else if (platform === 'win32') {
		spatialiteFile = path.join(spatialiteModPath, 'win32', 'mod_spatialite.dll');
	} else if (platform === 'linux') {
		spatialiteFile = path.join(spatialiteModPath, 'linux', 'mod_spatialite.so');
	}

	return spatialiteFile;
};
