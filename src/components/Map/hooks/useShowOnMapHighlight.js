import { useEffect, useRef } from 'react';
import { Style, Stroke, Fill, RegularShape } from 'ol/style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import { WHITE, ORANGE, BLACK } from '../../../consts/style.js';

/**
 * Hook for managing feature highlighting when showing on map.
 *
 * Instead of changing the style of the original feature (which stays in its
 * own layer and can be hidden behind other layers), we add cloned geometries
 * to a dedicated overlay vector layer with a very high zIndex.  This
 * guarantees the highlight is always rendered on top of every other layer.
 *
 * @param {Object} map - OpenLayers map instance
 * @param {Object} showOnMapFeatures - Features to highlight {layer, featureIds: [id1, id2, ...]}
 * @param {Object} infoHighlightFeature - Currently viewed feature in info panel {feature: <OL Feature>}
 * @returns {Function} clearHighlights - Function to manually clear all highlights
 */
export function useShowOnMapHighlight(map, showOnMapFeatures, infoHighlightFeature) {
	// Persistent reference to the overlay layer added to the map
	const overlayLayerRef = useRef(null);

	/**
	 * Lazily create (or return the existing) highlight overlay layer and
	 * ensure it is attached to the map.
	 */
	const getOverlayLayer = () => {
		if (!map) return null;

		if (!overlayLayerRef.current) {
			const layer = new VectorLayer({
				source: new VectorSource(),
				// Render on top of all other layers
				zIndex: 9999,
				// Avoid the layer appearing in any layer-switcher / legend
				properties: { title: '__showOnMapHighlight__' },
			});
			overlayLayerRef.current = layer;
			map.addLayer(layer);
		}

		return overlayLayerRef.current;
	};

	const clearHighlights = () => {
		const layer = overlayLayerRef.current;
		if (layer) {
			layer.getSource().clear();
		}
	};

	/**
	 * Build the appropriate highlight style based on geometry type.
	 */
	const buildHighlightStyle = (geometryType) => {
		if (geometryType === 'Point' || geometryType === 'MultiPoint') {
			return new Style({
				image: new RegularShape({
					points: 4,
					radius: 6,
					angle: Math.PI / 4,
					fill: new Fill({ color: ORANGE }),
					stroke: new Stroke({ color: BLACK, width: 1 }),
				}),
			});
		}

		// LineString / MultiLineString / Polygon / MultiPolygon / etc.
		return [
			new Style({
				stroke: new Stroke({ color: BLACK, width: 3 }),
			}),
			new Style({
				stroke: new Stroke({ color: WHITE, width: 2 }),
			}),
		];
	};

	const applyHighlightToFeature = (feature) => {
		const geometry = feature.getGeometry();
		if (!geometry) {
			console.log('drop feature, no geometry: ', feature);
			return;
		}

		const overlayLayer = getOverlayLayer();
		if (!overlayLayer) return;

		// Clone the geometry so the highlight feature is independent
		const clone = new Feature({
			geometry: geometry.clone(),
		});

		clone.setStyle(buildHighlightStyle(geometry.getType()));
		overlayLayer.getSource().addFeature(clone);
	};

	// Handle features highlight from showOnMap
	useEffect(() => {
		if (!map) return;

		// If showOnMapFeatures is null, clear highlights and return
		if (!showOnMapFeatures) {
			// Only clear if there is no info highlight keeping the overlay
			if (!infoHighlightFeature) clearHighlights();
			return;
		}

		// Clear previous highlights
		clearHighlights();

		const { layer, featureIds } = showOnMapFeatures;
		const source = layer.getSource();
		const allFeatures = source.getFeatures();

		allFeatures
			.filter(f => featureIds.includes(f.id))
			.forEach(feature => applyHighlightToFeature(feature));

		return () => {
			clearHighlights();
		};
	}, [showOnMapFeatures, map]);

	// Handle features highlight from info panel (currently viewed feature)
	useEffect(() => {
		if (!map) return;

		if (!infoHighlightFeature) {
			// Only clear if there is no showOnMapFeatures keeping the overlay
			if (!showOnMapFeatures) clearHighlights();
			return;
		}

		// Clear previous highlights
		clearHighlights();

		const { feature } = infoHighlightFeature;
		if (feature) {
			applyHighlightToFeature(feature);
		}

		return () => {
			clearHighlights();
		};
	}, [infoHighlightFeature, map]);

	// Clean up the overlay layer when the map changes or the component unmounts
	useEffect(() => {
		return () => {
			if (overlayLayerRef.current && map) {
				map.removeLayer(overlayLayerRef.current);
				overlayLayerRef.current = null;
			}
		};
	}, [map]);

	return clearHighlights;
}
