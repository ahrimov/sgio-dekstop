/**
 * Route geometry processing — JavaScript replacement for PostGIS spatial queries.
 *
 * Replaces CALC_CALC_DEF_2 and CALC_LINK_REPERS_2 which use PostGIS functions
 * (ST_DumpPoints, ST_LineMerge, ST_InterpolatePoint, ST_LineInterpolatePoint,
 *  ST_LineLocatePoint, ST_within, st_buffer, string_agg) not available in Spatialite.
 *
 * This module:
 * 1. Parses route WKT geometry into coordinate arrays
 * 2. Calculates cumulative distances along the route (Haversine)
 * 3. Projects markers/valves onto the route line
 * 4. Returns piket table format expected by IliInspCalc
 */

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6371008.8; // meters

/**
 * Calculate Haversine distance between two WGS84 points in meters.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in meters
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
	const dLat = (lat2 - lat1) * DEG_TO_RAD;
	const dLon = (lon2 - lon1) * DEG_TO_RAD;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * DEG_TO_RAD) *
			Math.cos(lat2 * DEG_TO_RAD) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return EARTH_RADIUS_M * c;
}

/**
 * Parse a WKT geometry string into an array of [lon, lat] coordinate pairs.
 * Handles POINT, LINESTRING, MULTILINESTRING, MULTIPOINT.
 * Coordinates are expected in WGS84 (EPSG:4326) or Web Mercator (EPSG:3857).
 *
 * @param {string} wkt
 * @returns {number[][]} Array of [lon, lat] pairs
 */
