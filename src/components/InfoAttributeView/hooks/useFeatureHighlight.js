import { useEffect, useRef } from 'react';
import { Style, Stroke, Fill, RegularShape } from 'ol/style';
import { WHITE, ORANGE, BLACK } from '../../../consts/style.js';

/**
 * Hook for managing feature highlighting on the map
 * @param {Object} feature - OpenLayers feature object
 * @param {boolean} isGeometryEditing - Whether geometry is being edited
 */
export function useFeatureHighlight(feature, isGeometryEditing) {
	const originalStyleRef = useRef(null);

	useEffect(() => {
		if (!feature) return;

		const applyHighlight = () => {
			originalStyleRef.current = feature.getStyle();

			const geometry = feature.getGeometry();
			const geometryType = geometry.getType();

			let highlightStyle;
			if (geometryType === 'Point' || geometryType === 'MultiPoint') {
				highlightStyle = new Style({
					image: new RegularShape({
						points: 4,
						radius: 10,
						angle: Math.PI / 4,
						fill: new Fill({ color: ORANGE }),
						stroke: new Stroke({ color: BLACK, width: 2 }),
					}),
				});
			} else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
				highlightStyle = [
					new Style({
						stroke: new Stroke({ color: BLACK, width: 6 }),
					}),
					new Style({
						stroke: new Stroke({ color: WHITE, width: 4 }),
					}),
				];
			} else {
				highlightStyle = [
					new Style({
						stroke: new Stroke({ color: BLACK, width: 6 }),
					}),
					new Style({
						stroke: new Stroke({ color: WHITE, width: 4 }),
					}),
				];
			}

			feature.setStyle(highlightStyle);
		};

		const removeHighlight = () => {
			if (originalStyleRef.current !== null) {
				feature.setStyle(originalStyleRef.current);
				originalStyleRef.current = null;
			} else {
				feature.setStyle(undefined);
			}
		};

		if (!isGeometryEditing) {
			applyHighlight();
		} else {
			removeHighlight();
		}

		return () => {
			removeHighlight();
		};
	}, [feature, isGeometryEditing]);
}