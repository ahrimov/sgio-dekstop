import { createEvent, createStore } from 'effector';

export const setNumberOfLayers = createEvent();

export const $numberOfLayers = createStore(0)
  .on(setNumberOfLayers, (_, payload) => payload);
