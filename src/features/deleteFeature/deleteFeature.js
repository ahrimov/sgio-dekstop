import { requestToDB, getDbPath } from '../../legacy/DBManage';
import { refreshFeatureTable, refreshAfterVirtMarkerChange } from '../../store/refreshTable';
import { syncChangesWithKML } from '../KMLLayer/syncChangesWithKML';

const VIRT_MARKER_LAYER_ID = 'SGIO_ILI_DATA_VIRT_MARKER';

export async function deleteFeature(featureId, layer, callback) {
	const kmlType = layer.get('kmlType');
	if (kmlType) {
		const features = layer.getSource().getFeatures();
		const feature = features.find(f => f.id === featureId);
		feature.deleted = true;
		await syncChangesWithKML(layer.id);
		if (callback) callback();
		return;
	}

	// Virtual reper — soft delete via IPC (resets control_point_lf, does NOT physically delete)
	if (layer.id === VIRT_MARKER_LAYER_ID) {
		try {
			const dbPath = getDbPath();
			if (!dbPath) throw new Error('База данных не открыта');
			await electronAPI.iliVirtMarkerDelete(dbPath, { id: featureId });
			deleteFeatureFromLayer(featureId, layer);
			await refreshAfterVirtMarkerChange();
			if (callback) callback();
		} catch (err) {
			console.error('[deleteFeature] virtual reper soft-delete error:', err);
			alert(`Ошибка удаления виртуального репера: ${err.message}`);
		}
		return;
	}

	const pk = layer.primaryKey || 'id';
	const deleteQuery = `
	       DELETE FROM ${layer.table}
	       WHERE ${pk} = ${featureId};
	   `;

	requestToDB(
		deleteQuery,
		_ => {
			deleteFeatureFromLayer(featureId, layer);
			setTimeout(() => refreshFeatureTable(), 100);
			if (callback) callback();
		},
		`Error deleting feature ${featureId} from database`
	);
}

function deleteFeatureFromLayer(featureId, layer) {
	if (!layer) {
		console.error(`Layer not found`);
		return;
	}

	const source = layer.getSource();
	const features = source.getFeatures();
	const feature = features.find(f => f.id === featureId);

	if (feature) {
		source.removeFeature(feature);
		source.changed();
	} else {
		console.warn(`Feature ${featureId} not found in layer ${layer.id}`);
	}
}
