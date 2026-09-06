import { ipcMain } from 'electron';
import path from 'path';
import { dbCommand, dbAll } from '../sqlQueryEngine/dbExecutor.js';
import { getAppDataPath } from './pathHandlers.js';
import { getOpenDatabase } from './dbHandlers.js';

/**
 * IPC handlers for virtual reper (виртуальный репер) CRUD operations.
 * All SQL operations use the SGIO_VIRT_MARKER#* queries from UTE_SEM.xml.
 * After each mutation the renderer fires a recalculation without reper linking.
 */
export function registerVirtMarkerIpc() {
	/**
	 * IPC: ili-virt-marker-insert
	 * Inserts a new virtual reper into sgio_ili_data.
	 * 1. Gets ili_inspection_id from the DB (LIMIT 1 — single inspection per project).
	 * 2. Deletes nearby duplicate virtual repers (dedup).
	 * 3. Inserts the new record.
	 *
	 * @param {string} dbPath
	 * @param {object} params
	 *   x               {number} WGS84 longitude of projected point
	 *   y               {number} WGS84 latitude of projected point
	 *   vMeasure        {number} Geodetic measure along route (m)
	 *   weldNumber      {string} [optional]
	 *   absoluteOdometer {number|null} [optional]
	 *   description     {string} [optional]
	 */
	ipcMain.handle('ili-virt-marker-insert', async (event, dbPath, params) => {
		console.log('[VirtMarker IPC] INSERT params:', params);

		const db = getOpenDatabase(dbPath);
		if (!db) {
			throw new Error('Database not open. Please open the project first.');
		}

		const sqlQueriesDir = path.join(getAppDataPath(), 'Project', 'SqlQueries');

		// Fetch the inspection ID (there is always exactly one inspection per project DB)
		const inspRows = await dbAll(
			db,
			'SELECT ili_inspection_id FROM sgio_ili_inspection ORDER BY ili_inspection_id LIMIT 1'
		);
		if (!inspRows || inspRows.length === 0) {
			throw new Error('No ILI inspection found in sgio_ili_inspection');
		}
		const inspectionId = inspRows[0].ili_inspection_id;
		console.log('[VirtMarker IPC] Using inspectionId:', inspectionId);

		// Step 1: Remove any nearby duplicate virtual repers
		await dbCommand(
			db,
			'UTE_SEM.xml#SGIO_VIRT_MARKER#delete-dupes',
			'update',
			{
				ABSOLUTE_ODOMETER: params.absoluteOdometer ?? 0,
				V_MEASURE: params.vMeasure,
			},
			sqlQueriesDir
		);

		// Step 2: Insert the new virtual reper
		await dbCommand(
			db,
			'UTE_SEM.xml#SGIO_VIRT_MARKER#insert',
			'insert',
			{
				X: params.x,
				Y: params.y,
				V_MEASURE: params.vMeasure,
				WELD_NUMBER: params.weldNumber ?? '',
				ABSOLUTE_ODOMETER: params.absoluteOdometer ?? '',
				DESCRIPTION: params.description ?? '',
				ILI_INSPECTION_ID: inspectionId,
				ANOMALY_TYPE_CL: params.anomalyTypeCl ?? 1003,
			},
			sqlQueriesDir
		);

		console.log('[VirtMarker IPC] INSERT done');
		return { success: true };
	});

	/**
	 * IPC: ili-virt-marker-update
	 * Updates attributes and position of an existing virtual reper.
	 *
	 * @param {string} dbPath
	 * @param {object} params
	 *   id              {number} ili_data_id primary key
	 *   x               {number} WGS84 longitude
	 *   y               {number} WGS84 latitude
	 *   vMeasure        {number} New geodetic measure
	 *   weldNumber      {string}
	 *   absoluteOdometer {number|null}
	 *   description     {string}
	 */
	ipcMain.handle('ili-virt-marker-update', async (event, dbPath, params) => {
		console.log('[VirtMarker IPC] UPDATE params:', params);

		const db = getOpenDatabase(dbPath);
		if (!db) {
			throw new Error('Database not open. Please open the project first.');
		}

		const sqlQueriesDir = path.join(getAppDataPath(), 'Project', 'SqlQueries');

		await dbCommand(
			db,
			'UTE_SEM.xml#SGIO_VIRT_MARKER#update',
			'update',
			{
				ID: params.id,
				X: params.x,
				Y: params.y,
				V_MEASURE: params.vMeasure,
				ANOMALY_TYPE_CL: params.anomalyTypeCl ?? 1003,
				WELD_NUMBER: params.weldNumber ?? '',
				ABSOLUTE_ODOMETER: params.absoluteOdometer ?? '',
				DESCRIPTION: params.description ?? '',
			},
			sqlQueriesDir
		);

		console.log('[VirtMarker IPC] UPDATE done');
		return { success: true };
	});

	/**
	 * IPC: ili-virt-marker-delete
	 * Soft-deletes a virtual reper: sets control_point_lf='N', clears its
	 * reference event, calibrated measure, and certainty interval.
	 * Does NOT physically delete the row.
	 *
	 * @param {string} dbPath
	 * @param {object} params
	 *   id {number} ili_data_id primary key
	 */
	ipcMain.handle('ili-virt-marker-delete', async (event, dbPath, params) => {
		console.log('[VirtMarker IPC] DELETE params:', params);

		const db = getOpenDatabase(dbPath);
		if (!db) {
			throw new Error('Database not open. Please open the project first.');
		}
		const markerId = Number(params.id);
		if (!Number.isFinite(markerId)) {
			throw new Error('Invalid virtual reper ID');
		}

		const sqlQueriesDir = path.join(getAppDataPath(), 'Project', 'SqlQueries');

		const result = await dbCommand(
			db,
			'UTE_SEM.xml#SGIO_VIRT_MARKER#delete',
			'update',
			{ ID: markerId },
			sqlQueriesDir
		);
		if (result.changes !== 1) {
			throw new Error(`Virtual reper ${markerId} was not found`);
		}

		// Explicit aliases keep result keys stable for databases with uppercase column names.
		const rows = await dbAll(
			db,
			`SELECT control_point_lf AS control_point_lf, ref_event_id AS ref_event_id
			 FROM sgio_ili_data WHERE ili_data_id = ${markerId}`
		);
		const deletedReper = rows[0];
		if (
			!deletedReper ||
			deletedReper.control_point_lf !== 'N' ||
			deletedReper.ref_event_id != null
		) {
			throw new Error(`Virtual reper ${markerId} was not detached`);
		}

		console.log('[VirtMarker IPC] DELETE (soft) done:', deletedReper);
		return { success: true };
	});
}
