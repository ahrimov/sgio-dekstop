import { createEvent, createStore } from 'effector';

export const addLayerToMap = createEvent();
export const $newMapLayer = createStore(null)
    .on(addLayerToMap, (_, payload) => payload);

export const deleteLayerFromMap = createEvent();
export const $deletedMapLayer = createStore(null)
    .on(deleteLayerFromMap, (_, payload) => payload);