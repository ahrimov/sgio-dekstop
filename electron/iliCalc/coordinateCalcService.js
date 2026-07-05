import { dbAll } from '../sqlQueryEngine/dbExecutor.js';
import { processLinkRepers } from './linkRepersService.js';
import { processIliInspCalc } from './iliInspCalcService.js';
import { parseWKT, buildCumulativeDistances, projectPointOnLine, isMercator, mercatorToWgs84 } from './routeGeometry.js';


/**
 * Top-level coordinate calculation orchestrator.
 *
 * Runs the full coordinate calculation pipeline for an ILI inspection:
 * 1. LinkRepers — match ILI repers to route reference points
 * 2. IliInspCalc — interpolate geographic coordinates for all defects
 *
 * @param {object} db - Spatialite database instance
 * @param {object} params
 * @param {number} params.inspectionId - ILI inspection ID
 * @param {string} sqlQueriesDir - Path to SqlQueries directory
 * @param {function} onProgress - Progress callback (step, message, percent)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function runCoordinateCalc(db, params, sqlQueriesDir, onProgress) {
	const { inspectionId } = params;

	const progress = (step, message, percent) => {
		console.log(`[CoordCalc] Step ${step}: ${message} (${percent}%)`);
		if (onProgress) onProgress(step, message, percent);
	};

	console.log(`[CoordCalc] ▶ START runCoordinateCalc — inspectionId=${inspectionId}`);
	progress(1, 'Получение идентификатора маршрута...', 2);

	// Get route_id for this inspection
	const rows = await dbAll(
		db,
		`SELECT route_id FROM sgio_ili_inspection WHERE ili_inspection_id = ${inspectionId}`
	);

	if (!rows || rows.length === 0) {
		console.error(`[CoordCalc] ✖ Inspection ${inspectionId} not found in sgio_ili_inspection`);
		throw new Error(`Inspection ${inspectionId} not found`);
	}

	const routeId = rows[0].route_id;
	if (!routeId) {
		console.error(`[CoordCalc] ✖ Inspection ${inspectionId} has no route_id (value=${routeId})`);
		throw new Error(`Inspection ${inspectionId} has no route_id`);
	}

	console.log(`[CoordCalc] Inspection ${inspectionId} → Route ${routeId}`);

	// Pre-flight: check how many defect rows exist and how many already have coordinates
	const preCheck = await dbAll(
		db,
		`SELECT COUNT(*) AS total,
		        SUM(CASE WHEN x_coord IS NOT NULL AND y_coord IS NOT NULL THEN 1 ELSE 0 END) AS with_coords
		 FROM sgio_ili_data WHERE ili_inspection_id = ${inspectionId}`
	);
	const preTotal = preCheck[0]?.total ?? 0;
	const preWithCoords = preCheck[0]?.with_coords ?? 0;
	console.log(`[CoordCalc] Pre-calc check — sgio_ili_data: total=${preTotal}, already_have_coords=${preWithCoords}`);

	// Check route geometry and load station_begin for odometer offset calculation
	const routeGeomCheck = await dbAll(
		db,
		`SELECT id, station_begin, station_end, AsText(Geometry) AS geom_preview FROM pods_route WHERE id = ${routeId}`
	);
	let routeStationBeginKm = null;
	if (!routeGeomCheck || routeGeomCheck.length === 0) {
		console.error(`[CoordCalc] ✖ pods_route has NO row for id=${routeId}. Geometry calculation will FAIL.`);
	} else {
		const routeRow = routeGeomCheck[0];
		const geomVal = routeRow?.geom_preview;
		if (!geomVal) {
			console.error(`[CoordCalc] ✖ pods_route row exists for id=${routeId} but Geometry IS NULL. Geometry calculation will FAIL.`);
		} else {
			console.log(`[CoordCalc] pods_route geometry check OK — id=${routeId}, geom preview: ${geomVal.substring(0, 80)}...`);
		}
		routeStationBeginKm = routeRow?.station_begin ?? null;
		console.log(`[CoordCalc] pods_route station_begin=${routeStationBeginKm} km, station_end=${routeRow?.station_end} km`);
		if (routeStationBeginKm === null) {
			console.warn(`[CoordCalc] ⚠ pods_route.station_begin is NULL for route ${routeId} — fallback odometer offset will be 0`);
		}
	}

	const calcParams = {
		P_REPORT_ID: inspectionId,
		P_ROUTE_ID: routeId,
		INSPECTION_ID: inspectionId,
		ROUTE_STATION_BEGIN_KM: routeStationBeginKm,
	};

	// Phase 1: Link repers (0-40%)
	progress(2, 'Привязка реперов...', 5);
	await processLinkRepers(db, calcParams, sqlQueriesDir, (message, pct) => {
		progress(2, message, Math.round(5 + pct * 0.35));
	});

	// Phase 2: Calculate coordinates (40-100%)
	progress(3, 'Расчёт координат...', 40);
	await processIliInspCalc(db, calcParams, sqlQueriesDir, (message, pct) => {
		progress(3, message, Math.round(40 + pct * 0.58));
	});

	// Post-calc audit: how many rows now have coordinates
	const postCheck = await dbAll(
		db,
		`SELECT COUNT(*) AS total,
		        SUM(CASE WHEN x_coord IS NOT NULL AND y_coord IS NOT NULL THEN 1 ELSE 0 END) AS with_coords,
		        SUM(CASE WHEN x_coord IS NULL OR y_coord IS NULL THEN 1 ELSE 0 END) AS without_coords
		 FROM sgio_ili_data WHERE ili_inspection_id = ${inspectionId}`
	);
	const postTotal = postCheck[0]?.total ?? 0;
	const postWithCoords = postCheck[0]?.with_coords ?? 0;
	const postWithout = postCheck[0]?.without_coords ?? 0;
	console.log(`[CoordCalc] Post-calc audit — sgio_ili_data: total=${postTotal}, with_coords=${postWithCoords}, without_coords=${postWithout}`);
	if (postWithCoords === 0) {
		console.error(`[CoordCalc] ✖ GEOMETRY PROBLEM: 0 out of ${postTotal} defect rows have coordinates after calculation!`);
	} else if (postWithout > 0) {
		console.warn(`[CoordCalc] ⚠ ${postWithout} defect rows still have no coordinates after calculation`);
	} else {
		console.log(`[CoordCalc] ✔ All ${postTotal} defect rows have coordinates`);
	}

	progress(4, 'Расчёт координат завершён!', 100);
	console.log(`[CoordCalc] ✔ runCoordinateCalc COMPLETE — inspectionId=${inspectionId}`);

	return {
		success: true,
		message: `Координаты рассчитаны для отчёта ${inspectionId}`,
	};
}

/**
	* Runs coordinate calculation WITHOUT the LinkRepers phase.
	* Used after manual virtual reper add/edit/delete — user manages reper linking manually.
	*
	* @param {object} db - Spatialite database instance
	* @param {object} params
	* @param {number} params.inspectionId - ILI inspection ID
	* @param {string} sqlQueriesDir - Path to SqlQueries directory
	* @param {function} onProgress - Progress callback (step, message, percent)
	* @returns {Promise<{success: boolean, message: string}>}
	*/
