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
			// Check if feature already has a saved original style to prevent overwriting
			if (feature._originalStyleBeforeHighlight !== undefined) {
				// Feature is already highlighted, use the saved original style
				originalStyleRef.current = feature._originalStyleBeforeHighlight;
			} else {
				// First time highlighting, save the current style
				originalStyleRef.current = feature.getStyle();
				feature._originalStyleBeforeHighlight = originalStyleRef.current;
			}

			const geometry = feature.getGeometry();
			const geometryType = geometry.getType();

			let highlightStyle;
			if (geometryType === 'Point' || geometryType === 'MultiPoint') {
				highlightStyle = new Style({
					image: new RegularShape({
						points: 4,
						radius: 6,
						angle: Math.PI / 4,
						fill: new Fill({ color: ORANGE }),
						stroke: new Stroke({ color: BLACK, width: 1 }),
					}),
				});
			} else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
				highlightStyle = [
					new Style({
						stroke: new Stroke({ color: BLACK, width: 3 }),
					}),
					new Style({
						stroke: new Stroke({ color: WHITE, width: 2 }),
					}),
				];
			} else {
				highlightStyle = [
					new Style({
						stroke: new Stroke({ color: BLACK, width: 3 }),
					}),
					new Style({
						stroke: new Stroke({ color: WHITE, width: 2 }),
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
			// Clean up the stored original style property
			delete feature._originalStyleBeforeHighlight;
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