/**
 * Filters a string to allow only valid float number characters.
 * Removes everything except digits and dots, and ensures only one dot is present.
 * @param {string} value - The input string
 * @returns {string} - Cleaned string representing a valid float
 */
export function convertStrToFloat(value) {
	return value.replace(/[^0-9.-]/g, '').replace(/(\..*?)\..*/g, '$1');
}

/**
 * Returns the decimal portion of a float number.
 * @param {number} float - The input float
 * @returns {number} - The decimal portion (0.xxx)
 */
function getDecimalPortion(float) {
	let string = float.toFixed(12);
	string = '0' + string.slice(string.indexOf('.'), string.length);
	return parseFloat(string);
}

/**
 * Converts a decimal degree value to degrees, minutes, seconds format string.
 * Format: "DD° MM' SS.SS''"
 * @param {number|string} value - Decimal degrees
 * @returns {string} - Formatted DMS string
 */
export function transformDecimalToMinutesAndSeconds(value) {
	const numValue = Math.abs(parseFloat(value));
	if (isNaN(numValue)) return "00° 00' 00.00''";

	let degreesStr = Math.floor(numValue).toString();
	const minutes = (getDecimalPortion(numValue) * 60).toFixed(5);
	const seconds = (getDecimalPortion(parseFloat(minutes)) * 60).toFixed(2);

	degreesStr = degreesStr.length === 1 ? '0' + degreesStr : degreesStr;
	let minutesStr = Math.trunc(parseFloat(minutes)).toString();
	minutesStr = minutesStr.length === 1 ? '0' + minutesStr : minutesStr;
	let secondsStr = seconds;
	secondsStr = secondsStr.length === 4 ? '0' + secondsStr : secondsStr;

	return `${degreesStr}° ${minutesStr}' ${secondsStr}''`;
}

/**
 * Converts a DMS format string back to decimal degrees.
 * Expects format: "DD° MM' SS.SS''"
 * @param {string} value - DMS formatted string
 * @returns {string} - Decimal degrees as string with 10 decimal places
 */
export function transformToDecimal(value) {
	const degrees = parseFloat(value.slice(0, value.indexOf('°')));
	const minutes = parseFloat(value.slice(value.indexOf('°') + 1, value.indexOf("'"))) / 60;
	const seconds = parseFloat(value.slice(value.indexOf("' ") + 1, value.indexOf("''"))) / 3600;
	const res = degrees + minutes + seconds;
	return (Math.trunc(res * 1e10) / 1e10).toFixed(10);
}

/**
 * Checks if a value is a finite number.
 * @param {*} value - The value to check
 * @returns {boolean}
 */
export function isNumber(value) {
	return typeof value === 'number' && isFinite(value);
}

/** Pixels per centimeter at 96 DPI */
const PIXELS_IN_SM = 37.795;

/**
 * Predefined metric scale array (in cm) used for snapping custom distance
 * to the nearest standard scale level.
 */
const METRIC_ARRAY = [
	20000000, 10000000, 8000000, 4000000, 2000000, 1000000, 500000, 200000, 100000, 50000, 25000,
	10000, 5000, 2500, 1500, 1000, 500, 200,
];

/**
 * Converts a custom distance (scale denominator in cm, i.e. "1 cm = X cm")
 * to an OpenLayers zoom level using the map's view resolution.
 *
 * The algorithm:
 * 1. Finds the closest standard metric scale from METRIC_ARRAY
 * 2. Builds a resolutions array where the matched index uses the custom distance
 * 3. Computes resolution as distance / 50 / PIXELS_IN_SM
 * 4. Uses map.getView().getZoomForResolution() to get the zoom level
 *
 * @param {number} replacedMetric - The custom distance in cm
 * @param {import('ol/Map').default} map - OpenLayers map instance
 * @returns {number} - The zoom level for the given distance
 */
export function constructZoomFromDistance(replacedMetric, map) {
	let res;
	const resolutions = [];
	let index = -1;

	for (let i = 0; i < METRIC_ARRAY.length; i++) {
		if (i + 1 !== METRIC_ARRAY.length) {
			if (METRIC_ARRAY[i] > replacedMetric && replacedMetric > METRIC_ARRAY[i + 1]) {
				const middle = (METRIC_ARRAY[i] + METRIC_ARRAY[i + 1]) / 2;
				if (replacedMetric <= middle) index = i + 1;
				else index = i;
			}
			if (METRIC_ARRAY[i] === replacedMetric) index = i;
		}
	}

	// Check edge cases: greater than max or less than min
	if (replacedMetric > METRIC_ARRAY[0]) index = 0;
	if (replacedMetric < METRIC_ARRAY[METRIC_ARRAY.length - 1]) index = METRIC_ARRAY.length - 1;

	if (index !== -1) {
		for (let i = 0; i < METRIC_ARRAY.length; i++) {
			if (i === index) resolutions.push(replacedMetric / 50 / PIXELS_IN_SM);
			else resolutions.push(METRIC_ARRAY[i] / 50 / PIXELS_IN_SM);
		}
	}

	if (index !== -1) res = resolutions[index];
	else res = -1;

	return map.getView().getZoomForResolution(res);
}
