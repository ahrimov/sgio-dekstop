import { createEvent, createStore } from 'effector';

export const openFeatureSelector = createEvent();
export const $featureSelectorData = createStore(null)
  .on(openFeatureSelector, (_, payload) => payload);
