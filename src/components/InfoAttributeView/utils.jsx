import React from 'react';

export function formatValue(atrib, value, showAllPrecision = false) {
	if (atrib.type === 'ENUM' && atrib.options) {
		return atrib.options?.[value] ?? value;
	}
	if (atrib.type === 'DATE' && value) {
		try {
			return new Date(value).toLocaleDateString();
		} catch {
			return value;
		}
	}
	if (
		!showAllPrecision &&
		value !== undefined &&
		value !== null &&
		value !== '' &&
		typeof value === 'number' &&
		(atrib.type === 'NUMBER' || atrib.type === 'FLOAT' || atrib.type === 'DOUBLE')
	) {
		return Number(value.toFixed(2));
	}
	return value === undefined || value === null || value === '' ? (
		<span style={{ color: '#bbb', }}>—</span>
	) : (
		value
	);
}
