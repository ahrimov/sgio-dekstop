import { createEvent, createStore } from 'effector';
import { iliImportComplete } from './iliImport.js';
import { iliReverseComplete } from './iliReverse.js';
import { getDbPath, reloadLayersByIds } from '../legacy/DBManage.js';
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
 * Fired whenever a virtual reper is inserted, updated, or soft-deleted.
 * Triggers reloadLayersByIds + recalculation without reper linking.
 */
export const virtMarkerChanged = createEvent();

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

// Reload ILI layers after report reversal so the map reflects reversed coordinates
iliReverseComplete.watch(() => {
  reloadLayersByIds(ILI_LAYER_IDS, layers).then(() => {
    setTimeout(zoomToIliLayer, 500);
  });
});

/**
 * Collect IDs of all loaded layers whose id starts with "SGIO_" (case-insensitive).
 * This matches the spec requirement to reload "sgio_%" layers after recalculation.
 */
function getSgioLayerIds() {
  return layers
    .filter(l => l.id && l.id.toUpperCase().startsWith('SGIO_'))
    .map(l => l.id);
}

/**
 * Reload all ILI / sgio_% layers after a virtual reper insert / update / soft-delete,
 * running coordinate recalculation (without reper linking) first so that all
 * VTD objects get their x_coord / y_coord recomputed from the updated PIKET table.
 *
 * @returns {Promise<void>}
 */
export async function refreshAfterVirtMarkerChange() {
  // 1. Run coordinate recalculation (no reper linking)
  try {
    const dbPath = getDbPath();
    if (dbPath) {
      // Use a minimal query — iliGetInspections references columns that may not exist
      const result = await electronAPI.executeSQL(
        dbPath,
        'SELECT ili_inspection_id FROM sgio_ili_inspection ORDER BY ili_inspection_id LIMIT 1'
      );
      const rows = result?.rows ?? [];
      if (rows.length > 0) {
        const inspectionId = rows[0].ili_inspection_id;
        console.log('[refreshAfterVirtMarkerChange] Running iliCalcCoordinatesNoLink for inspectionId:', inspectionId);
        await electronAPI.iliCalcCoordinatesNoLink(dbPath, { inspectionId });
        console.log('[refreshAfterVirtMarkerChange] Recalculation complete');
      } else {
        console.warn('[refreshAfterVirtMarkerChange] No inspections found — skipping recalculation');
      }
    }
  } catch (err) {
    console.error('[refreshAfterVirtMarkerChange] Coordinate recalculation failed:', err);
    // Continue with layer reload even if recalculation fails
  }

  // 2. Reload all sgio_% layers (includes ILI_LAYER_IDS and any future sgio layers)
  const sgioIds = getSgioLayerIds();
  if (sgioIds.length > 0) {
    await reloadLayersByIds(sgioIds, layers);
  }

  // 3. Fire refreshFeatureTable so any open attribute tables update their data
  refreshFeatureTable();
}

virtMarkerChanged.watch(() => {
  refreshAfterVirtMarkerChange().catch(err => {
    console.error('[virtMarkerChanged] error:', err);
  });
});
