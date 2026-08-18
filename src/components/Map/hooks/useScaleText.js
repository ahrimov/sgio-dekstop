import { useState, useEffect, useCallback } from 'react';
import { getGroundDistancePerCentimeter } from '../../../utils/coordinateTransformations.js';

function formatDistance(meters) {
	if (meters >= 1000) {
		const km = meters / 1000;
		const roundedKm = km >= 10 ? Math.round(km) : Number(km.toFixed(1));

		return `${roundedKm} км`;
	}
	if (meters >= 1) {
		return `${Math.round(meters)} м`;
	}
	if (meters >= 0.01) {
		return `${(meters * 100).toFixed(0)} см`;
	}
	return `${(meters * 1000).toFixed(0)} мм`;
}

export function useScaleText(map) {
	const [distanceText, setDistanceText] = useState('');

	const updateScale = useCallback(() => {
		if (!map) return;

		const metersPerCm = getGroundDistancePerCentimeter(map);
		if (!metersPerCm) return;

		setDistanceText(formatDistance(metersPerCm));
	}, [map]);

	useEffect(() => {
		if (!map) return;

		updateScale();

		const view = map.getView();
		view.on('change:resolution', updateScale);
		view.on('change:center', updateScale);

		map.on('change:view', updateScale);

		return () => {
			view.un('change:resolution', updateScale);
			view.un('change:center', updateScale);
			map.un('change:view', updateScale);
		};
	}, [map, updateScale]);

	return distanceText;
}
