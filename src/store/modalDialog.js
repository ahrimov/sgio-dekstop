import { createEvent, createStore } from 'effector';

/**
 * Modal dialog store using Effector
 * Manages the state of a global modal dialog that can be called from anywhere
 */

// Events
export const openModal = createEvent();
export const closeModal = createEvent();
export const confirmModal = createEvent();
export const cancelModal = createEvent();

export const $modalDialog = createStore({
  isOpen: false,
  title: '',
  message: '',
  type: 'alert',
  onConfirm: null,
  onCancel: null,
  confirmText: 'OK',
  cancelText: 'Отмена',
})
  .on(openModal, (_, payload) => ({
    ...payload,
    isOpen: true,
  }))
  .on(closeModal, (state) => ({
    ...state,
    isOpen: false,
  }))
  .on(confirmModal, (state) => {
    if (state.onConfirm) {
      state.onConfirm();
    }
    return {
      ...state,
      isOpen: false,
    };
  })
  .on(cancelModal, (state) => {
    if (state.onCancel) {
      state.onCancel();
    }
    return {
      ...state,
      isOpen: false,
    };
  });


export function showAlert(title, message, confirmText = 'OK') {
  return new Promise((resolve) => {
    openModal({
      title,
      message,
      type: 'alert',
      onConfirm: () => {
        resolve(true);
      },
      onCancel: null,
      confirmText,
      cancelText: 'Отмена',
    });
  });
}

export function showConfirm(
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Отмена'
) {
  return new Promise((resolve) => {
    openModal({
      title,
      message,
      type: 'confirm',
      onConfirm: () => {
        resolve(true);
      },
      onCancel: () => {
        resolve(false);
      },
      confirmText,
      cancelText,
    });
  });
}