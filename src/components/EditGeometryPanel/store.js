import { createEvent, createStore } from 'effector';

export const openEditGeometryPanel = createEvent();
export const closeEditGeometryPanel = createEvent();
export const setEditGeometryFeatureSelectionMode = createEvent();
export const setSelectedEditGeometryFeature = createEvent();
export const clearSelectedEditGeometryFeature = createEvent();

export const $editGeometryPanelVisible = createStore(false)
	.on(openEditGeometryPanel, () => true)
	.on(closeEditGeometryPanel, () => false);

export const $isEditGeometryFeatureSelectionMode = createStore(false)
	.on(setEditGeometryFeatureSelectionMode, (_, payload) => payload)
	.on(closeEditGeometryPanel, () => false);

export const $selectedEditGeometryFeature = createStore(null)
	.on(setSelectedEditGeometryFeature, (_, payload) => payload)
	.on(clearSelectedEditGeometryFeature, () => null)
	.on(closeEditGeometryPanel, () => null);
