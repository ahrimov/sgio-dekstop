import KML from 'ol/format/KML.js';
import { layers, map } from '../../legacy/globals';
import { prepareKMLFeatures, updateKMLDocument } from './kmlDocument.js';

export async function syncChangesWithKML(layerId, onSuccess, onError) {
	try {
		const layer = layers.find(layer => layer.get('id') === layerId);
		const fileUri = layer.get('fileUri');
		const features = layer.getSource().getFeatures();
		const content = await electronAPI.readFile(fileUri);
		const xmlDoc = new DOMParser().parseFromString(content, 'application/xml');
		const projection = map.getView().getProjection();
		// Recover IDs in older saved files in exactly the same order as at startup.
		const originalFeatures = new KML().readFeatures(content, { featureProjection: projection });
		prepareKMLFeatures(originalFeatures, layerId, xmlDoc);
		features.forEach(feature => {
			if (feature.id != null) feature.set('ID', String(feature.id));
		});
		prepareKMLFeatures(features, layerId);
		const updated = updateKMLDocument(xmlDoc, features, projection);
		await electronAPI.writeFile(fileUri, updated);
		// Only commit deletion/new-feature state after the write has succeeded.
		features.forEach(feature => {
			if (feature.deleted) layer.getSource().removeFeature(feature);
			else feature.isNew = false;
		});
		if (onSuccess) onSuccess();
	} catch (error) {
		if (onError) onError(error);
		else throw error;
	}
}
