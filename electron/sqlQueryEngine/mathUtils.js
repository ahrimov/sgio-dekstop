/**
 * Math utility functions ported from server/baseserver_ute-master/src/utils/MathUtils.js
 * Used for type coercion when substituting parameters into SQL queries.
 */

/**
 * Convert value to a number, returning null for NaN/Infinity.
 * @param {*} value
 * @param {number} [fractionDigits]
 * @returns {number|null}
 */
export function toNumber(value, fractionDigits) {
	if (typeof value !== 'number') {
		value = parseFloat(value);
	}
	if (isNaN(value)) {
		return null;
	}
	if (!isFinite(value)) {
		return null;
	}
	if (value !== null && fractionDigits !== undefined) {
		try {
			value = Number(value.toFixed(fractionDigits));
		} catch (_ex) {
			// ignore
		}
	}
	return value;
}

/**
 * Convert value to string, treating undefined/null/'NULL'/'null' as null.
 * @param {*} value
 * @returns {string|null}
 */
export function toString(value) {
	if (value === undefined || value === null || value === 'NULL' || value === 'null') {
		return null;
	}
	return String(value);
}

/**
 * Convert value to datetime string, treating undefined/null/'NULL'/'null' as null.
 * @param {*} value
 * @returns {string|null}
 */
export function toDateTime(value) {
	if (value === undefined || value === null || value === 'NULL' || value === 'null') {
		return null;
	}
	return value;
}

/**
 * C#-style banker's rounding (round half to even).
 * @param {number} num
 * @param {number} [decimalPlaces=0]
 * @returns {number}
 */
export function evenRound(num, decimalPlaces) {
	const d = decimalPlaces || 0;
	const m = 10 ** d;
	const n = +(d ? num * m : num).toFixed(8);
	const i = Math.floor(n);
	const f = n - i;
	const e = 1e-8;
	const r = f > 0.5 - e && f < 0.5 + e ? (i % 2 === 0 ? i : i + 1) : Math.round(n);
	return d ? r / m : r;
}
