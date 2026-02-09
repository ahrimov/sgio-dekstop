import { requestToDB } from '../../legacy/DBManage';
import { refreshFeatureTable } from '../../shared/refreshTable';
import { syncChangesWithKML } from '../KMLLayer/syncChangesWithKML';

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

	const deleteQuery = `
        DELETE FROM ${layer.id} 
        WHERE id = ${featureId};
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
