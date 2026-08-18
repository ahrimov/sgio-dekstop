import { getPointResolution } from 'ol/proj.js';

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
 * Checks if a value is a finite number.
 * @param {*} value - The value to check
 * @returns {boolean}
 */
export function isNumber(value) {
	return typeof value === 'number' && isFinite(value);
}

/** CSS pixels per centimeter at 96 DPI. */
export const PIXELS_PER_CENTIMETER = 96 / 2.54;

/**
 * Returns the ground distance represented by one CSS centimeter on the map.
 *
 * @param {import('ol/Map').default} map - OpenLayers map instance
 * @param {number[]} [coordinate] - Coordinate in the view projection
 * @returns {number} - Ground distance in meters
 */
export function getGroundDistancePerCentimeter(map, coordinate) {
	if (!map) return 0;

	const view = map.getView();
	const resolution = view.getResolution();
	const targetCoordinate = coordinate ?? view.getCenter();
	if (resolution == null || !targetCoordinate) return 0;

	return (
		getPointResolution(view.getProjection(), resolution, targetCoordinate, 'm') *
		PIXELS_PER_CENTIMETER
	);
}

/**
 * Converts a custom distance (scale denominator in cm, i.e. "1 cm = X cm")
 * to an OpenLayers zoom level using the map's view resolution.
 *
 * @param {number} distanceInCentimeters - The custom distance in cm
 * @param {import('ol/Map').default} map - OpenLayers map instance
 * @param {number[]} [coordinate] - Target coordinate in the view projection
 * @returns {number} - The zoom level for the given distance
 */
export function constructZoomFromDistance(distanceInCentimeters, map, coordinate) {
	if (!map || !Number.isFinite(distanceInCentimeters) || distanceInCentimeters <= 0) return -1;

	const view = map.getView();
	const projection = view.getProjection();
	const targetCoordinate = coordinate ?? view.getCenter();
	const groundMetersPerPixel = distanceInCentimeters / 100 / PIXELS_PER_CENTIMETER;
	const groundMetersPerProjectionUnit = getPointResolution(projection, 1, targetCoordinate, 'm');
	const resolution = groundMetersPerPixel / groundMetersPerProjectionUnit;

	return view.getZoomForResolution(resolution);
}
