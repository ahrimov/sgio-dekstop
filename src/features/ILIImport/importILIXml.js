import {
	startIliImport,
	updateIliImportProgress,
	iliImportComplete,
	iliImportError,
} from '../../store/iliImport';

/**
 * Feature module for ILI XML import.
 * Handles the renderer-side orchestration: file dialog, IPC calls, progress tracking.
 */

/**
 * Run the ILI XML import process.
 * If params.doCalcCoordinates is true, also runs coordinate calculation after import.
 *
 * @param {string} dbPath - Path to the Spatialite database
 * @param {object} params - Import parameters from the dialog form
 * @param {string} params.xmlFilePath - Path to the ILI XML file
 * @param {number|string} params.routeId - Route/pipe ID
 * @param {string} params.kmStart - Start kilometer
 * @param {string} params.kmEnd - End kilometer
 * @param {string} params.date - Inspection date (DD.MM.YYYY)
 * @param {string} [params.company] - Vendor company
 * @param {string} [params.format] - Report format
 * @param {string} [params.sourceGcl] - Source GCL
 * @param {string} [params.model] - Tool model
 * @param {boolean} [params.doCalcCoordinates] - Whether to run coordinate calculation after import
 */
export async function runIliXmlImport(dbPath, params) {
	startIliImport();

	// Subscribe to import progress events from the main process
	let unsubscribeImport;
	if (window.electronAPI?.onIliImportProgress) {
		unsubscribeImport = window.electronAPI.onIliImportProgress(({ step, message, percent }) => {
			updateIliImportProgress({ step, message, percent });
		});
	}

	let importResult;
	try {
		importResult = await window.electronAPI.iliImportXml(dbPath, params);
	} catch (err) {
		console.error('ILI Import failed:', err);
		iliImportError(err);
		throw err;
	} finally {
		if (unsubscribeImport) {
			unsubscribeImport();
		}
	}

	// Phase 2: Run coordinate calculation if requested and we have an inspection ID
	if (params.doCalcCoordinates && importResult?.inspectionId) {
		let unsubscribeCalc;
		try {
			if (window.electronAPI?.onIliCalcProgress) {
				unsubscribeCalc = window.electronAPI.onIliCalcProgress(({ step, message, percent }) => {
					updateIliImportProgress({ step, message, percent });
				});
			}

			updateIliImportProgress({
				step: 'calc',
				message: 'Расчёт координат дефектов...',
				percent: 0,
			});

			const calcParams = {
				inspectionId: importResult.inspectionId,
				routeId: params.routeId,
				// DEBUG: log what is passed to coordinate calc to verify kmStart presence
				// TODO: kmStart should be passed here for correct odometer offset in fallback mode
			};
			console.log('[ILI Debug] calcParams sent to ili-calc-coordinates:', JSON.stringify(calcParams));
			console.log('[ILI Debug] params.kmStart available but NOT passed:', params.kmStart, '| params.kmEnd:', params.kmEnd);
	
			await window.electronAPI.iliCalcCoordinates(dbPath, calcParams);

			updateIliImportProgress({
				step: 'calc',
				message: 'Расчёт координат завершён',
				percent: 100,
			});
		} catch (calcErr) {
			// Coordinate calculation failure is non-fatal — import already succeeded.
			// Log the error and continue so the user still gets the imported data.
			console.error('ILI coordinate calculation failed:', calcErr);
			updateIliImportProgress({
				step: 'calc',
				message: `Ошибка расчёта координат: ${calcErr?.message ?? calcErr}`,
				percent: 0,
			});
		} finally {
			if (unsubscribeCalc) {
				unsubscribeCalc();
			}
		}
	}

	iliImportComplete(importResult);
	return importResult;
}

/**
 * Open a file dialog to select an ILI XML file.
 * @returns {Promise<string|null>} Selected file path or null if cancelled
 */
export async function selectIliXmlFile() {
	return await window.electronAPI.openFileDialog({
		title: 'Выберите файл отчета ВТД (XML)',
		filters: [
			{ name: 'XML файлы', extensions: ['xml'] },
			{ name: 'Все файлы', extensions: ['*'] },
		],
		properties: ['openFile'],
	});
}

/**
 * Load available routes from the database for the import dialog.
 * @param {string} dbPath - Path to the Spatialite database
 * @returns {Promise<Array<{route_id: number, description: string}>>}
 */
export async function loadRoutes(dbPath) {
	try {
		const routes = await window.electronAPI.iliGetRoutes(dbPath);
		return routes || [];
	} catch (err) {
		console.error('Failed to load routes:', err);
		return [];
	}
}
