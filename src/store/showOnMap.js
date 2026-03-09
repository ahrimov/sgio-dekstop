import { createEvent, createStore } from 'effector';

export const showOnMap = createEvent();
export const showMultipleOnMap = createEvent();
export const $showOnMapFeature = createStore(null).on(showOnMap, (_, payload) => payload);
export const $showMultipleOnMapFeatures = createStore(null).on(showMultipleOnMap, (_, payload) => payload);