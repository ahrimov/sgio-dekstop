import { createEvent, createStore } from 'effector';

export const openInfoModal = createEvent();
export const closeInfoModal = createEvent();

export const $infoModalVisible = createStore(false)
    .on(openInfoModal, () => true)
    .on(closeInfoModal, () => false);
