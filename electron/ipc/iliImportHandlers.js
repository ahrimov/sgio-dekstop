import { ipcMain } from 'electron';
import path from 'path';
import spatialite from 'spatialite';
import fs from 'fs';
import { runIliImport } from '../iliImport/iliImportService.js';
import { getAppDataPath, getSourcePath } from './pathHandlers.js';
import { getOpenDatabase } from './dbHandlers.js';

/**
 * IPC handlers for ILI XML import functionality.
 * Registers the 'ili-import-xml' IPC channel that runs the full import pipeline.
 */

// Fallback cache for connections opened independently (when main DB not yet open)
const importDatabases = new Map();

/**
 * Get or open a database connection for import operations.
 * @param {string} dbPath
 * @returns {Promise<object>}
 */
function getSpatialitePath() {
	const platform = process.platform;
	const sourcePath = getSourcePath();
	const spatialiteModPath = path.join(sourcePath, 'spatialite');

	if (platform === 'darwin') {
		return path.join(spatialiteModPath, 'darwin', 'mod_spatialite.dylib');
	} else if (platform === 'win32') {
		return path.join(spatialiteModPath, 'win32', 'mod_spatialite.dll');
	} else if (platform === 'linux') {
		return path.join(spatialiteModPath, 'linux', 'mod_spatialite.so');
	}
	return null;
}

function getDatabase(dbPath) {
	// Prefer the already-open connection from the main DB handler to avoid SQLITE_READONLY
	const existingDb = getOpenDatabase(dbPath);
	if (existingDb) {
		return Promise.resolve(existingDb);
	}

	if (importDatabases.has(dbPath)) {
		return Promise.resolve(importDatabases.get(dbPath));
	}

	return new Promise((resolve, reject) => {
		const db = new spatialite.Database(dbPath, err => {
			if (err) {
				reject(err);
				return;
			}

			const tryLoadWithPath = () => {
				const spatialiteFile = getSpatialitePath();
				console.log('[ILI Import] Attempting to load spatialite from:', spatialiteFile);

				if (!spatialiteFile || !fs.existsSync(spatialiteFile)) {
					reject(new Error(`Spatialite extension not found at: ${spatialiteFile}`));
					return;
				}

				db.loadExtension(spatialiteFile, err2 => {
					if (err2) {
						console.error('[ILI Import] loadExtension with path failed:', err2);
						reject(err2);
					} else {
						console.log('[ILI Import] Spatialite loaded successfully via loadExtension');
						importDatabases.set(dbPath, db);
						resolve(db);
					}
				});
			};

			try {
				console.log('[ILI Import] Trying .spatialite() method...');
				db.spatialite(err2 => {
					if (err2) {
						console.warn('[ILI Import] .spatialite() callback error, falling back to loadExtension:', err2.message);
						tryLoadWithPath();
					} else {
						console.log('[ILI Import] Spatialite loaded successfully via .spatialite()');
						importDatabases.set(dbPath, db);
						resolve(db);
					}
				});
			} catch (e) {
				console.warn('[ILI Import] .spatialite() threw exception, falling back to loadExtension:', e.message);
				tryLoadWithPath();
			}
		});
	});
}

