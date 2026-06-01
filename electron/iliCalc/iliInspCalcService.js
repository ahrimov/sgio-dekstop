import { dbReader, dbWriter } from '../sqlQueryEngine/dbExecutor.js';
import { IliInspCalc } from './iliInspCalc.js';
import { buildPiketTable } from './routeGeometry.js';

/**
 * IliInspCalcService — orchestrates the coordinate calculation for ILI defects.
 *
 * Ported from server/baseserver_ute-master/src/service/ute/ili/ili-insp-calc/IliInspCalcService.js
 *
 * Steps:
 * 1. Load defect data with odometers (CALC_CALC_DEF_1)
 * 2. Load route geometry + markers + valves (JS queries)
 * 3. Build PIKET table using routeGeometry.js (replaces CALC_CALC_DEF_2)
 * 4. Run IliInspCalc.process(ds) algorithm
 * 5. Write calculated coordinates (CALC_CALC_DEF_3 via dbWriter)
 * 6. Load pipe lengths (CALC_CALC_DEF_5)
 * 7. Update pipe length coordinates (CALC_CALC_DEF_7 via dbWriter)
 */
export async function processIliInspCalc(db, params, sqlQueriesDir, onProgress) {
	const { P_REPORT_ID, P_ROUTE_ID, ROUTE_STATION_BEGIN_KM } = params;

	console.log(`[IliInspCalcService] ▶ START — inspectionId=${P_REPORT_ID}, routeId=${P_ROUTE_ID}, routeStationBeginKm=${ROUTE_STATION_BEGIN_KM}`);
	onProgress && onProgress('Загрузка данных дефектов...', 5);

	// Step 1: Load defect data
	const dataResult = await dbReader(db, 'UTE_SEM.xml#CALC_CALC_DEF_1', { P_REPORT_ID }, sqlQueriesDir);
	const dataRows = dataResult.rows;
	console.log(`[IliInspCalcService] Step 1 — Loaded ${dataRows.length} defect rows`);
	if (dataRows.length > 0) {
		const sample = dataRows.slice(0, 3).map(r => `id=${r.ILI_DATA_ID} odom=${r.ABSOLUTE_ODOMETER} measure=${r.MEASURE}`);
		console.log(`[IliInspCalcService] Step 1 — Sample rows: ${sample.join(' | ')}`);
	}

	if (dataRows.length === 0) {
		console.warn('[IliInspCalcService] ⚠ Step 1 — No defect data found for inspectionId=' + P_REPORT_ID + '. Geometry will NOT be created.');
		return;
	}

	onProgress && onProgress('Загрузка геометрии маршрута...', 15);

	// Step 2: Load route geometry
	console.log(`[IliInspCalcService] Step 2 — Loading route geometry for routeId=${P_ROUTE_ID}...`);
	const routeResult = await dbReader(db, 'UTE_SEM.xml#CALC_ROUTE_GEOMETRY', { P_ROUTE_ID }, sqlQueriesDir);
	const routeRow = routeResult.rows[0];
	if (!routeRow || !routeRow.GEOM) {
		console.warn(`[IliInspCalcService] ⚠ Step 2 — No route geometry found for routeId=${P_ROUTE_ID}. Geometry will NOT be created.`);
		console.warn(`[IliInspCalcService] ⚠ Step 2 — routeResult.rows.length=${routeResult.rows.length}, routeRow=${JSON.stringify(routeRow)}`);
		return;
	}
	const geomPreview = routeRow.GEOM ? routeRow.GEOM.substring(0, 120) + '...' : 'null';
	console.log(`[IliInspCalcService] Step 2 — Route geometry found. Preview: ${geomPreview}`);

	onProgress && onProgress('Загрузка маркеров и задвижек...', 25);

	// Step 3: Load markers, valves, and fixed repers
	const markersResult = await dbReader(db, 'UTE_SEM.xml#CALC_MARKERS_FOR_ROUTE', {}, sqlQueriesDir);
	const valvesResult = await dbReader(db, 'UTE_SEM.xml#CALC_VALVES_FOR_ROUTE', {}, sqlQueriesDir);
	const fixedRepersResult = await dbReader(db, 'UTE_SEM.xml#CALC_ILI_FIXED_REPERS', { P_REPORT_ID }, sqlQueriesDir);

	console.log(`[IliInspCalcService] Step 3 — Markers: ${markersResult.rows.length}, Valves: ${valvesResult.rows.length}, Fixed repers: ${fixedRepersResult.rows.length}`);
	if (markersResult.rows.length > 0) {
		const mSample = markersResult.rows.slice(0, 3).map(r => `id=${r.STATION_ID} station=${r.STATION} geom=${r.GEOM ? r.GEOM.substring(0, 40) : 'null'}`);
		console.log(`[IliInspCalcService] Step 3 — Marker sample: ${mSample.join(' | ')}`);
	} else {
		console.warn('[IliInspCalcService] ⚠ Step 3 — No markers found. Coordinate interpolation will rely on route backbone only.');
	}

	onProgress && onProgress('Построение таблицы пикетов...', 35);

	// Step 4: Build PIKET table (replaces CALC_CALC_DEF_2)
	console.log('[IliInspCalcService] Step 4 — Building PIKET table...');
	const piketTab = buildPiketTable({
		routeGeomWkt: routeRow.GEOM,
		markers: markersResult.rows,
		valves: valvesResult.rows,
		fixedRepers: fixedRepersResult.rows,
		mode: 'piket',
	});
	console.log(`[IliInspCalcService] Step 4 — PIKET table built: ${piketTab.rows.length} rows`);
	if (piketTab.rows.length === 0) {
		console.warn('[IliInspCalcService] ⚠ Step 4 — PIKET table is EMPTY. Geometry will NOT be created.');
		return;
	}
	if (piketTab.rows.length > 0) {
		const pSample = piketTab.rows.slice(0, 3).map(r => `measure=${r.MEASURE?.toFixed(1)} x=${r.X?.toFixed(5)} y=${r.Y?.toFixed(5)}`);
		console.log(`[IliInspCalcService] Step 4 — PIKET sample: ${pSample.join(' | ')}`);
	}

	onProgress && onProgress('Расчёт координат дефектов...', 45);

	// Step 5: Run IliInspCalc algorithm
	console.log('[IliInspCalcService] Step 5 — Running IliInspCalc.process()...');
	const ds = {
		Tables: {
			DATA: { rows: dataRows },
			PIKET: piketTab,
		},
	};

	const resTab = IliInspCalc.process(ds, { routeStationBeginKm: ROUTE_STATION_BEGIN_KM });
	console.log(`[IliInspCalcService] Step 5 — IliInspCalc produced ${resTab.rows.length} coordinate rows`);

	if (resTab.rows.length === 0) {
		console.warn('[IliInspCalcService] ⚠ Step 5 — IliInspCalc returned 0 rows. Geometry will NOT be written to DB.');
		console.warn(`[IliInspCalcService] ⚠ Step 5 — Input: ${dataRows.length} defects, ${piketTab.rows.length} piket rows`);
		return;
	}

	// Log sample of calculated coordinates
	const coordSample = resTab.rows.slice(0, 5).map(r =>
		`id=${r.ILI_DATA_ID} x=${parseFloat(r.X)?.toFixed(5)} y=${parseFloat(r.Y)?.toFixed(5)} measure=${parseFloat(r.MEASURE)?.toFixed(1)}`
	);
	console.log(`[IliInspCalcService] Step 5 — Coordinate sample: ${coordSample.join(' | ')}`);

	// Count rows with valid coordinates (X/Y are strings from IliInspCalc)
	const validCoords = resTab.rows.filter(r => {
		const x = parseFloat(r.X);
		const y = parseFloat(r.Y);
		return !isNaN(x) && !isNaN(y) && x !== 0 && y !== 0;
	});
	console.log(`[IliInspCalcService] Step 5 — Rows with valid (non-null, non-zero) coordinates: ${validCoords.length}/${resTab.rows.length}`);

	onProgress && onProgress('Запись координат в базу данных...', 60);

	// Step 6: Write calculated coordinates (CALC_CALC_DEF_3)
	console.log(`[IliInspCalcService] Step 6 — Writing ${resTab.rows.length} coordinate rows to DB...`);
	await dbWriter(
		db,
		'UTE_SEM.xml#CALC_CALC_DEF_3',
		'insert',
		resTab.rows,
		{ P_REPORT_ID },
		sqlQueriesDir,
		(current, total) => {
			if (current % 100 === 0 || current === total) {
				const pct = 60 + Math.round((current / total) * 20);
				onProgress && onProgress(`Запись координат (${current}/${total})...`, pct);
			}
		}
	);
	console.log(`[IliInspCalcService] Step 6 — Coordinate write complete`);

	onProgress && onProgress('Обновление длин труб...', 82);

	// Step 7: Load pipe lengths and update their coordinates
	const pipeLenResult = await dbReader(db, 'UTE_SEM.xml#CALC_CALC_DEF_5', { P_REPORT_ID }, sqlQueriesDir);
	console.log(`[IliInspCalcService] Step 7 — Pipe lengths loaded: ${pipeLenResult.rows.length}`);

	if (pipeLenResult.rows.length > 0) {
		console.log(`[IliInspCalcService] Step 7 — Writing pipe length coordinates...`);
		await dbWriter(
			db,
			'UTE_SEM.xml#CALC_CALC_DEF_7',
			'insert',
			pipeLenResult.rows,
			{ P_REPORT_ID },
			sqlQueriesDir
		);
		console.log(`[IliInspCalcService] Step 7 — Pipe length coordinates written`);
	} else {
		console.warn('[IliInspCalcService] ⚠ Step 7 — No pipe lengths found. Pipe length geometry will be empty.');
	}

	onProgress && onProgress('Расчёт координат завершён', 100);
	console.log('[IliInspCalcService] ✔ Coordinate calculation complete');
}
