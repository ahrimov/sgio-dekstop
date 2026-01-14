import { createEvent, createStore } from 'effector';

export const refreshFeatureTable = createEvent();

export const $tableRefreshTrigger = createStore(0)
  .on(refreshFeatureTable, (count) => (count + 1) % 100);
