import { createEvent, createStore } from 'effector';
import { iliImportComplete } from './iliImport.js';
import { reloadLayersByIds } from '../legacy/DBManage.js';
import { layers } from '../legacy/globals.js';

export const refreshFeatureTable = createEvent();

export const $tableRefreshTrigger = createStore(0)
  .on(refreshFeatureTable, (count) => (count + 1) % 100)
  .on(iliImportComplete, (count) => (count + 1) % 100);

// ILI layer IDs that must be refreshed after every VTD import
const ILI_LAYER_IDS = [
  'SGIO_ILI_DATA',
  'SGIO_ILI_DATA_FEATURE',
  'SGIO_ILI_DATA_VIRT_MARKER',
  'SGIO_ILI_PIPE_LENGTH',
];

iliImportComplete.watch(() => {
  reloadLayersByIds(ILI_LAYER_IDS, layers);
});