export function parseWKT(wkt) {
	if (!wkt) return [];

	// Normalise: strip dimension qualifiers (Z, M, ZM) that follow the geometry type.
	// e.g. "MULTIPOINT Z(...)" → "MULTIPOINT(...)"
	//      "LINESTRING ZM(...)" → "LINESTRING(...)"
	const normalised = wkt.trim().replace(
		/\b(POINT|LINESTRING|MULTILINESTRING|MULTIPOINT|POLYGON|MULTIPOLYGON)\s+(?:ZM|Z|M)\s*\(/gi,
		'$1('
	);

	const upper = normalised.toUpperCase();

	// Handle MULTILINESTRING
	if (upper.startsWith('MULTILINESTRING')) {
		const inner = normalised.replace(/^MULTILINESTRING\s*\(/i, '').replace(/\)\s*$/, '');
		// Split into individual linestrings
		const parts = inner.split(/\)\s*,\s*\(/);
		const coords = [];
		for (const part of parts) {
			const clean = part.replace(/^\(/, '').replace(/\)$/, '');
			coords.push(...parseCoordString(clean));
		}
		return coords;
	}

	// Handle LINESTRING
	if (upper.startsWith('LINESTRING')) {
		const inner = normalised.replace(/^LINESTRING\s*\(/i, '').replace(/\)\s*$/, '');
		return parseCoordString(inner);
	}

	// Handle MULTIPOINT
	if (upper.startsWith('MULTIPOINT')) {
		const inner = normalised.replace(/^MULTIPOINT\s*\(/i, '').replace(/\)\s*$/, '');
		return parseCoordString(inner.replace(/[()]/g, ''));
	}

	// Handle POINT
	if (upper.startsWith('POINT')) {
		const inner = normalised.replace(/^POINT\s*\(/i, '').replace(/\)\s*$/, '');
		return parseCoordString(inner);
	}

	return [];
}

/**
 * Parse a coordinate string "x1 y1 [z1], x2 y2 [z2], ..." into [[x1,y1], [x2,y2], ...]
 * The optional Z (and M) values are ignored — only X and Y are used.
 */
function parseCoordString(str) {
	return str
		.trim()
		.split(',')
		.map(pair => {
			const parts = pair.trim().split(/\s+/);
			// parts[0]=X, parts[1]=Y, parts[2]=Z (optional), parts[3]=M (optional)
			return [parseFloat(parts[0]), parseFloat(parts[1])];
		})
		.filter(([x, y]) => !isNaN(x) && !isNaN(y));
}

/**
 * Convert Web Mercator (EPSG:3857) coordinates to WGS84 (EPSG:4326).
 * @param {number} x - Easting in meters
 * @param {number} y - Northing in meters
 * @returns {[number, number]} [longitude, latitude]
 */
function mercatorToWgs84(x, y) {
	const lon = (x / 20037508.342789244) * 180;
	const lat = (Math.atan(Math.exp((y / 20037508.342789244) * Math.PI)) * 360) / Math.PI - 90;
	return [lon, lat];
}

/**
 * Detect if coordinates are in Web Mercator (values > 180 indicate meters, not degrees).
 * @param {number[][]} coords
 * @returns {boolean}
 */
function isMercator(coords) {
	if (!coords || coords.length === 0) return false;
	return Math.abs(coords[0][0]) > 180 || Math.abs(coords[0][1]) > 90;
}

/**
 * Build cumulative distance array along a route.
 * @param {number[][]} coords - Array of [lon, lat] in WGS84
 * @returns {number[]} Cumulative distances in meters (first element = 0)
 */
export function buildCumulativeDistances(coords) {
	const dists = [0];
	for (let i = 1; i < coords.length; i++) {
		const [lon1, lat1] = coords[i - 1];
		const [lon2, lat2] = coords[i];
		dists.push(dists[i - 1] + haversineDistance(lat1, lon1, lat2, lon2));
	}
	return dists;
}

/**
 * Project a point onto a polyline and return the measure (distance along line)
 * and the projected coordinates.
 *
 * @param {number} pLon - Point longitude
 * @param {number} pLat - Point latitude
 * @param {number[][]} lineCoords - Array of [lon, lat] in WGS84
 * @param {number[]} cumDists - Cumulative distances array
 * @returns {{ measure: number, lon: number, lat: number, segIdx: number } | null}
 */
export function projectPointOnLine(pLon, pLat, lineCoords, cumDists) {
	if (lineCoords.length < 2) return null;

	let bestDist = Infinity;
	let bestMeasure = 0;
	let bestLon = lineCoords[0][0];
	let bestLat = lineCoords[0][1];
	let bestSegIdx = 0;

	for (let i = 0; i < lineCoords.length - 1; i++) {
		const [x1, y1] = lineCoords[i];
		const [x2, y2] = lineCoords[i + 1];

		// Project point onto segment using simple 2D math (good enough for short segments)
		const dx = x2 - x1;
		const dy = y2 - y1;
		const segLenSq = dx * dx + dy * dy;

		let t = 0;
		if (segLenSq > 0) {
			t = ((pLon - x1) * dx + (pLat - y1) * dy) / segLenSq;
			t = Math.max(0, Math.min(1, t));
		}

		const projLon = x1 + t * dx;
		const projLat = y1 + t * dy;

		const dist = haversineDistance(pLat, pLon, projLat, projLon);

		if (dist < bestDist) {
			bestDist = dist;
			bestSegIdx = i;
			bestLon = projLon;
			bestLat = projLat;

			// Measure = cumulative distance to start of segment + distance along segment
			const segLen = haversineDistance(y1, x1, y2, x2);
			bestMeasure = cumDists[i] + t * segLen;
		}
	}

	return { measure: bestMeasure, lon: bestLon, lat: bestLat, segIdx: bestSegIdx, dist: bestDist };
}

/**
 * Get coordinates at a given measure (distance along line).
 * @param {number} measure - Distance along line in meters
 * @param {number[][]} lineCoords
 * @param {number[]} cumDists
 * @returns {{ lon: number, lat: number }}
 */
export function interpolateOnLine(measure, lineCoords, cumDists) {
	if (lineCoords.length === 0) return { lon: 0, lat: 0 };
	if (measure <= 0) return { lon: lineCoords[0][0], lat: lineCoords[0][1] };

	const totalLen = cumDists[cumDists.length - 1];
	if (measure >= totalLen) {
		const last = lineCoords[lineCoords.length - 1];
		return { lon: last[0], lat: last[1] };
	}

	// Find the segment containing this measure
	for (let i = 1; i < cumDists.length; i++) {
		if (cumDists[i] >= measure) {
			const segLen = cumDists[i] - cumDists[i - 1];
			const t = segLen > 0 ? (measure - cumDists[i - 1]) / segLen : 0;
			const [x1, y1] = lineCoords[i - 1];
			const [x2, y2] = lineCoords[i];
			return {
				lon: x1 + t * (x2 - x1),
				lat: y1 + t * (y2 - y1),
			};
		}
	}

	const last = lineCoords[lineCoords.length - 1];
	return { lon: last[0], lat: last[1] };
}

/**
 * Build the PIKET table from route geometry and reference points.
 * This replaces CALC_CALC_DEF_2 (for IliInspCalc) and CALC_LINK_REPERS_2 (for LinkRepers).
 *
 * @param {object} params
 * @param {string} params.routeGeomWkt - Route geometry WKT from pods_route
 * @param {object[]} params.markers - Marker rows: [{STATION_ID, STATION, GEOM}]
 * @param {object[]} params.valves - Valve rows: [{ID, GEOM}]
 * @param {object[]} params.fixedRepers - Fixed reper rows: [{ILI_DATA_ID, CALIBRATED_MEASURE, X_COORD, Y_COORD, STATION}]
 * @param {string} [params.mode] - 'piket' (for IliInspCalc) or 'gp' (for LinkRepers)
 * @returns {{ rows: object[] }} Table with MEASURE, X, Y, Z, STATION, STATION_ID, OBJ_ID, OBJ_CLS_ID, LINE_COORD, ...
 */
export function buildPiketTable({ routeGeomWkt, markers = [], valves = [], fixedRepers = [], mode = 'piket' }) {
	const result = { rows: [] };

	console.log(`[routeGeometry] ▶ buildPiketTable(mode=${mode}) — markers=${markers.length}, valves=${valves.length}, fixedRepers=${fixedRepers.length}`);

	if (!routeGeomWkt) {
		console.warn('[routeGeometry] ⚠ No route geometry provided — returning empty table');
		return result;
	}

	// Parse route geometry
	let routeCoords = parseWKT(routeGeomWkt);
	console.log(`[routeGeometry] Parsed route WKT → ${routeCoords.length} raw coordinate pairs`);
	if (routeCoords.length > 0) {
		console.log(`[routeGeometry] First raw coord: [${routeCoords[0]}], last: [${routeCoords[routeCoords.length - 1]}]`);
	}

	if (routeCoords.length < 2) {
		console.warn(`[routeGeometry] ⚠ Route has only ${routeCoords.length} point(s) — need ≥2. Returning empty table.`);
		return result;
	}

	// Convert from Web Mercator to WGS84 if needed
	const wasMercator = isMercator(routeCoords);
	if (wasMercator) {
		console.log('[routeGeometry] Detected Web Mercator (EPSG:3857) — converting to WGS84...');
		routeCoords = routeCoords.map(([x, y]) => mercatorToWgs84(x, y));
		console.log(`[routeGeometry] After conversion — first: [${routeCoords[0].map(v => v.toFixed(6))}], last: [${routeCoords[routeCoords.length - 1].map(v => v.toFixed(6))}]`);
	} else {
		console.log('[routeGeometry] Coordinates appear to be WGS84 already (no Mercator conversion needed)');
	}

	const cumDists = buildCumulativeDistances(routeCoords);
	const totalLength = cumDists[cumDists.length - 1];
	console.log(`[routeGeometry] Route: ${routeCoords.length} points, total length: ${(totalLength / 1000).toFixed(2)} km (${totalLength.toFixed(0)} m)`);

	// Add route vertex points (backbone of the piket table)
	for (let i = 0; i < routeCoords.length; i++) {
		const [lon, lat] = routeCoords[i];
		const measure = cumDists[i];
		const id = -(i + 1); // Negative IDs for route points

		if (mode === 'piket') {
			result.rows.push({
				MEASURE: measure,
				STATION: null,
				LINE_ID: 50,
				ROUTE_ID: 50,
				SERIES_ID: 50,
				SERIES: 50,
				STATION_ID: id,
				DEPTH: 0,
				SRV_DISTRICT_GCL: null,
				COORDINATE_ID: id,
				LOCATION_ID: id,
				X: lon,
				Y: lat,
				Z: null,
			});
		} else {
			result.rows.push({
				OBJ_ID: id,
				LINE_COORD: measure,
				OBJ_CLS_ID: '0', // Route backbone points
			});
		}
	}
	console.log(`[routeGeometry] Added ${routeCoords.length} route backbone points`);

	// Add markers (OBJ_CLS_ID='2' for LinkRepers, or piket points)
	let markerCount = 0;
	let markerSkippedNoGeom = 0;
	let markerSkippedTooFar = 0;
	for (const marker of markers) {
		if (!marker.GEOM) {
			markerSkippedNoGeom++;
			continue;
		}
		let mCoords = parseWKT(marker.GEOM);
		if (mCoords.length === 0) {
			markerSkippedNoGeom++;
			continue;
		}
		let [mLon, mLat] = mCoords[0];
		if (isMercator([[mLon, mLat]])) {
			[mLon, mLat] = mercatorToWgs84(mLon, mLat);
		}

		const proj = projectPointOnLine(mLon, mLat, routeCoords, cumDists);
		if (!proj) continue;

		// Only include markers within 10m of route (matching PostGIS st_buffer 10m)
		if (proj.dist > 10) {
			markerSkippedTooFar++;
			if (markerSkippedTooFar <= 5) {
				console.log(`[routeGeometry] Marker id=${marker.STATION_ID} station=${marker.STATION} skipped — dist=${proj.dist.toFixed(1)}m > 10m threshold`);
			}
			continue;
		}

		markerCount++;
		const stationId = marker.STATION_ID || markerCount;

		if (mode === 'piket') {
			result.rows.push({
				MEASURE: proj.measure,
				STATION: marker.STATION || null,
				LINE_ID: 50,
				ROUTE_ID: 50,
				SERIES_ID: 50,
				SERIES: 50,
				STATION_ID: stationId,
				DEPTH: 0,
				SRV_DISTRICT_GCL: null,
				COORDINATE_ID: stationId,
				LOCATION_ID: stationId,
				X: proj.lon,
				Y: proj.lat,
				Z: null,
			});
		} else {
			result.rows.push({
				OBJ_ID: stationId,
				LINE_COORD: proj.measure,
				OBJ_CLS_ID: '2', // Markers are cls '2' in LinkRepers
			});
		}
	}
	console.log(`[routeGeometry] Markers — added: ${markerCount}, skipped (no geom): ${markerSkippedNoGeom}, skipped (too far >10m): ${markerSkippedTooFar}`);
	if (markerSkippedTooFar > 5) {
		console.log(`[routeGeometry] ... and ${markerSkippedTooFar - 5} more markers skipped for distance`);
	}

	// Add valves (OBJ_CLS_ID='1' for LinkRepers)
	let valveCount = 0;
	let valveSkippedNoGeom = 0;
	let valveSkippedTooFar = 0;
	for (const valve of valves) {
		if (!valve.GEOM) {
			valveSkippedNoGeom++;
			continue;
		}
		let vCoords = parseWKT(valve.GEOM);
		if (vCoords.length === 0) {
			valveSkippedNoGeom++;
			continue;
		}
		let [vLon, vLat] = vCoords[0];
		if (isMercator([[vLon, vLat]])) {
			[vLon, vLat] = mercatorToWgs84(vLon, vLat);
		}

		const proj = projectPointOnLine(vLon, vLat, routeCoords, cumDists);
		if (!proj) continue;

		// Only include valves within 1m of route (matching PostGIS st_buffer 1m)
		if (proj.dist > 1) {
			valveSkippedTooFar++;
			if (valveSkippedTooFar <= 3) {
				console.log(`[routeGeometry] Valve id=${valve.ID} skipped — dist=${proj.dist.toFixed(1)}m > 1m threshold`);
			}
			continue;
		}

		valveCount++;
		const valveId = (valve.ID || valveCount) + 1000000; // Offset like PostGIS query

		if (mode === 'piket') {
			result.rows.push({
				MEASURE: proj.measure,
				STATION: 999,
				LINE_ID: 50,
				ROUTE_ID: 50,
				SERIES_ID: 50,
				SERIES: 50,
				STATION_ID: valveId,
				DEPTH: 0,
				SRV_DISTRICT_GCL: null,
				COORDINATE_ID: valveId,
				LOCATION_ID: valveId,
				X: proj.lon,
				Y: proj.lat,
				Z: null,
			});
		} else {
			result.rows.push({
				OBJ_ID: valveId,
				LINE_COORD: proj.measure,
				OBJ_CLS_ID: '1', // Valves are cls '1' in LinkRepers
			});
		}
	}
	console.log(`[routeGeometry] Valves — added: ${valveCount}, skipped (no geom): ${valveSkippedNoGeom}, skipped (too far >1m): ${valveSkippedTooFar}`);

	// Add manually fixed repers (ref_event_id = -999)
	let fixedReperCount = 0;
	for (const reper of fixedRepers) {
		if (!reper.CALIBRATED_MEASURE) continue;
		const measure = parseFloat(reper.CALIBRATED_MEASURE);
		if (isNaN(measure)) continue;

		const x = parseFloat(reper.X_COORD) || 0;
		const y = parseFloat(reper.Y_COORD) || 0;
		fixedReperCount++;

		if (mode === 'piket') {
			result.rows.push({
				MEASURE: measure,
				STATION: reper.STATION || null,
				LINE_ID: 50,
				ROUTE_ID: 50,
				SERIES_ID: 50,
				SERIES: 50,
				STATION_ID: reper.ILI_DATA_ID,
				DEPTH: 0,
				SRV_DISTRICT_GCL: null,
				COORDINATE_ID: reper.ILI_DATA_ID,
				LOCATION_ID: reper.ILI_DATA_ID,
				X: x,
				Y: y,
				Z: null,
			});
		} else {
			result.rows.push({
				OBJ_ID: reper.REF_EVENT_ID || reper.ILI_DATA_ID,
				LINE_COORD: measure,
				OBJ_CLS_ID: '1',
			});
		}
	}
	if (fixedReperCount > 0) {
		console.log(`[routeGeometry] Added ${fixedReperCount} manually fixed repers`);
	}

	// Sort by measure
	result.rows.sort((a, b) => {
		const ma = mode === 'piket' ? a.MEASURE : a.LINE_COORD;
		const mb = mode === 'piket' ? b.MEASURE : b.LINE_COORD;
		return (ma || 0) - (mb || 0);
	});

	console.log(`[routeGeometry] ✔ Built piket table: ${result.rows.length} rows (mode=${mode}) — backbone=${routeCoords.length}, markers=${markerCount}, valves=${valveCount}, fixedRepers=${fixedReperCount}`);
	return result;
}
