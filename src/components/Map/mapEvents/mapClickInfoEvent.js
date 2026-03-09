import { showInfo, showInfoMultiple } from '../../../store/featuredInfoEvent';

export function setMapClickInfoEvent(map) {
	if (!map) return;

	const handler = handleMapClickInfoEvent(map);
	map._clickInfoEvent = handler;
	map.on('click', handler);
}

export function unsetMapClickInfoEvent(map) {
	if (!map || !map._clickInfoEvent) return;

	map.un('click', map._clickInfoEvent);
}

function handleMapClickInfoEvent(map) {
	return evt => {
		if (!map.modify) {
			const layersMap = new Map();
			map.forEachFeatureAtPixel(
				evt.pixel,
				(feature, layer) => {
					if (!layersMap.has(layer)) layersMap.set(layer, []);
					layersMap.get(layer).push(feature);
				},
				{ hitTolerance: 5 }
			);
			const numberOfFeatures = layersMap.size;
			if (numberOfFeatures === 0) {
				return;
			}
			const featuresByLayer = Array.from(layersMap, ([layer, features]) => ({
				layer,
				features,
			}));
			
			// Calculate total number of features across all layers
			const totalFeatures = featuresByLayer.reduce((sum, item) => sum + item.features.length, 0);
			
			if (totalFeatures > 1) {
				// Show InfoAttributeView with multiple features
				showInfoMultiple({
					featuresByLayer,
					clickCoordinate: evt.coordinate,
				});
			} else {
				// Show InfoAttributeView with single feature
				showInfo({
					featureId: featuresByLayer[0].features[0].id,
					layer: featuresByLayer[0].layer,
					clickCoordinate: evt.coordinate,
				});
			}
		}
	};
}
