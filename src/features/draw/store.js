import { createEvent, createStore } from 'effector';

export const startDrawing = createEvent();
export const stopDrawing = createEvent();
export const $drawingState = createStore(null)
	.on(startDrawing, (_, payload) => {
		return { start: true, layer: payload };
	})
	.on(stopDrawing, () => {
		return { start: false };
	});
