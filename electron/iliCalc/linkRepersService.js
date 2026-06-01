import { dbReader, dbCommand } from '../sqlQueryEngine/dbExecutor.js';
import { LinkRepers } from './linkRepers.js';
import { buildPiketTable } from './routeGeometry.js';

/**
 * LinkRepersService — orchestrates the reper linking process.
 *
 * Ported from server/baseserver_ute-master/src/service/ute/ili/ili-insp-link/LinkRepersService.js
 *
 * Steps:
 * 1. Reset reper links (CALC_LINK_REPERS_4)
 * 2. Get route_id (ILI_ILI_INSP_PROC_C_1)
 * 3. Load ILI repers (CALC_LINK_REPERS_1)
 * 4. Load route geometry + markers + valves (JS queries)
 * 5. Build GP table using routeGeometry.js (replaces CALC_LINK_REPERS_2)
 * 6. Run LinkRepers.process(ds) algorithm
 * 7. For each result row, update control point (replaces CALC_LINK_REPERS_3)
 */
export async function processLinkRepers(db, params, sqlQueriesDir, onProgress) {
	const { P_REPORT_ID, P_ROUTE_ID } = params;

	console.log(`[LinkRepersService] ▶ START — inspectionId=${P_REPORT_ID}, routeId=${P_ROUTE_ID}`);
	onProgress && onProgress('Сброс привязки реперов...', 5);

	// Step 1: Reset reper links
	await dbCommand(db, 'UTE_SEM.xml#CALC_LINK_REPERS_4', 'update', { P_REPORT_ID }, sqlQueriesDir);
	console.log('[LinkRepersService] Step 1 — Reset reper links done');

	onProgress && onProgress('Загрузка реперов ВТД...', 15);

	// Step 2: Load ILI repers from the inspection data
	const repResult = await dbReader(db, 'UTE_SEM.xml#CALC_LINK_REPERS_1', { P_REPORT_ID }, sqlQueriesDir);
	const repRows = repResult.rows;
	console.log(`[LinkRepersService] Step 2 — Loaded ${repRows.length} ILI repers (anomaly_type_cl IN 1003,1004,1007,1008)`);
	if (repRows.length > 0) {
		const rSample = repRows.slice(0, 5).map(r => `id=${r.OBJ_ID} odom=${r.LINE_COORD} cls=${r.OBJ_CLS_ID}`);
		console.log(`[LinkRepersService] Step 2 — Reper sample: ${rSample.join(' | ')}`);
	}

	if (repRows.length < 2) {
		console.warn(`[LinkRepersService] ⚠ Step 2 — Only ${repRows.length} reper(s) found (need ≥2). Reper linking SKIPPED.`);
		console.warn('[LinkRepersService] ⚠ Step 2 — This means no control points will be set, and coordinate interpolation may be inaccurate.');
		return;
	}

	onProgress && onProgress('Загрузка геометрии маршрута...', 25);

	// Step 3: Load route geometry
	console.log(`[LinkRepersService] Step 3 — Loading route geometry for routeId=${P_ROUTE_ID}...`);
	const routeResult = await dbReader(db, 'UTE_SEM.xml#CALC_ROUTE_GEOMETRY', { P_ROUTE_ID }, sqlQueriesDir);
	const routeRow = routeResult.rows[0];
	if (!routeRow || !routeRow.GEOM) {
		console.warn(`[LinkRepersService] ⚠ Step 3 — No route geometry for routeId=${P_ROUTE_ID}. Reper linking SKIPPED.`);
		console.warn(`[LinkRepersService] ⚠ Step 3 — routeResult rows: ${routeResult.rows.length}, routeRow: ${JSON.stringify(routeRow)}`);
		return;
	}
	const geomPreview = routeRow.GEOM.substring(0, 120) + '...';
	console.log(`[LinkRepersService] Step 3 — Route geometry found. Preview: ${geomPreview}`);

	onProgress && onProgress('Загрузка маркеров и задвижек...', 35);

	// Step 4: Load markers and valves
	const markersResult = await dbReader(db, 'UTE_SEM.xml#CALC_MARKERS_FOR_ROUTE', {}, sqlQueriesDir);
	const valvesResult = await dbReader(db, 'UTE_SEM.xml#CALC_VALVES_FOR_ROUTE', {}, sqlQueriesDir);
	const fixedRepersResult = await dbReader(db, 'UTE_SEM.xml#CALC_ILI_FIXED_REPERS', { P_REPORT_ID }, sqlQueriesDir);

	console.log(`[LinkRepersService] Step 4 — Markers: ${markersResult.rows.length}, Valves: ${valvesResult.rows.length}, Fixed repers: ${fixedRepersResult.rows.length}`);
	if (markersResult.rows.length === 0) {
		console.warn('[LinkRepersService] ⚠ Step 4 — No markers in DB. Reper linking will use route backbone only.');
	}

	onProgress && onProgress('Построение таблицы пикетов...', 45);

	// Step 5: Build GP table (replaces CALC_LINK_REPERS_2)
	console.log('[LinkRepersService] Step 5 — Building GP table (mode=gp)...');
	const gpTab = buildPiketTable({
		routeGeomWkt: routeRow.GEOM,
		markers: markersResult.rows,
		valves: valvesResult.rows,
		fixedRepers: fixedRepersResult.rows,
		mode: 'gp',
	});
	console.log(`[LinkRepersService] Step 5 — GP table built: ${gpTab.rows.length} rows`);
	if (gpTab.rows.length === 0) {
		console.warn('[LinkRepersService] ⚠ Step 5 — GP table is EMPTY. Reper linking SKIPPED.');
		return;
	}

	onProgress && onProgress('Привязка реперов...', 55);

	// Step 6: Run LinkRepers algorithm
	console.log('[LinkRepersService] Step 6 — Running LinkRepers.process()...');
	const ds = {
		Tables: {
			REP: { rows: repRows },
			GP: gpTab,
		},
	};

	const resRep = LinkRepers.process(ds);
	console.log(`[LinkRepersService] Step 6 — LinkRepers linked ${resRep.rows.length} repers`);
	if (resRep.rows.length > 0) {
		const lSample = resRep.rows.slice(0, 5).map(r => `reperId=${r.REPER_ID} facilityId=${r.FACILITY_ID} coeff=${r.COEFF}`);
		console.log(`[LinkRepersService] Step 6 — Link sample: ${lSample.join(' | ')}`);
	}

	if (resRep.rows.length === 0) {
		console.warn('[LinkRepersService] ⚠ Step 6 — No repers were linked. Control points will NOT be updated.');
		return;
	}

	onProgress && onProgress('Обновление контрольных точек...', 70);

	// Step 7: Update control points (replaces CALC_LINK_REPERS_3)
	// For each linked reper, we need to find the measure from the GP table
	const gpById = new Map();
	for (const gpRow of gpTab.rows) {
		gpById.set(String(gpRow.OBJ_ID), gpRow);
	}

	let updatedCount = 0;
	let skippedCount = 0;
	for (const linkRow of resRep.rows) {
		const gpRow = gpById.get(String(linkRow.FACILITY_ID));
		if (!gpRow) {
			skippedCount++;
			console.warn(`[LinkRepersService] Step 7 — No GP row for FACILITY_ID=${linkRow.FACILITY_ID}, skipping`);
			continue;
		}

		await dbCommand(
			db,
			'UTE_SEM.xml#CALC_UPDATE_CONTROL_POINT',
			'insert',
			{
				FACILITY_ID: linkRow.FACILITY_ID,
				MEASURE: gpRow.LINE_COORD,
				COEFF: linkRow.COEFF,
				REPER_ID: linkRow.REPER_ID,
			},
			sqlQueriesDir
		);
		updatedCount++;
	}

	console.log(`[LinkRepersService] Step 7 — Control points updated: ${updatedCount}, skipped: ${skippedCount}`);
	onProgress && onProgress('Привязка реперов завершена', 100);
	console.log('[LinkRepersService] ✔ Reper linking complete');
}
