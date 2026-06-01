import { parseIliXmlFile } from './iliXmlParser.js';
import { checkAnomalyTypes, setWeldNums, getFirstWeldNumber } from './iliDataProcessor.js';
import {
	dbReader, dbCommand, dbWriter, dbAll,
	beginTransaction, commitTransaction, rollbackTransaction,
} from '../sqlQueryEngine/dbExecutor.js';

// ─── Geometry audit helper ────────────────────────────────────────────────────
/**
 * Log a summary of x_coord/y_coord population for a given inspection.
 * Call this after import and after coordinate calc to track geometry creation.
 */
async function logGeometryAudit(db, inspectionId, label) {
	try {
		const rows = await dbAll(
			db,
			`SELECT
				COUNT(*) AS total,
				SUM(CASE WHEN x_coord IS NOT NULL AND y_coord IS NOT NULL THEN 1 ELSE 0 END) AS with_coords,
				SUM(CASE WHEN x_coord IS NULL OR  y_coord IS NULL THEN 1 ELSE 0 END) AS without_coords,
				SUM(CASE WHEN anomaly_type_cl = 5001 THEN 1 ELSE 0 END) AS weld_rows,
				SUM(CASE WHEN anomaly_type_cl != 5001 AND anomaly_type_cl IS NOT NULL THEN 1 ELSE 0 END) AS defect_rows
			FROM sgio_ili_data
			WHERE ili_inspection_id = ${inspectionId}`
		);
		const r = rows[0] || {};
		console.log(
			`[ILI Geometry Audit][${label}] inspectionId=${inspectionId}` +
			` | total=${r.total} | with_coords=${r.with_coords} | without_coords=${r.without_coords}` +
			` | weld_rows=${r.weld_rows} | defect_rows=${r.defect_rows}`
		);

		// Also check pipe lengths
		const pipeRows = await dbAll(
			db,
			`SELECT COUNT(*) AS total,
				SUM(CASE WHEN x_coord_start IS NOT NULL THEN 1 ELSE 0 END) AS with_start,
				SUM(CASE WHEN x_coord_end IS NOT NULL THEN 1 ELSE 0 END) AS with_end
			FROM sgio_ili_pipe_length
			WHERE ili_inspection_id = ${inspectionId}`
		);
		const p = pipeRows[0] || {};
		console.log(
			`[ILI Geometry Audit][${label}] sgio_ili_pipe_length` +
			` | total=${p.total} | with_start_coord=${p.with_start} | with_end_coord=${p.with_end}`
		);
	} catch (err) {
		console.warn(`[ILI Geometry Audit][${label}] Failed to run audit: ${err.message}`);
	}
}

/**
 * Main ILI XML import orchestrator.
 * Runs the full import pipeline in the Electron main process.
 *
 * Ported from server/baseserver_ute-master/src/service/ute/ili/ili-import-xml/IliImportXmlService.call()
 *
 * Pipeline steps:
 * 1. load_types        — Load anomaly type dictionary from DB
 * 2. sub_template      — Parse the ILI XML file
 * 3. check_anomaly_types — Validate anomaly types
 * 4. set_weld_nums     — Process weld numbers and distances
 * 5. get_first_weld_number — Find first weld number
 * 6. BEGIN TRANSACTION
 * 7. create_report     — Create inspection record in DB
 * 8. load_ili_data     — Insert all defect rows into DB
 * 9. prepare_data      — Fill anomaly_extension_cl
 * 10. set_weld_nums_old — Update weld distances via SQL
 * 11. prepare_pipe_len  — Generate pipe length records
 * 12. COMMIT TRANSACTION
 */

/**
 * @typedef {object} ImportParams
 * @property {string} xmlFilePath - Absolute path to the ILI XML file
 * @property {number|string} routeId - Route/pipe ID
 * @property {string} kmStart - Start kilometer
 * @property {string} kmEnd - End kilometer
 * @property {string} date - Inspection date (DD.MM.YYYY)
 * @property {string} [company='UNKNOWN'] - Vendor company
 * @property {string} [format='xml'] - Report format
 * @property {string} [sourceGcl=''] - Source GCL
 * @property {string} [model=''] - Tool model
 */

/**
 * Run the full ILI XML import pipeline.
 *
 * @param {object} db - Spatialite database instance
 * @param {ImportParams} params - Import parameters
 * @param {string} sqlQueriesDir - Absolute path to SqlQueries directory
 * @param {function} [onProgress] - Progress callback: (step, message, percent) => void
 * @returns {Promise<{inspectionId: number, defectCount: number}>}
 */
