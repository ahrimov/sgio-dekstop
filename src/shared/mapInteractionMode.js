import { createEvent, createStore } from 'effector';

export const DEFAULT_INTERACTION = 'default';
export const INFO_INTERACTION = 'info';
export const DRAW_INTERACTION = 'draw';
export const GEOMETRY_EDIT_INTERACTION = 'geometry edit';

export const changeInteractionMode = createEvent();

export const $mapInteractionMode = createStore(DEFAULT_INTERACTION).on(
	changeInteractionMode,
	(_, payload) => payload
);
