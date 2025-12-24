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
				} else {
					console.log('Connected to Spatialite database:', dbPath);
					try {
						db.spatialite(err => {
							if (err) {
								console.error(' Error loading spatialite extension:', err);
								reject(err);
							} else {
								console.log('Spatialite extension loaded successfully');
								databases.set(dbPath, db);
								resolve({
									filename: path.basename(dbPath),
									path: dbPath,
									connected: true,
								});
							}
						});
					} catch (e) {
						const spatialitePath = getSpatialitePath();
						db.loadExtension(spatialitePath, err => {
							console.log('Loading spatialite extension:', spatialitePath);
							if (err) {
								console.error(' Error loading spatialite extension:', err);
								reject(err);
							} else {
								console.log('Spatialite extension loaded successfully');
								databases.set(dbPath, db);
								resolve({
									filename: path.basename(dbPath),
									path: dbPath,
									connected: true,
								});
							}
						});
					}
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