export async function runIliImport(db, params, sqlQueriesDir, onProgress) {
	const progress = (step, message, percent) => {
		console.log(`[ILI Import] Step ${step}: ${message} (${percent}%)`);
		if (onProgress) onProgress(step, message, percent);
	};

	const {
		xmlFilePath,
		routeId,
		kmStart,
		kmEnd,
		date,
		company = 'UNKNOWN',
		format = 'xml',
		sourceGcl = '',
		model = '',
	} = params;

	// ========== Step 1: Load anomaly types ==========
	progress(1, 'Загрузка справочника аномалий...', 5);
	const anomalyTypesResult = await dbReader(
		db, 'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_9', {}, sqlQueriesDir
	);
	const anomalyTypes = anomalyTypesResult.rows;

	// ========== Step 2: Parse ILI XML file ==========
	progress(2, 'Чтение XML файла...', 15);
	const parsed = await parseIliXmlFile(xmlFilePath);
	let iliRows = parsed.rows;
	const reportName = parsed.reportName || '';

	if (!iliRows || iliRows.length === 0) {
		throw new Error('XML файл не содержит данных о дефектах');
	}
	console.log(`Parsed ${iliRows.length} rows from XML`);

	// ========== Step 3: Check anomaly types ==========
	progress(3, 'Проверка типов аномалий...', 25);
	const checkResult = checkAnomalyTypes(iliRows, anomalyTypes);
	const anomalyTypesValid = checkResult === true;

	if (!anomalyTypesValid) {
		console.warn(`Anomaly type check warning: ${checkResult}`);
	}

	// ========== Step 4: Set weld numbers ==========
	progress(4, 'Простановка номеров швов...', 35);
	iliRows = setWeldNums(iliRows);

	// ========== Step 5: Get first weld number ==========
	progress(5, 'Определение первого шва...', 40);
	const firstWeldNumber = getFirstWeldNumber(iliRows);
	console.log(`First weld number: ${firstWeldNumber}`);

	// ========== Step 6: BEGIN TRANSACTION ==========
	progress(6, 'Начало транзакции...', 42);
	await beginTransaction(db);

	let inspectionId;
	try {
		// ========== Step 7: Create inspection report ==========
		progress(7, 'Создание записи отчета...', 45);
		const createParams = {
			DATE: date,
			MODEL: model,
			FORMAT: format,
			COMPANY: company,
			KM_START: kmStart,
			KM_END: kmEnd,
			FIRST_WELD_NUMBER: firstWeldNumber || '',
			ROUTE_ID: routeId,
			REPORT_NAME: reportName,
		};

		await dbCommand(db, 'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_7', 'update', createParams, sqlQueriesDir);

		// Get the auto-generated inspection ID
		const idRows = await dbAll(db, 'SELECT last_insert_rowid() AS ILI_INSPECTION_ID');
		inspectionId = idRows[0]?.ILI_INSPECTION_ID;

		if (!inspectionId) {
			throw new Error('Failed to get ILI_INSPECTION_ID after creating inspection record');
		}
		console.log(`Created inspection record: ILI_INSPECTION_ID = ${inspectionId}`);

		// ========== Step 8: Insert defect rows ==========
		progress(8, `Вставка дефектов (0/${iliRows.length})...`, 50);
		const baseInsertParams = {
			ILI_INSPECTION_ID: inspectionId,
			SOURCE_GCL: sourceGcl,
			DATE: date,
		};

		await dbWriter(
			db,
			'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_8',
			'insert',
			iliRows,
			baseInsertParams,
			sqlQueriesDir,
			(current, total) => {
				const pct = 50 + Math.round((current / total) * 25);
				if (current % 50 === 0 || current === total) {
					progress(8, `Вставка дефектов (${current}/${total})...`, pct);
				}
			}
		);

		// ========== Step 9: Fill anomaly_extension_cl ==========
		progress(9, 'Заполнение ANOMALY_EXTENSION_CL...', 78);
		await dbCommand(
			db, 'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_1', 'update',
			{ ILI_INSPECTION_ID: inspectionId }, sqlQueriesDir
		);

		// ========== Step 10: Set weld distances via SQL ==========
		progress(10, 'Простановка дистанций швов...', 85);
		await dbCommand(
			db, 'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_4', 'update',
			{ ILI_INSPECTION_ID: inspectionId }, sqlQueriesDir
		);
		await dbCommand(
			db, 'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_4b', 'update',
			{ ILI_INSPECTION_ID: inspectionId }, sqlQueriesDir
		);

		// ========== Step 11: Prepare pipe lengths ==========
		progress(11, 'Создание записей длин труб...', 92);
		await dbCommand(
			db, 'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_5', 'update',
			{ ILI_INSPECTION_ID: inspectionId }, sqlQueriesDir
		);

		// ========== Step 12: COMMIT ==========
		progress(12, 'Сохранение данных...', 98);
		await commitTransaction(db);

	} catch (err) {
		console.error('ILI Import error, rolling back:', err);
		try {
			await rollbackTransaction(db);
		} catch (rollbackErr) {
			console.error('Rollback failed:', rollbackErr);
		}
		throw err;
	}

	// ========== Post-import geometry audit ==========
	// At this point x_coord/y_coord are NULL — they are filled later by runCoordinateCalc.
	// This audit confirms raw data was inserted correctly before coordinate calc runs.
	await logGeometryAudit(db, inspectionId, 'after-import');

	progress(12, 'Импорт завершен!', 100);

	return {
		inspectionId,
		defectCount: iliRows.length,
	};
}
