import { useEffect, useRef } from 'react';
import { Style, Stroke, Fill, RegularShape } from 'ol/style';
import { WHITE, ORANGE, BLACK } from '../../../consts/style.js';

/**
 * Hook for managing feature highlighting when showing on map
 * @param {Object} map - OpenLayers map instance
 * @param {Object} showOnMapFeatures - Features to highlight {layer, featureIds: [id1, id2, ...]}
 * @returns {Function} clearHighlights - Function to manually clear all highlights
 */
export function useShowOnMapHighlight(map, showOnMapFeatures) {
	const highlightedFeaturesRef = useRef([]);

	const clearHighlights = () => {
		highlightedFeaturesRef.current.forEach(({ feature, originalStyle }) => {
			if (feature) {
				if (originalStyle !== null) {
					feature.setStyle(originalStyle);
				} else {
					feature.setStyle(undefined);
				}
				// Clean up the stored original style property
				delete feature._originalStyleBeforeHighlight;
			}
		});
		highlightedFeaturesRef.current = [];
	};

	const applyHighlightToFeature = (feature) => {
		// Check if feature already has a saved original style to prevent overwriting
		let originalStyle;
		if (feature._originalStyleBeforeHighlight !== undefined) {
			// Feature is already highlighted, use the saved original style
			originalStyle = feature._originalStyleBeforeHighlight;
		} else {
			// First time highlighting, save the current style
			originalStyle = feature.getStyle();
			feature._originalStyleBeforeHighlight = originalStyle;
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
		highlightedFeaturesRef.current.push({ feature, originalStyle });
	};

	// Handle features highlight (both single and multiple)
	useEffect(() => {
		if (!map) return;

		// If showOnMapFeatures is null, clear highlights and return
		if (!showOnMapFeatures) {
			clearHighlights();
			return;
		}

		// Clear previous highlights
		clearHighlights();

		const { layer, featureIds } = showOnMapFeatures;
		const source = layer.getSource();
		const allFeatures = source.getFeatures();

		// Find and highlight all selected features
		const foundFeatures = allFeatures.filter(feature =>
			featureIds.includes(feature.id)
		);

		foundFeatures.forEach(feature => {
			applyHighlightToFeature(feature);
		});

		return () => {
			clearHighlights();
		};
	}, [showOnMapFeatures, map]);

	return clearHighlights;
}
