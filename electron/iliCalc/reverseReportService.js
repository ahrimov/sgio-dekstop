import { dbCommand, dbAll, beginTransaction, commitTransaction, rollbackTransaction } from '../sqlQueryEngine/dbExecutor.js';
import { runCoordinateCalc } from './coordinateCalcService.js';

/**
 * Reversal service for ILI inspection reports ("Разворот отчета ВТД").
 *
 * The reversal formula is:  new_value = ABS(old_value - MAX(absolute_odometer))
 * This operation is self-inverse (idempotent undo): applying it twice returns
 * all odometer values to their original state.
 *
 * Steps:
 *  1. Validate the inspection exists
 *  2. BEGIN TRANSACTION
 *  3. VTD_CORR_REVERSE_1 — reverse sgio_ili_data odometers
 *  4. VTD_CORR_REVERSE_2 — reverse sgio_ili_pipe_length odometers + swap start/end coords
 *  5. COMMIT
 *  6. runCoordinateCalc — recalculate geographic coordinates
 *
 * @param {object} db - Spatialite database instance
 * @param {object} params - (currently unused — inspection is resolved automatically)
 * @param {string} sqlQueriesDir - Path to SqlQueries directory
 * @param {function} onProgress - Progress callback (step, message, percent)
 * @returns {Promise<{success: boolean, message: string, inspectionId: number}>}
 */
export async function runReverseReport(db, params, sqlQueriesDir, onProgress) {
 const progress = (step, message, percent) => {
 	console.log(`[ReverseReport] Step ${step}: ${message} (${percent}%)`);
 	if (onProgress) onProgress(step, message, percent);
 };

 console.log(`[ReverseReport] ▶ START runReverseReport`);
 progress(1, 'Проверка данных отчёта...', 2);

 // Step 1: Resolve the single inspection in the database
 const rows = await dbAll(
 	db,
 	`SELECT ili_inspection_id, route_id FROM sgio_ili_inspection ORDER BY ili_inspection_id LIMIT 1`
 );

 if (!rows || rows.length === 0) {
 	throw new Error('В базе данных нет отчётов ВТД для разворота');
 }

 const inspectionId = rows[0].ili_inspection_id;
 const routeId = rows[0].route_id;

 if (!routeId) {
 	throw new Error(`Отчёт ВТД ID=${inspectionId} не привязан к маршруту (route_id = NULL)`);
 }

 console.log(`[ReverseReport] Inspection ${inspectionId} → Route ${routeId}`);

	// Step 2: Count rows to be reversed (for logging)
	const countCheck = await dbAll(
		db,
		`SELECT COUNT(*) AS cnt FROM sgio_ili_data WHERE ili_inspection_id = ${inspectionId}`
	);
	const dataRowCount = countCheck[0]?.cnt ?? 0;

	const pipeCheck = await dbAll(
		db,
		`SELECT COUNT(*) AS cnt FROM sgio_ili_pipe_length WHERE ili_inspection_id = ${inspectionId}`
	);
	const pipeRowCount = pipeCheck[0]?.cnt ?? 0;

	console.log(`[ReverseReport] Rows to reverse: sgio_ili_data=${dataRowCount}, sgio_ili_pipe_length=${pipeRowCount}`);

	progress(2, 'Разворот одометрических данных...', 10);

	// Step 3: Execute reversal inside a transaction
	await beginTransaction(db);
	try {
		// VTD_CORR_REVERSE_1: reverse sgio_ili_data odometers
		const result1 = await dbCommand(
			db,
			'UTE_SEM.xml#VTD_CORR_REVERSE_1',
			'insert',
			{ ILI_INSPECTION_ID: inspectionId },
			sqlQueriesDir
		);
		console.log(`[ReverseReport] VTD_CORR_REVERSE_1 done — changes=${result1.changes}`);

		progress(3, 'Разворот данных труб...', 40);

		// VTD_CORR_REVERSE_2: reverse sgio_ili_pipe_length odometers + swap start/end coords
		const result2 = await dbCommand(
			db,
			'UTE_SEM.xml#VTD_CORR_REVERSE_2',
			'insert',
			{ ILI_INSPECTION_ID: inspectionId },
			sqlQueriesDir
		);
		console.log(`[ReverseReport] VTD_CORR_REVERSE_2 done — changes=${result2.changes}`);

		await commitTransaction(db);
		console.log(`[ReverseReport] ✔ Transaction committed`);
	} catch (err) {
		console.error(`[ReverseReport] ✖ Error during reversal, rolling back:`, err);
		await rollbackTransaction(db);
		throw err;
	}

	progress(4, 'Пересчёт координат дефектов...', 55);

	// Step 4: Recalculate geographic coordinates after reversal
	await runCoordinateCalc(db, { inspectionId }, sqlQueriesDir, (step, message, percent) => {
		// Map coordinate calc progress (0–100%) into our 55–98% range
		progress(4, message, Math.round(55 + percent * 0.43));
	});

	progress(5, 'Разворот отчёта завершён!', 100);
	console.log(`[ReverseReport] ✔ runReverseReport COMPLETE — inspectionId=${inspectionId}`);

	return {
		success: true,
		message: `Разворот отчёта ВТД выполнен для инспекции ${inspectionId}`,
		inspectionId,
	};
}