export function registerIliImportIpc() {
	/**
	 * IPC: ili-import-xml
	 * Runs the full ILI XML import pipeline.
	 *
	 * @param {string} dbPath - Path to the Spatialite database
	 * @param {object} params - Import parameters:
	 *   - xmlFilePath: string - Path to the ILI XML file
	 *   - routeId: number - Route/pipe ID
	 *   - kmStart: string - Start kilometer
	 *   - kmEnd: string - End kilometer
	 *   - date: string - Inspection date (DD.MM.YYYY)
	 *   - company: string - Vendor company
	 *   - format: string - Report format
	 *   - sourceGcl: string - Source GCL
	 *   - model: string - Tool model
	 * @returns {Promise<{inspectionId: number, defectCount: number}>}
	 */
	ipcMain.handle('ili-import-xml', async (event, dbPath, params) => {
		console.log('[ILI Import IPC] Starting import...');
		console.log('[ILI Import IPC] DB:', dbPath);
		console.log('[ILI Import IPC] XML:', params.xmlFilePath);

		const db = await getDatabase(dbPath);
		const sqlQueriesDir = path.join(getAppDataPath(), 'Project', 'SqlQueries');

		if (!fs.existsSync(sqlQueriesDir)) {
			throw new Error(`SqlQueries directory not found: ${sqlQueriesDir}`);
		}

		const result = await runIliImport(db, params, sqlQueriesDir, (step, message, percent) => {
			// Send progress events to the renderer
			try {
				event.sender.send('ili-import-progress', { step, message, percent });
			} catch {
				// Sender may be destroyed if window was closed
			}
		});

		console.log('[ILI Import IPC] Import complete:', result);
		return result;
	});

	/**
	 * IPC: ili-get-routes
	 * Get available routes for the import dialog dropdown.
	 */
	ipcMain.handle('ili-get-routes', async (event, dbPath) => {
		const db = await getDatabase(dbPath);
		return new Promise((resolve, reject) => {
			db.all(
				// NOTE: pods_route does not have a line_id column (only id, type_cl,
				// description, station_begin, station_end) — removed line_id from SELECT
				// to fix: SQLITE_ERROR: no such column: line_id
				`SELECT id AS route_id,
				 COALESCE(description, 'Route ' || id) AS description
				 FROM pods_route
				 ORDER BY description`,
				[],
				(err, rows) => {
					if (err) reject(err);
					else resolve(rows || []);
				}
			);
		});
	});

	/**
	 * IPC: ili-get-routes-by-type
	 * Get available routes filtered by type_cl for the import dialog.
	 * Query: SELECT description, station_begin, station_end FROM pods_route
	 *        WHERE type_cl = ? ORDER BY description, station_begin
	 *
	 * @param {string} dbPath - Path to the Spatialite database
	 * @param {string} typeCl - Route type classifier (e.g. 'ROUTE_TYPE_10')
	 * @returns {Promise<Array<{route_id: number, description: string, station_begin: number, station_end: number}>>}
	 */
	ipcMain.handle('ili-get-routes-by-type', async (event, dbPath, typeCl) => {
		const db = await getDatabase(dbPath);
		return new Promise((resolve, reject) => {
			db.all(
				`SELECT id AS route_id,
				 COALESCE(description, 'Route ' || id) AS description,
				 station_begin,
				 station_end
				 FROM pods_route
				 WHERE type_cl = ?
				 ORDER BY description, station_begin`,
				[typeCl],
				(err, rows) => {
					if (err) reject(err);
					else resolve(rows || []);
				}
			);
		});
	});

	/**
	 * IPC: ili-check-existing
	 * Check if ILI inspection data already exists for a given route.
	 * Returns an array of existing inspections (empty if none).
	 *
	 * @param {string} dbPath - Path to the Spatialite database
	 * @param {number} routeId - Route/pipe ID to check
	 * @returns {Promise<Array<{ili_inspection_id: number, description: string, begin_date: string}>>}
	 */
	ipcMain.handle('ili-check-existing', async (event, dbPath, routeId) => {
		const db = await getDatabase(dbPath);
		return new Promise((resolve, reject) => {
			// Log ALL inspections in DB for diagnostics
			db.all(
				`SELECT ili_inspection_id, route_id, description, begin_date FROM sgio_ili_inspection ORDER BY ili_inspection_id`,
				[],
				(err, allRows) => {
					if (err) console.error('[ILI Check] Failed to query all inspections:', err);
					else console.log('[ILI Check] ALL inspections in DB:', JSON.stringify(allRows));
				}
			);
			db.all(
				`SELECT COUNT(*) as cnt FROM sgio_ili_data`,
				[],
				(err, cntRows) => {
					if (err) console.error('[ILI Check] Failed to count sgio_ili_data:', err);
					else console.log('[ILI Check] Total rows in sgio_ili_data:', cntRows?.[0]?.cnt);
				}
			);
			db.all(
				`SELECT ili_inspection_id, description, begin_date, comments, source_gcl
				 FROM sgio_ili_inspection
				 WHERE route_id = ?
				 ORDER BY ili_inspection_id`,
				[routeId],
				(err, rows) => {
					if (err) reject(err);
					else resolve(rows || []);
				}
			);
		});
	});

	/**
	 * IPC: ili-delete-inspection
	 * Delete an existing ILI inspection and all related data.
	 * Removes records from sgio_ili_data, sgio_ili_pipe_length, and sgio_ili_inspection.
	 *
	 * @param {string} dbPath - Path to the Spatialite database
	 * @param {number} inspectionId - The inspection ID to delete
	 * @returns {Promise<{deleted: boolean}>}
	 */
	ipcMain.handle('ili-delete-inspection', async (event, dbPath, inspectionId) => {
		const db = await getDatabase(dbPath);

		const run = (sql, params) => new Promise((resolve, reject) => {
			db.run(sql, params, function (err) {
				if (err) reject(err);
				else resolve(this.changes);
			});
		});

		const getCount = (table) => new Promise((resolve, reject) => {
			db.get(
				`SELECT COUNT(*) as cnt FROM ${table} WHERE ili_inspection_id = ?`,
				[inspectionId],
				(err, row) => err ? reject(err) : resolve(row?.cnt ?? 0)
			);
		});

		console.log(`[ILI Delete] Deleting inspection ${inspectionId}... dbPath=${dbPath}`);

		const dataCountBefore = await getCount('sgio_ili_data');
		const pipeCountBefore = await getCount('sgio_ili_pipe_length');
		console.log(`[ILI Delete] Rows BEFORE delete — sgio_ili_data: ${dataCountBefore}, sgio_ili_pipe_length: ${pipeCountBefore}`);

		const dataDeleted = await run(
			'DELETE FROM sgio_ili_data WHERE ili_inspection_id = ?', [inspectionId]
		);
		console.log(`[ILI Delete] Deleted ${dataDeleted} rows from sgio_ili_data`);

		const pipeLenDeleted = await run(
			'DELETE FROM sgio_ili_pipe_length WHERE ili_inspection_id = ?', [inspectionId]
		);
		console.log(`[ILI Delete] Deleted ${pipeLenDeleted} rows from sgio_ili_pipe_length`);

		const inspDeleted = await run(
			'DELETE FROM sgio_ili_inspection WHERE ili_inspection_id = ?', [inspectionId]
		);
		console.log(`[ILI Delete] Deleted ${inspDeleted} rows from sgio_ili_inspection`);

		const dataCountAfter = await getCount('sgio_ili_data');
		const pipeCountAfter = await getCount('sgio_ili_pipe_length');
		console.log(`[ILI Delete] Rows AFTER delete — sgio_ili_data: ${dataCountAfter}, sgio_ili_pipe_length: ${pipeCountAfter}`);

		return { deleted: true };
	});

	/**
		* IPC: ili-delete-all
		* Delete ALL ILI data from ALL routes/inspections.
		* Used before a fresh import to ensure no stale data remains.
		*
		* @param {string} dbPath - Path to the Spatialite database
		* @returns {Promise<{deleted: boolean, counts: object}>}
		*/
	ipcMain.handle('ili-delete-all', async (event, dbPath) => {
		const db = await getDatabase(dbPath);

		const run = (sql) => new Promise((resolve, reject) => {
			db.run(sql, [], function (err) {
				if (err) reject(err);
				else resolve(this.changes);
			});
		});

		console.log('[ILI Delete All] Deleting ALL ILI data...');

		const dataDeleted = await run('DELETE FROM sgio_ili_data');
		console.log(`[ILI Delete All] Deleted ${dataDeleted} rows from sgio_ili_data`);

		const pipeLenDeleted = await run('DELETE FROM sgio_ili_pipe_length');
		console.log(`[ILI Delete All] Deleted ${pipeLenDeleted} rows from sgio_ili_pipe_length`);

		const inspDeleted = await run('DELETE FROM sgio_ili_inspection');
		console.log(`[ILI Delete All] Deleted ${inspDeleted} rows from sgio_ili_inspection`);

		console.log('[ILI Delete All] Done.');
		return { deleted: true, counts: { data: dataDeleted, pipeLength: pipeLenDeleted, inspection: inspDeleted } };
	});
}
