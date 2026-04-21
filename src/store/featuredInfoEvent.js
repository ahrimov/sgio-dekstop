import { createEvent, createStore } from 'effector';

export const showInfo = createEvent();
export const showInfoMultiple = createEvent();

export const $infoFeature = createStore(null)
	.on(showInfo, (_, payload) => payload)
	.on(showInfoMultiple, (_, payload) => payload);
