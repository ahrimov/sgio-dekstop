import React from 'react';

export function formatValue(atrib, value) {
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
	return value === undefined || value === null || value === '' ? (
		<span style={{ color: '#bbb' }}>—</span>
	) : (
		value
	);
}
