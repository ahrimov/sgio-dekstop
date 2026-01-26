import { createEvent, createStore } from 'effector';

export const FINISH_EDITING = 'finish editing';
export const CANCEL_EDITING = 'cancel editing';

export const finishEditingGeometry = createEvent();
export const cancelEditingGeometry = createEvent();

export const $infoAttributeState = createStore(null)
	.on(finishEditingGeometry, () => ({ editingType: FINISH_EDITING }))
	.on(cancelEditingGeometry, () => ({ editingType: CANCEL_EDITING }));
