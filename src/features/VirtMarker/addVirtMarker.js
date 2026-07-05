import { transform } from 'ol/proj.js';
import { getDbPath } from '../../legacy/DBManage.js';
import { refreshAfterVirtMarkerChange } from '../../store/refreshTable.js';

/**
 * Inserts a new virtual reper (виртуальный репер) into the database.
 *
 * Flow:
 * 1. Extract coordinates from the drawn feature geometry (EPSG:3857 → WGS84).
 * 2. Project the WGS84 point onto the pipeline route axis via IPC.
 * 3. Read editable attributes from the feature (weld_number, absolute_odometer, description).
 * 4. Call the `ili-virt-marker-insert` IPC which runs dedup-delete then INSERT.
 * 5. Refresh ILI layers and recalculate coordinates without reper linking.
 *
 * @param {import('ol/layer/Vector').default} layer - SGIO_ILI_DATA_VIRT_MARKER vector layer
 * @param {import('ol/Feature').default}       feature - Newly drawn feature with Point/MultiPoint geometry
 * @returns {Promise<void>}
 */
export async function addVirtMarker(layer, feature) {
	console.log('[addVirtMarker] START');
	const geometry = feature.getGeometry();
	if (!geometry) {
		throw new Error('Виртуальный репер: не задана геометрия');
	}

	// getFirstCoordinate() works for both Point and MultiPoint geometries
	const coordsMercator = geometry.getFirstCoordinate();
	console.log('[addVirtMarker] coordsMercator:', coordsMercator);
	const [lon, lat] = transform(coordsMercator, 'EPSG:3857', 'EPSG:4326');
	console.log('[addVirtMarker] WGS84 lon/lat:', lon, lat);

	const dbPath = getDbPath();
	console.log('[addVirtMarker] dbPath:', dbPath);
	if (!dbPath) {
		throw new Error('База данных не открыта');
	}

	// Project clicked point onto the pipeline route axis
	console.log('[addVirtMarker] calling iliProjectPointOnRoute...');
	const projection = await electronAPI.iliProjectPointOnRoute(dbPath, { x: lon, y: lat });
	console.log('[addVirtMarker] projection result:', projection);

	// Read user-provided attributes that were entered in the draw form
	const weldNumber       = feature.get('weld_number')       ?? '';
	const absoluteOdometer = feature.get('absolute_odometer') ?? null;
	const description      = feature.get('description')       ?? '';
	const anomalyTypeCl    = feature.get('anomaly_type_cl')   ?? 1003;
	console.log('[addVirtMarker] attributes: weldNumber=', weldNumber,
		'absoluteOdometer=', absoluteOdometer,
		'description=', description,
		'anomalyTypeCl=', anomalyTypeCl);

	console.log('[addVirtMarker] calling iliVirtMarkerInsert...');
	try {
		await electronAPI.iliVirtMarkerInsert(dbPath, {
			x:               projection.projectedLon,
			y:               projection.projectedLat,
			vMeasure:        projection.measure,
			weldNumber,
			absoluteOdometer,
			description,
			anomalyTypeCl,
		});
		console.log('[addVirtMarker] insert done — refreshing layers');
	} catch (insertErr) {
		console.error('[addVirtMarker] INSERT ERROR:', insertErr);
		throw insertErr;
	}

	await refreshAfterVirtMarkerChange();
	console.log('[addVirtMarker] DONE');
}
