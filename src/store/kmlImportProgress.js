import { createEvent, createStore } from 'effector';

export const startKMLImport = createEvent();
export const updateKMLImportProgress = createEvent();
export const finishKMLImport = createEvent();

export const $kmlImportProgress = createStore({
  visible: false,
  current: 0,
  total: 0,
  message: 'Импорт KML файла'
})
  .on(startKMLImport, (_, { total, message }) => ({
    visible: true,
    current: 0,
    total,
    message: message || 'Импорт KML файла'
  }))
  .on(updateKMLImportProgress, (state, { current, message }) => ({
    ...state,
    current,
    message: message || state.message
  }))
  .on(finishKMLImport, () => ({
    visible: false,
    current: 0,
    total: 0,
    message: 'Импорт KML файла'
  }));