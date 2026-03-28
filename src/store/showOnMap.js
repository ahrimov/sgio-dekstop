import { createEvent, createStore } from 'effector';

export const showOnMap = createEvent();
export const showMultipleOnMap = createEvent();
export const clearShowOnMap = createEvent();

// Unified store for both single and multiple features
// Payload format: { layer, featureIds: [id1, id2, ...] }
export const $showOnMapFeatures = createStore(null)
	.on(showOnMap, (_, { layer, featureId }) => ({ layer, featureIds: [featureId] }))
	.on(showMultipleOnMap, (_, payload) => payload)
	.on(clearShowOnMap, () => null);

// Legacy stores for backward compatibility (deprecated)
export const $showOnMapFeature = createStore(null)
	.on(showOnMap, (_, payload) => payload)
	.on(clearShowOnMap, () => null);

export const $showMultipleOnMapFeatures = createStore(null)
	.on(showMultipleOnMap, (_, payload) => payload)
	.on(clearShowOnMap, () => null);