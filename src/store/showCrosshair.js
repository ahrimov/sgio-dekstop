import { createEvent, createStore } from 'effector';

export const toggleCrosshair = createEvent();
export const setCrosshairVisible = createEvent();

export const $showCrosshair = createStore(true)
	.on(toggleCrosshair, (state) => !state)
	.on(setCrosshairVisible, (_, payload) => payload);
