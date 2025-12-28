import { createEvent, createStore } from 'effector';

export const showInfo = createEvent();
export const $infoFeature = createStore(null)
  .on(showInfo, (_, payload) => payload);