export async function runCoordinateCalcNoLink(db, params, sqlQueriesDir, onProgress) {
	const { inspectionId } = params;

	const progress = (step, message, percent) => {
		console.log(`[CoordCalcNoLink] Step ${step}: ${message} (${percent}%)`);
		if (onProgress) onProgress(step, message, percent);
	};

	console.log(`[CoordCalcNoLink] ▶ START — inspectionId=${inspectionId}`);
	progress(1, 'Получение идентификатора маршрута...', 2);

	const rows = await dbAll(
		db,
		`SELECT route_id FROM sgio_ili_inspection WHERE ili_inspection_id = ${inspectionId}`
	);

	if (!rows || rows.length === 0) {
		throw new Error(`Inspection ${inspectionId} not found`);
	}

	const routeId = rows[0].route_id;
	if (!routeId) {
		throw new Error(`Inspection ${inspectionId} has no route_id`);
	}

	const routeGeomCheck = await dbAll(
		db,
		`SELECT station_begin FROM pods_route WHERE id = ${routeId}`
	);
	const routeStationBeginKm = routeGeomCheck[0]?.station_begin ?? null;

	const calcParams = {
		P_REPORT_ID: inspectionId,
		P_ROUTE_ID: routeId,
		INSPECTION_ID: inspectionId,
		ROUTE_STATION_BEGIN_KM: routeStationBeginKm,
	};

	progress(2, 'Расчёт координат (без привязки реперов)...', 10);
	await processIliInspCalc(db, calcParams, sqlQueriesDir, (message, pct) => {
		progress(2, message, Math.round(10 + pct * 0.88));
	});

	progress(3, 'Расчёт координат завершён!', 100);
	console.log(`[CoordCalcNoLink] ✔ COMPLETE — inspectionId=${inspectionId}`);

	return {
		success: true,
		message: `Координаты пересчитаны для отчёта ${inspectionId} (без привязки реперов)`,
	};
}

/**
	* Projects a WGS84 point onto the route axis for a given inspection.
	* Returns the geodetic measure (distance along route) and projected coordinates.
	*
	* @param {object} db - Spatialite database instance
	* @param {object} params
	* @param {number} params.x - Longitude in WGS84 (EPSG:4326)
	* @param {number} params.y - Latitude in WGS84 (EPSG:4326)
	* @returns {Promise<{measure: number, projectedLon: number, projectedLat: number, routeId: number, inspectionId: number}>}
	*/
export async function projectPointOnRoute(db, params) {
	const { x, y } = params;

	// Get the single inspection (always one in the DB)
	const inspRows = await dbAll(
		db,
		`SELECT ili_inspection_id, route_id FROM sgio_ili_inspection LIMIT 1`
	);
	if (!inspRows || inspRows.length === 0) {
		throw new Error('No ILI inspection found in database');
	}
	const { ili_inspection_id: inspectionId, route_id: routeId } = inspRows[0];
	if (!routeId) {
		throw new Error('Inspection has no route_id');
	}

	// Load route geometry WKT
	const routeRows = await dbAll(
		db,
		`SELECT AsText(Geometry) AS geom FROM pods_route WHERE id = ${routeId}`
	);
	if (!routeRows || !routeRows[0]?.geom) {
		throw new Error(`No route geometry for route_id=${routeId}`);
	}

	const routeWkt = routeRows[0].geom;
	let routeCoords = parseWKT(routeWkt);
	if (routeCoords.length < 2) {
		throw new Error('Route geometry has fewer than 2 points');
	}

	// Convert Mercator → WGS84 if the route is stored in EPSG:3857
	if (isMercator(routeCoords)) {
		routeCoords = routeCoords.map(([mx, my]) => mercatorToWgs84(mx, my));
	}

	// x/y arrive as WGS84 degrees (transformed in addVirtMarker before IPC call)
	const cumDists = buildCumulativeDistances(routeCoords);
	const result = projectPointOnLine(x, y, routeCoords, cumDists);
	if (!result) {
		throw new Error('Failed to project point onto route');
	}

	return {
		measure: result.measure,
		projectedLon: result.lon,   // WGS84 longitude
		projectedLat: result.lat,   // WGS84 latitude
		routeId,
		inspectionId,
	};
}
