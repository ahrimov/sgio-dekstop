import { createEvent, createStore } from 'effector';

export const showOnMap = createEvent();
export const $showOnMapFeature = createStore(null).on(showOnMap, (_, payload) => payload);