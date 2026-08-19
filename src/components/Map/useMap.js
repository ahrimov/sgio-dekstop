import React, { useRef, useEffect, useState } from 'react';

import OlMap from 'ol/Map.js';
import View from 'ol/View.js';
import { defaults as defaultInteractions } from 'ol/interaction.js';
import { ScaleLine } from 'ol/control.js';
import { Select } from 'ol/interaction.js';
import DragBox from 'ol/interaction/DragBox.js';
import { getCenter } from 'ol/extent.js';
import { Style, Stroke, Fill, Circle } from 'ol/style.js';
import { currentMapView } from '../../legacy/XMLParser.js';
import { layers } from '../../legacy/globals.js';
import { useUnit } from 'effector-react';
import {
	$mapInteractionMode,
	INFO_INTERACTION,
	ZOOM_IN_INTERACTION,
	ZOOM_OUT_INTERACTION,
	MEASURE_INTERACTION,
	MEASURE_AREA_INTERACTION,
	CHOOSE_GEOMETRY_EDIT_INTERACTION,
} from '../../store/mapInteractionMode.js';
import {
	setMapClickEditEvent,
	setMapClickInfoEvent,
	unsetMapClickEditEvent,
	unsetMapClickInfoEvent,
} from './mapEvents/mapClickInfoEvent.js';
import { $deletedMapLayer, $newMapLayer } from '../../store/updateMapLayers.js';
import { useMeasureInteraction } from './useMeasureInteraction.js';
import { useAreaMeasureInteraction } from './useAreaMeasureInteraction.js';
import { MeasureControlPanel } from './MeasureControlPanel.jsx';
import { AreaMeasureControlPanel } from './AreaMeasureControlPanel.jsx';
import { $rasterLayers } from '../../store/rasterLayers.js';

