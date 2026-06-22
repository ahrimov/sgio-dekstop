import {
	startIliReverse,
	updateIliReverseProgress,
	iliReverseComplete,
	iliReverseError,
} from '../../store/iliReverse';

/**
 * Feature module for ILI report reversal ("Разворот отчета ВТД").
 * Handles the renderer-side orchestration: IPC calls, progress tracking.
 */

/**
 * Run the ILI report reversal process.
 *
 * @param {string} dbPath - Path to the Spatialite database
 * @param {object} params - Reversal parameters from the dialog form
 * @param {number} params.inspectionId - ILI inspection ID to reverse
 */
export async function runIliReverseReport(dbPath, params) {
	startIliReverse();

	// Subscribe to reversal progress events from the main process
	let unsubscribeReverse;
	if (window.electronAPI?.onIliReverseProgress) {
		unsubscribeReverse = window.electronAPI.onIliReverseProgress(({ step, message, percent }) => {
			updateIliReverseProgress({ step, message, percent });
		});
	}

	let result;
	try {
		result = await window.electronAPI.iliReverseReport(dbPath, params);
	} catch (err) {
		console.error('[ILI Reverse] Reversal failed:', err);
		iliReverseError(err);
		throw err;
	} finally {
		if (unsubscribeReverse) {
			unsubscribeReverse();
		}
	}

	iliReverseComplete(result);
	return result;
}

/**
 * Load available ILI inspections from the database for the reversal dialog dropdown.
 *
 * @param {string} dbPath - Path to the Spatialite database
 * @returns {Promise<Array<{ili_inspection_id: number, description: string}>>}
 */
export async function loadInspectionsForReverse(dbPath) {
	try {
		const inspections = await window.electronAPI.iliGetInspections(dbPath);
		return inspections || [];
	} catch (err) {
		console.error('[ILI Reverse] Failed to load inspections:', err);
		return [];
	}
}
