import { createEvent, createStore } from 'effector';

export const DEFAULT_INTERACTION = 'default';
export const INFO_INTERACTION = 'info';
export const DRAW_INTERACTION = 'draw';
export const GEOMETRY_EDIT_INTERACTION = 'geometry edit';
export const ZOOM_IN_INTERACTION = 'zoom_in';
export const ZOOM_OUT_INTERACTION = 'zoom_out';
export const MEASURE_INTERACTION = 'measure';
export const MEASURE_AREA_INTERACTION = 'measure_area';

export const changeInteractionMode = createEvent();

export const $mapInteractionMode = createStore(DEFAULT_INTERACTION).on(
	changeInteractionMode,
	(_, payload) => payload
);
