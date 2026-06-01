import { toNumber } from '../sqlQueryEngine/mathUtils.js';

/**
 * ILI data processing logic.
 * Ported from server/baseserver_ute-master/src/service/ute/ili/ili-import-xml/IliImportXml.js
 *
 * Processes parsed ILI data: validates anomaly types, assigns weld numbers,
 * calculates distances between welds, etc.
 */

/**
 * Validate anomaly type descriptions against the database dictionary.
 * Replaces unknown types with a default "НЕИЗВЕСТНО" value.
 *
 * @param {object[]} iliRows - Parsed ILI data rows
 * @param {object[]} typeRows - Anomaly type dictionary rows from DB (with CODE, EXTENDED_DESCRIPTION)
 * @returns {boolean|string} true if valid, error message string if invalid
 */
export function checkAnomalyTypes(iliRows, typeRows) {
	const rgx = /[*.?]|\s+/gi;

	// Find the default "unknown" anomaly description
	let defaultAnomalyDescription = 'НЕИЗВЕСТНО,НЕИЗВЕСТНО';
	for (const typeRow of typeRows) {
		const codeDescription = typeRow.CODE !== undefined ? typeRow.CODE : '0';
		 
		if (codeDescription == '0') {
			defaultAnomalyDescription = typeRow.EXTENDED_DESCRIPTION;
			break;
		}
	}

	for (const iliRow of iliRows) {
		const iliDescription = String(iliRow.ANOMALY_TYPE_CL).toUpperCase();

		// Skip welds
		if (iliRow.SOURCE === 'WLD') continue;

		// Empty description is invalid
		if (iliDescription === '') {
			console.warn('Bad data description: [Empty]');
			return 'Bad data description: [Empty]';
		}

		let foundType = false;
		const patternMatch = iliDescription.replace(rgx, '.*');

		for (const typeRow of typeRows) {
			const typeDescription = typeRow.EXTENDED_DESCRIPTION.toUpperCase();
			try {
				const testRegex = new RegExp(patternMatch);
				if (testRegex.test(typeDescription)) {
					foundType = true;
					break;
				}
			} catch {
				// If regex is invalid, try simple includes
				if (typeDescription.includes(iliDescription)) {
					foundType = true;
					break;
				}
			}
		}

		if (!foundType) {
			console.warn(`Bad data description: [${iliDescription}]`);
			iliRow.ANOMALY_TYPE_CL = defaultAnomalyDescription;
			console.info(`Set default value [${defaultAnomalyDescription}]`);
		}
	}

	return true;
}

/**
 * Sort data by odometer and assign weld numbers, distances, and wall thickness
 * to each defect row based on surrounding welds.
 *
 * @param {object[]} iliRows - Parsed ILI data rows
 * @returns {object[]} Processed rows with weld info assigned
 */
export function setWeldNums(iliRows) {
	// Sort: welds before defects at the same odometer, then by odometer ascending
	const rows = [...iliRows].sort((a, b) => {
		if (a.ABSOLUTE_ODOMETER === b.ABSOLUTE_ODOMETER) {
			return a.SOURCE === 'WLD' ? -1 : 1;
		}
		return a.ABSOLUTE_ODOMETER > b.ABSOLUTE_ODOMETER ? 1 : -1;
	});

	// Pass 1: Assign weld_number and nominal_wall_thickness from preceding weld
	let prevWeldNum = null;
	let nominalWallThickness = NaN;
	const isFirstWLD = rows.length > 0 && rows[0].SOURCE === 'WLD';

	if (!isFirstWLD) {
		// Find the first WLD to use as initial values
		for (const row of rows) {
			if (row.SOURCE === 'WLD') {
				prevWeldNum = row.WELD_NUMBER;
				nominalWallThickness = parseFloat(row.NOMINAL_WALL_THICKNESS);
				break;
			}
		}
	}

	for (const row of rows) {
		if (row.SOURCE === 'WLD') {
			prevWeldNum = row.WELD_NUMBER;
			nominalWallThickness = parseFloat(row.NOMINAL_WALL_THICKNESS);
			continue;
		}
		row.WELD_NUMBER = prevWeldNum;
		row.NOMINAL_WALL_THICKNESS = toNumber(nominalWallThickness);
	}

	// Pass 2: Assign US_WELD_NUMBER and US_WELD_ODOMETER (upstream weld)
	prevWeldNum = null;
	let prevAbsOdometer = null;

	for (const row of rows) {
		const lc = row.ABSOLUTE_ODOMETER;
		if (row.SOURCE === 'WLD') {
			if (prevWeldNum !== null) row.US_WELD_NUMBER = prevWeldNum;
			row.US_WELD_ODOMETER = prevAbsOdometer !== null ? prevAbsOdometer : null;
			prevWeldNum = row.WELD_NUMBER;
			prevAbsOdometer = toNumber(lc);
			continue;
		}
		row.US_WELD_NUMBER = prevWeldNum;
		row.US_WELD_ODOMETER = prevAbsOdometer;
	}

	// Pass 3: Assign DS_WELD_ODOMETER (downstream weld)
	let nextAbsOdometer = null;
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];

		// Find the next WLD element's ABSOLUTE_ODOMETER
		for (let j = i + 1; j < rows.length; j++) {
			if (rows[j].SOURCE === 'WLD') {
				nextAbsOdometer = rows[j].ABSOLUTE_ODOMETER;
				break;
			}
		}

		row.DS_WELD_ODOMETER = nextAbsOdometer;

		if (toNumber(nextAbsOdometer) === null) continue;
		if (row.SOURCE === 'WLD') {
			nextAbsOdometer = null;
		}
	}

	return rows;
}

/**
 * Find the first weld number in the dataset (by minimum odometer).
 * @param {object[]} rows - ILI data rows
 * @returns {string|null} First weld number (digits only) or null
 */
export function getFirstWeldNumber(rows) {
	let firstRow = null;
	let minLc = Number.MAX_VALUE;

	for (const row of rows) {
		const lc = parseFloat(row.ABSOLUTE_ODOMETER);
		const weldNumber = String(row.WELD_NUMBER || '');
		if (lc < minLc && weldNumber) {
			firstRow = row;
			minLc = lc;
		}
	}

	if (firstRow === null) return null;
	return String(firstRow.WELD_NUMBER).replace(/\D/g, '');
}
