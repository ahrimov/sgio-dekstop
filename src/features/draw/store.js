import { createEvent, createStore } from 'effector';

export const DRAWING_TYPE ='drawing';
export const EDITING_TYPE = 'geometry_edit';

export const startDrawing = createEvent();
export const cancelDrawing = createEvent();

export const startGeometryEdit = createEvent();
export const cancelGeometryEdit = createEvent();

export const $drawingState = createStore(null)
	.on(startDrawing, (_, layer) => ({ type: DRAWING_TYPE, layer, start: true }))
	.on(cancelDrawing, () => null)
	.on(startGeometryEdit, (_, { feature, layer }) => ({
		type: EDITING_TYPE,
		feature,
		layer,
		start: true,
	}))
	.on(cancelGeometryEdit, () => null)