export const useMap = containerRef => {
	const mapInstance = useRef(null);
	const managedRasterLayers = useRef([]);
	const [isMapReady, setIsMapReady] = useState(false);
	const [mapStatus, setMapStatus] = useState('offline');
	const rasterLayers = useUnit($rasterLayers);
	const mapInteractionMode = useUnit($mapInteractionMode);
	const newMapLayer = useUnit($newMapLayer);
	const deletedMapLayer = useUnit($deletedMapLayer);

	const { currentLength } = useMeasureInteraction(
		mapInstance.current,
		mapInteractionMode === MEASURE_INTERACTION
	);
	const { currentArea } = useAreaMeasureInteraction(
		mapInstance.current,
		mapInteractionMode === MEASURE_AREA_INTERACTION
	);

	const initializeMap = async () => {
		if (!containerRef.current) {
			console.error('Container not available');
			return;
		}

		try {
			const scaleLine = new ScaleLine({ units: 'metric' });

			mapInstance.current = new OlMap({
				target: containerRef.current,
				layers: [...rasterLayers, ...(layers || [])],
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
			managedRasterLayers.current = [...rasterLayers];

			setTimeout(() => {
				if (mapInstance.current) {
					mapInstance.current.updateSize();
				}
			}, 100);

			mapInstance.current.on('moveend', handleMapMoveEnd);

			saveMapPosition();
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
		if (!mapInstance.current) return;

		if (mapInteractionMode === INFO_INTERACTION) {
			setMapClickInfoEvent(mapInstance.current);
		} else {
			unsetMapClickInfoEvent(mapInstance.current);
		}

		if (mapInteractionMode === ZOOM_IN_INTERACTION) {
			const dragBox = new DragBox({});
			let clickHandler = null;

			dragBox.on('boxend', () => {
				const extent = dragBox.getGeometry().getExtent();
				mapInstance.current.getView().fit(extent, {
					duration: 250,
					padding: [50, 50, 50, 50],
				});
			});

			mapInstance.current.addInteraction(dragBox);

			clickHandler = evt => {
				const view = mapInstance.current.getView();
				const currentZoom = view.getZoom();
				view.animate({
					center: evt.coordinate,
					zoom: currentZoom + 1,
					duration: 150,
				});
			};

			mapInstance.current.on('singleclick', clickHandler);

			return () => {
				if (mapInstance.current) {
					mapInstance.current.removeInteraction(dragBox);
					if (clickHandler) {
						mapInstance.current.un('singleclick', clickHandler);
					}
				}
			};
		}

		if (mapInteractionMode === ZOOM_OUT_INTERACTION) {
			const dragBox = new DragBox({});

			dragBox.on('boxend', () => {
				const view = mapInstance.current.getView();
				const boxExtent = dragBox.getGeometry().getExtent();
				const mapSize = mapInstance.current.getSize();
				const viewExtent = view.calculateExtent(mapSize);

				const boxCenter = getCenter(boxExtent);

				const boxWidth = boxExtent[2] - boxExtent[0];
				const boxHeight = boxExtent[3] - boxExtent[1];
				const viewWidth = viewExtent[2] - viewExtent[0];
				const viewHeight = viewExtent[3] - viewExtent[1];

				const ratioW = viewWidth / boxWidth;
				const ratioH = viewHeight / boxHeight;
				const ratio = Math.min(ratioW, ratioH);

				const currentZoom = view.getZoom();
				const zoomDelta = Math.log2(ratio);
				const newZoom = Math.max(view.getMinZoom(), currentZoom - zoomDelta);

				view.animate({
					center: boxCenter,
					zoom: newZoom,
					duration: 250,
				});
			});

			mapInstance.current.addInteraction(dragBox);

			const clickHandler = evt => {
				const view = mapInstance.current.getView();
				const currentZoom = view.getZoom();
				view.animate({
					center: evt.coordinate,
					zoom: currentZoom - 1,
					duration: 150,
				});
			};

			mapInstance.current.on('singleclick', clickHandler);

			return () => {
				if (mapInstance.current) {
					mapInstance.current.removeInteraction(dragBox);
					if (clickHandler) {
						mapInstance.current.un('singleclick', clickHandler);
					}
				}
			};
		}

		if (mapInteractionMode === CHOOSE_GEOMETRY_EDIT_INTERACTION) {
			setMapClickEditEvent(mapInstance.current);
		} else {
			unsetMapClickEditEvent(mapInstance.current);
		}
	}, [mapInteractionMode]);

	useEffect(() => {
		if (newMapLayer && mapInstance.current) {
			mapInstance.current.addLayer(newMapLayer);
		}
	}, [newMapLayer]);

	useEffect(() => {
		if (deletedMapLayer && mapInstance.current) {
			mapInstance.current.removeLayer(deletedMapLayer);
		}
	}, [deletedMapLayer]);

	useEffect(() => {
		if (!mapInstance.current) return;

		const nextRasterLayerSet = new Set(rasterLayers);
		const currentRasterLayerSet = new Set(managedRasterLayers.current);

		managedRasterLayers.current.forEach(layer => {
			if (!nextRasterLayerSet.has(layer)) {
				mapInstance.current.removeLayer(layer);
			}
		});

		rasterLayers.forEach(layer => {
			if (!currentRasterLayerSet.has(layer)) {
				mapInstance.current.addLayer(layer);
			}
		});

		managedRasterLayers.current = [...rasterLayers];
	}, [rasterLayers]);

	useEffect(() => {
		const isOnline = rasterLayers.some(layer => layer.get('sourceType') === 'remoteXYZ');
		setMapStatus(isOnline ? 'online' : 'offline');
	}, [rasterLayers]);

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
				managedRasterLayers.current = [];
			}
		};
	}, []);

	const measureControlPanel = mapInteractionMode === MEASURE_INTERACTION && (
		<MeasureControlPanel currentLength={currentLength} />
	);

	const areaMeasureControlPanel = mapInteractionMode === MEASURE_AREA_INTERACTION && (
		<AreaMeasureControlPanel currentArea={currentArea} />
	);

	return {
		map: mapInstance.current,
		isMapReady,
		mapStatus,
		centerOnFeature,
		findLayerById,
		findFeatureById,
		updateMapSize,
		measureControlPanel,
		areaMeasureControlPanel,
	};
};
