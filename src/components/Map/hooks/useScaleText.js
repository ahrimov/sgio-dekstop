import { useState, useEffect, useCallback } from 'react';

const PIXELS_PER_CM = 43;


function formatDistance(meters) {
	if (meters >= 1000) {
		const km = meters / 1000;

		return `${Math.ceil(km)} км`;
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

		const view = map.getView();
		if (!view) return;

		const resolution = view.getResolution();
		if (resolution == null) return;

		const metersPerCm = resolution * PIXELS_PER_CM;

		setDistanceText(formatDistance(metersPerCm));
	}, [map]);

	useEffect(() => {
		if (!map) return;

		updateScale();

		const view = map.getView();
		view.on('change:resolution', updateScale);

		map.on('change:view', updateScale);

		return () => {
			view.un('change:resolution', updateScale);
			map.un('change:view', updateScale);
		};
	}, [map, updateScale]);

	return distanceText;
}
