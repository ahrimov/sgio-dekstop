import { createEvent, createStore } from 'effector';

/**
 * Effector store for virtual marker recalculation progress.
 * Shows a progress indicator after a virtual marker is saved
 * while coordinates are being recalculated and layers reloaded.
 */

export const startVirtMarkerRecalc = createEvent();
export const updateVirtMarkerRecalc = createEvent();
export const finishVirtMarkerRecalc = createEvent();

export const $virtMarkerRecalc = createStore({
  visible: false,
  percent: 0,
  message: '',
})
  .on(startVirtMarkerRecalc, (_, message) => ({
    visible: true,
    percent: 0,
    message: message || 'Пересчёт координат...',
  }))
  .on(updateVirtMarkerRecalc, (state, { percent, message }) => ({
    ...state,
    percent,
    message: message || state.message,
  }))
  .on(finishVirtMarkerRecalc, () => ({
    visible: false,
    percent: 0,
    message: '',
  }));
