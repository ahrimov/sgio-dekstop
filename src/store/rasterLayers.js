import { createEvent, createStore } from 'effector';

export const setRasterLayers = createEvent();
export const toggleRasterLayerVisibility = createEvent();
export const reorderRasterLayers = createEvent();

export const $rasterLayers = createStore([])
	.on(setRasterLayers, (_, rasterLayers) => [...rasterLayers])
	.on(toggleRasterLayerVisibility, (rasterLayers, layerId) =>
		applyRasterLayerVisibilityToggle(rasterLayers, layerId)
	)
	.on(reorderRasterLayers, (rasterLayers, indexes) =>
		applyRasterLayerReorder(rasterLayers, indexes)
	);

export function applyRasterLayerVisibilityToggle(rasterLayers, layerId) {
	const targetLayer = rasterLayers.find(layer => layer.get('id') === layerId);

	if (!targetLayer) return rasterLayers;

	targetLayer.setVisible(!targetLayer.getVisible());

	return [...rasterLayers];
}

export function applyRasterLayerReorder(rasterLayers, indexes) {
	const { fromIndex, toIndex } = indexes || {};

	if (
		!Number.isInteger(fromIndex) ||
		!Number.isInteger(toIndex) ||
		fromIndex < 0 ||
		toIndex < 0 ||
		fromIndex >= rasterLayers.length ||
		toIndex >= rasterLayers.length ||
		fromIndex === toIndex
	) {
		return rasterLayers;
	}

	const reorderedLayers = [...rasterLayers];
	const [movedLayer] = reorderedLayers.splice(fromIndex, 1);
	reorderedLayers.splice(toIndex, 0, movedLayer);

	reorderedLayers.forEach((layer, index) => {
		layer.setZIndex(reorderedLayers.length - index);
	});

	return reorderedLayers;
}
