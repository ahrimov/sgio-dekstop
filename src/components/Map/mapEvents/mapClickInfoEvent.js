import { showInfo, showInfoMultiple } from '../../../store/featuredInfoEvent';
import {
	$isEditGeometryFeatureSelectionMode,
	clearSelectedEditGeometryFeature,
	setEditGeometryFeatureSelectionMode,
} from '../../EditGeometryPanel/store.js';
import { startGeometryEdit } from '../../../features/draw/store.js';

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

/**
 * Schedules a callback to run asynchronously using the most appropriate method
 * @param {Function} callback - Function to execute asynchronously
 */
function scheduleAsync(callback) {
	if (typeof requestIdleCallback !== 'undefined') {
		// Use requestIdleCallback for better performance when available
		requestIdleCallback(callback, { timeout: 50 });
	} else {
		// Fallback to setTimeout for immediate async execution
		setTimeout(callback, 0);
	}
}

/**
 * Collects features at the clicked pixel asynchronously
 * @param {Object} map - OpenLayers map instance
 * @param {Array} pixel - Click pixel coordinates
 * @param {Array} coordinate - Click map coordinates
 * @returns {Promise<void>}
 */
async function collectAndShowFeatures(map, pixel, coordinate) {
	return new Promise(resolve => {
		scheduleAsync(() => {
			const layersMap = new Map();
			let totalFeatures = 0;

			// Single pass: collect features efficiently
			map.forEachFeatureAtPixel(
				pixel,
				(feature, layer) => {
					if (!layersMap.has(layer)) {
						layersMap.set(layer, []);
					}
					layersMap.get(layer).push(feature);
					totalFeatures++;
				},
				{ hitTolerance: 5 }
			);

			// No features found
			if (totalFeatures === 0) {
				resolve();
				return;
			}

			// Convert Map to array format
			const featuresByLayer = Array.from(layersMap, ([layer, features]) => ({
				layer,
				features,
			}));

			const firstFeature = featuresByLayer[0].features[0];
			const firstLayer = featuresByLayer[0].layer;

			// Dispatch appropriate event based on feature count
			if (totalFeatures > 1) {
				showInfoMultiple({
					featuresByLayer,
					clickCoordinate: coordinate,
				});
			} else {
				showInfo({
					featureId: firstFeature.id,
					layer: firstLayer,
					clickCoordinate: coordinate,
				});
			}

			resolve();
		});
	});
}

function handleMapClickInfoEvent(map) {
	return evt => {
		// Only process clicks when not in modify mode
		if (!map.modify) {
			// Asynchronously collect and display feature information
			// This prevents blocking the UI thread during feature collection
			collectAndShowFeatures(map, evt.pixel, evt.coordinate);
		}
	};
}

function handleMapClickEditEvent(map) {
	return evt => {
		if (!map.modify) {
			const layersMap = new Map();

			map.forEachFeatureAtPixel(
				evt.pixel,
				(feature, layer) => {
					if (!layersMap.has(layer)) {
						layersMap.set(layer, []);
					}
					layersMap.get(layer).push(feature);
				},
				{ hitTolerance: 5 }
			);

			const featuresByLayer = Array.from(layersMap, ([layer, features]) => ({
				layer,
				features,
			}));

			const firstFeature = featuresByLayer[0].features[0];
			const firstLayer = featuresByLayer[0].layer;

			clearSelectedEditGeometryFeature();
			startGeometryEdit({
				feature: firstFeature,
				layer: firstLayer,
			});
			return;
		}
	};
}

export function setMapClickEditEvent(map) {
	if (!map) return;
	console.log('setMapClickEditEvent');

	const handler = handleMapClickEditEvent(map);
	map._clickEditEvent = handler;
	map.on('click', handler);
}

export function unsetMapClickEditEvent(map) {
	if (!map || !map._clickEditEvent) return;

	map.un('click', map._clickEditEvent);
}
