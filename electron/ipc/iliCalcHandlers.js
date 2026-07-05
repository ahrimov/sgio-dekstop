import { ipcMain } from 'electron';
import path from 'path';
import { runCoordinateCalc, runCoordinateCalcNoLink, projectPointOnRoute } from '../iliCalc/coordinateCalcService.js';
import { runReverseReport } from '../iliCalc/reverseReportService.js';
import { getAppDataPath } from './pathHandlers.js';
import { getOpenDatabase } from './dbHandlers.js';

/**
 * IPC handlers for ILI coordinate calculation.
 * Registers the 'ili-calc-coordinates' IPC channel.
 */
export function registerIliCalcIpc() {
	/**
	 * IPC: ili-calc-coordinates
	 * Runs the full coordinate calculation pipeline for an ILI inspection.
	 *
	 * @param {string} dbPath - Path to the Spatialite database
	 * @param {object} params
	 *   - inspectionId: number - ILI inspection ID to calculate coordinates for
	 * @returns {Promise<{success: boolean, message: string}>}
	 */
	ipcMain.handle('ili-calc-coordinates', async (event, dbPath, params) => {
		console.log('[ILI Calc IPC] Starting coordinate calculation...');
		console.log('[ILI Calc IPC] DB:', dbPath);
		console.log('[ILI Calc IPC] Inspection ID:', params.inspectionId);

		const db = getOpenDatabase(dbPath);
		if (!db) {
			throw new Error('Database not open. Please open the project first.');
		}

		const sqlQueriesDir = path.join(getAppDataPath(), 'Project', 'SqlQueries');

		const result = await runCoordinateCalc(db, params, sqlQueriesDir, (step, message, percent) => {
			try {
				event.sender.send('ili-calc-progress', { step, message, percent });
			} catch {
				// Sender may be destroyed if window was closed
			}
		});

		console.log('[ILI Calc IPC] Calculation complete:', result);
		return result;
	});

	/**
	 * IPC: ili-get-inspections
	 * Get list of ILI inspections for the calculation dialog.
	 */
	ipcMain.handle('ili-get-inspections', async (event, dbPath) => {
		const db = getOpenDatabase(dbPath);
		if (!db) {
			throw new Error('Database not open');
		}

		return new Promise((resolve, reject) => {
			db.all(
				`SELECT ili_inspection_id, date_collected, company, model,
				 km_start, km_end, route_id,
				 COALESCE(company || ' ' || COALESCE(model, ''), 'Inspection ' || ili_inspection_id) AS description
				 FROM sgio_ili_inspection
				 ORDER BY date_collected DESC, ili_inspection_id DESC`,
				[],
				(err, rows) => {
					if (err) reject(err);
					else resolve(rows || []);
				}
			);
		});
	});

	/**
	 * IPC: ili-reverse-report
	 * Reverses odometer values for an ILI inspection report and recalculates coordinates.
	 *
	 * @param {string} dbPath - Path to the Spatialite database
	 * @param {object} params
	 *   - inspectionId: number - ILI inspection ID to reverse
	 * @returns {Promise<{success: boolean, message: string, inspectionId: number}>}
	 */
	ipcMain.handle('ili-reverse-report', async (event, dbPath, params) => {
		console.log('[ILI Reverse IPC] Starting report reversal...');
		console.log('[ILI Reverse IPC] DB:', dbPath);
		console.log('[ILI Reverse IPC] Inspection ID:', params.inspectionId);

		const db = getOpenDatabase(dbPath);
		if (!db) {
			throw new Error('Database not open. Please open the project first.');
		}

		const sqlQueriesDir = path.join(getAppDataPath(), 'Project', 'SqlQueries');

		const result = await runReverseReport(db, params, sqlQueriesDir, (step, message, percent) => {
			try {
				event.sender.send('ili-reverse-progress', { step, message, percent });
			} catch {
				// Sender may be destroyed if window was closed
			}
		});

		console.log('[ILI Reverse IPC] Reversal complete:', result);
		return result;
	});

	/**
	 * IPC: ili-calc-coordinates-no-link
	 * Runs coordinate calculation WITHOUT the LinkRepers phase.
	 * Used after manual virtual reper changes.
	 */
	ipcMain.handle('ili-calc-coordinates-no-link', async (event, dbPath, params) => {
		console.log('[ILI Calc No-Link IPC] Starting coordinate calculation without reper linking...');
		const db = getOpenDatabase(dbPath);
		if (!db) {
			throw new Error('Database not open. Please open the project first.');
		}

		const sqlQueriesDir = path.join(getAppDataPath(), 'Project', 'SqlQueries');

		const result = await runCoordinateCalcNoLink(db, params, sqlQueriesDir, (step, message, percent) => {
			try {
				event.sender.send('ili-calc-progress', { step, message, percent });
			} catch {
				// Sender may be destroyed
			}
		});

		console.log('[ILI Calc No-Link IPC] Calculation complete:', result);
		return result;
	});

	/**
	 * IPC: ili-project-point-on-route
	 * Projects a WGS84 click point onto the route axis of the current inspection.
	 * Returns the geodetic measure (distance along route) and projected coordinates.
	 *
	 * @param {string} dbPath
	 * @param {{ x: number, y: number }} params - WGS84 longitude and latitude
	 */
	ipcMain.handle('ili-project-point-on-route', async (event, dbPath, params) => {
		console.log('[ILI Project Point IPC] Projecting point onto route:', params);
		const db = getOpenDatabase(dbPath);
		if (!db) {
			throw new Error('Database not open. Please open the project first.');
		}

		const result = await projectPointOnRoute(db, params);
		console.log('[ILI Project Point IPC] Result:', result);
		return result;
	});
}
