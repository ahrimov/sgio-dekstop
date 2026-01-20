import { createEvent, createStore } from 'effector';

export const openLayerSelector = createEvent();
export const closeLayerSelector = createEvent();
export const $layerSelectorState = createStore(false)
	.on(openLayerSelector, () => true)
	.on(closeLayerSelector, () => false);
