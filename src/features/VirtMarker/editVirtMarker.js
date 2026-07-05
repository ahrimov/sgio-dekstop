import { transform } from 'ol/proj.js';
import { getDbPath } from '../../legacy/DBManage.js';
import { refreshAfterVirtMarkerChange } from '../../store/refreshTable.js';

/**
 * Updates an existing virtual reper (виртуальный репер) in the database.
 *
 * Flow:
 * 1. Extract coordinates from the feature geometry (EPSG:3857 → WGS84).
 * 2. Re-project the WGS84 point onto the pipeline route axis (V_MEASURE recalculation).
 * 3. Call `ili-virt-marker-update` IPC with new attributes + new coordinates.
 * 4. Refresh ILI layers and recalculate coordinates without reper linking.
 *
 * @param {import('ol/layer/Vector').default} layer     - SGIO_ILI_DATA_VIRT_MARKER vector layer
 * @param {number}                            featureId - ili_data_id of the reper to update
 * @param {import('ol/Feature').default}      feature   - Feature with current geometry
 * @param {object}                            attributes - Updated attribute values
 * @param {number}  [attributes.anomaly_type_cl]
 * @param {string}  [attributes.weld_number]
 * @param {number|null} [attributes.absolute_odometer]
 * @param {string}  [attributes.description]
 * @returns {Promise<void>}
 */
export async function editVirtMarker(layer, featureId, feature, attributes) {
	const geometry = feature.getGeometry();
	if (!geometry) {
		throw new Error('Виртуальный репер: не найдена геометрия объекта');
	}

	const coordsMercator = geometry.getFirstCoordinate();
	const [lon, lat] = transform(coordsMercator, 'EPSG:3857', 'EPSG:4326');

	const dbPath = getDbPath();
	if (!dbPath) {
		throw new Error('База данных не открыта');
	}

	// Always re-project to keep V_MEASURE / calibrated_measure in sync
	const projection = await electronAPI.iliProjectPointOnRoute(dbPath, { x: lon, y: lat });
	console.log('[editVirtMarker] projection result:', projection);

	await electronAPI.iliVirtMarkerUpdate(dbPath, {
		id:              featureId,
		x:               projection.projectedLon,
		y:               projection.projectedLat,
		vMeasure:        projection.measure,
		anomalyTypeCl:   attributes.anomaly_type_cl   ?? 1003,
		weldNumber:      attributes.weld_number        ?? '',
		absoluteOdometer: attributes.absolute_odometer ?? null,
		description:     attributes.description         ?? '',
	});

	console.log('[editVirtMarker] update done — refreshing layers');
	await refreshAfterVirtMarkerChange();
}
