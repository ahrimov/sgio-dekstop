import { showInfo } from '../../../shared/featuredInfoEvent';
import { openFeatureSelector } from '../../../shared/openFeatureSelectronEvent';

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
			if (numberOfFeatures > 1) {
				openFeatureSelector(featuresByLayer);
			} else {
				showInfo({
					featureId: featuresByLayer[0].features[0].id,
					layer: featuresByLayer[0].layer,
				});
			}
		}
	};
}
