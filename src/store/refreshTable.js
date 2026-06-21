import { createEvent, createStore } from 'effector';
import { iliImportComplete } from './iliImport.js';
import { reloadLayersByIds } from '../legacy/DBManage.js';
import { layers } from '../legacy/globals.js';
import { showMultipleOnMap } from './showOnMap.js';

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

/**
 * Zoom the map to the extent of all features in the SGIO_ILI_DATA layer
 * by dispatching showMultipleOnMap — handled by MapComponent via useUnit($showOnMapFeatures).
 * Called after ILI import completes and layers are reloaded.
 */
function zoomToIliLayer() {
  try {
    const iliLayer = layers.find(l => l.id === 'SGIO_ILI_DATA');
    if (!iliLayer) return;

    const source = iliLayer.getSource?.();
    if (!source) return;

    const features = source.getFeatures();
    const featuresWithGeom = features.filter(f => f.getGeometry() != null);
    if (featuresWithGeom.length === 0) return;

    const featureIds = featuresWithGeom.map(f => f.id);
    showMultipleOnMap({ layer: iliLayer, featureIds });
  } catch (err) {
    console.warn('[ILI] zoomToIliLayer failed:', err);
  }
}

iliImportComplete.watch(() => {
  reloadLayersByIds(ILI_LAYER_IDS, layers).then(() => {
    // Give the map a moment to render the new features before zooming
    setTimeout(zoomToIliLayer, 500);
  });
});
