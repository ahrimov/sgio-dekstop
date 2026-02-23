import { createEvent, createStore } from 'effector';

export const openKMLImportDialog = createEvent();
export const closeKMLImportDialog = createEvent();
export const acceptKMLImport = createEvent();

export const $kmlImportDialogData = createStore(null)
  .on(openKMLImportDialog, (_, payload) => payload)
  .on(closeKMLImportDialog, () => null)
  .on(acceptKMLImport, () => null);