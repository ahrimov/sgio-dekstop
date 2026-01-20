import { useRef, useEffect, useState } from 'react';

import OlMap from 'ol/Map.js';
import View from 'ol/View.js';
import { defaults as defaultInteractions } from 'ol/interaction.js';
import { ScaleLine } from 'ol/control.js';
import { Select } from 'ol/interaction.js';
import { Style, Stroke, Fill, Circle } from 'ol/style.js';
import { currentMapView, baseRasterLayers } from '../../legacy/XMLParser.js';
import { layers } from '../../legacy/globals.js';
import { useUnit } from 'effector-react';
import { $mapInteractionMode, INFO_INTERACTION } from '../../shared/mapInteractionMode.js';
import { setMapClickInfoEvent, unsetMapClickInfoEvent } from './mapEvents/mapClickInfoEvent.js';

export const useMap = containerRef => {
	const mapInstance = useRef(null);
	const [isMapReady, setIsMapReady] = useState(false);
	const [mapStatus, setMapStatus] = useState('offline');
	const mapInteractionMode = useUnit($mapInteractionMode);

	const initializeMap = async () => {
		if (!containerRef.current) {
			console.error('Container not available');
			return;
		}

		try {
			const scaleLine = new ScaleLine({ units: 'metric' });

			mapInstance.current = new OlMap({
				target: containerRef.current,
				layers: [...baseRasterLayers, ...(layers || [])],
				view:
					currentMapView ||
					new View({
						center: [0, 0],
						zoom: 2,
						projection: 'EPSG:3857',
					}),
				controls: [scaleLine],
				interactions: defaultInteractions({
					altShiftDragRotate: false,
					pinchRotate: false,
				}),
			});

			setTimeout(() => {
				const canvas = containerRef.current.querySelector('canvas');
				if (canvas) {
					const context = canvas.getContext('2d');
					console.log('Canvas context:', context);
					console.log('Canvas attributes:', canvas.getContextAttributes?.());
				}
			}, 100);

			setTimeout(() => {
				if (mapInstance.current) {
					mapInstance.current.updateSize();
				}
			}, 100);

			mapInstance.current.on('moveend', handleMapMoveEnd);

			saveMapPosition();
			updateMapStatus();
			addSelectInteraction();

			window.map = mapInstance.current;
			setIsMapReady(true);
		} catch (error) {
			console.error('Error initializing map:', error);
		}
	};

	const updateMapSize = () => {
		if (mapInstance.current) {
			mapInstance.current.updateSize();
		}
	};

	useEffect(() => {
		const handleResize = () => {
			if (mapInstance.current) {
				setTimeout(() => {
					mapInstance.current.updateSize();
				}, 100);
			}
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	useEffect(() => {
		if (isMapReady && containerRef.current) {
			const observer = new ResizeObserver(() => {
				setTimeout(() => {
					if (mapInstance.current) {
						mapInstance.current.updateSize();
					}
				}, 50);
			});

			observer.observe(containerRef.current);

			return () => {
				observer.disconnect();
			};
		}
	}, [isMapReady]);

	useEffect(() => {
		if (mapInteractionMode === INFO_INTERACTION) {
			setMapClickInfoEvent(mapInstance.current);
		} else {
			unsetMapClickInfoEvent(mapInstance.current);
		}
	}, [mapInteractionMode]);

	const handleMapMoveEnd = () => {
		if (!mapInstance.current) return;

		const extent = mapInstance.current.getView().calculateExtent(mapInstance.current.getSize());
		let isOverflow = false;
		let nodeCount = 0;

		(window.layers || []).forEach(layer => {
			if (layer.visible && !isOverflow) {
				const source = layer.getSource();
				const features = source.getFeaturesInExtent(extent);

				for (let feature of features) {
					const coordinates = feature
						.getGeometry()
						.getCoordinates()
						.toString()
						.split(',');
					nodeCount += coordinates.length / 3;

					if (nodeCount > (window.numberNodesOnMap || 1000)) {
						layer.setVisible(false);
						isOverflow = true;
						break;
					}
				}
			}
		});
	};

	const updateMapStatus = () => {
		const visibleBaseLayers = (window.baseRasterLayers || []).filter(layer =>
			layer.get('visible')
		);
		const isOnline = visibleBaseLayers.some(layer => !layer.get('useLocalTiles'));

		setMapStatus(isOnline ? 'online' : 'offline');
	};

	const saveMapPosition = () => {
		if (window.saveMapPosition) {
			window.saveMapPosition();
		}
	};

	const addSelectInteraction = () => {
		if (!mapInstance.current) return;

		const selectInteraction = new Select({
			condition: () => false,
			multi: false,
			style: getFeatureStyle,
		});

		mapInstance.current.addInteraction(selectInteraction);

		mapInstance.current.on('click', () => {
			selectInteraction.getFeatures().clear();
		});
	};

	const getFeatureStyle = feature => {
		const geometry = feature.getGeometry();
		const geomType = geometry.getType();

		if (geomType.includes('LineString')) {
			return getLineStyle();
		} else if (geomType.includes('Polygon')) {
			return getPolygonStyle();
		} else if (geomType.includes('Point')) {
			return getPointStyle();
		}
		return null;
	};

	const getLineStyle = () => [
		new Style({
			stroke: new Stroke({ color: '#FFFFFF', width: 4 }),
		}),
		new Style({
			stroke: new Stroke({ color: '#FC580C', width: 2 }),
		}),
	];

	const getPolygonStyle = () => [
		new Style({
			stroke: new Stroke({ color: '#FFFFFF', width: 4 }),
		}),
		new Style({
			fill: new Fill({ color: 'rgba(255, 255, 255, 0.125)' }),
			stroke: new Stroke({ color: '#FC580C', width: 2 }),
		}),
	];

	const getPointStyle = () => [
		new Style({
			image: new Circle({
				radius: 4,
				fill: new Fill({ color: '#FC580C' }),
				stroke: new Stroke({ color: '#FFFFFF', width: 1 }),
			}),
		}),
	];

	const centerOnFeature = feature => {
		if (!mapInstance.current || !feature) return;

		const geometry = feature.getGeometry();
		const view = mapInstance.current.getView();
		const size = mapInstance.current.getSize();

		if (geometry.getType().includes('Point')) {
			const center =
				geometry.getType() === 'Point'
					? geometry.getCoordinates()
					: geometry.getCoordinates()[0];

			view.animate({
				center: center,
				zoom: 18,
				duration: 500,
			});
		} else {
			const extent = geometry.getExtent();
			view.fit(extent, {
				size: size,
				duration: 500,
				padding: [50, 50, 50, 50],
			});
		}
	};

	const findLayerById = layerId => {
		return (window.layers || []).find(layer => layer.id === layerId);
	};

	const findFeatureById = (layer, featureId) => {
		if (!layer) return null;
		const source = layer.getSource();
		const features = source.getFeatures();
		return features.find(feature => feature.id === featureId);
	};

	useEffect(() => {
		initializeMap();

		return () => {
			if (mapInstance.current) {
				mapInstance.current.setTarget(null);
				mapInstance.current = null;
			}
		};
	}, []);

	return {
		map: mapInstance.current,
		isMapReady,
		mapStatus,
		centerOnFeature,
		findLayerById,
		findFeatureById,
		updateMapSize,
	};
};
