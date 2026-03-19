import React, { useRef, useState, useEffect } from 'react';
import { useMap } from './useMap.js';
import 'ol/ol.css';
import './styles.css';
import { useUnit } from 'effector-react';
import crosshairImage from '../../assets/resources/crosshair.png';
import ZoomControls from '../Controls/ZoomControls.jsx';
import LayerSelector from '../LayerSelector/LayerSelector.jsx';
import { layers } from '../../legacy/globals.js';
import { useDraw } from '../../features/draw/useDraw.js';
import { InfoAttributeView } from '../InfoAttributeView/InfoAttributeView.jsx';
import { $showOnMapFeature, $showMultipleOnMapFeatures } from '../../store/showOnMap.js';
import { $showCrosshair } from '../../store/showCrosshair.js';
import { MapButtonsContainer } from '../MapButtons/MapButtonsContainer.jsx';
import { BottomLeftButtonsContainer } from '../MapButtons/BottomLeftButtonsContainer.jsx';
import FullscreenButton from './FullscreenButton.jsx';

const MapComponent = () => {
	const mapContainerRef = useRef(null);
	const { isMapReady, updateMapSize, map, measureControlPanel, areaMeasureControlPanel } = useMap(mapContainerRef);
	const [currentFeature, setCurrentFeature] = useState(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const showCrosshair = useUnit($showCrosshair);

	useEffect(() => {
		if (isMapReady) {
			const timer = setTimeout(() => {
				updateMapSize();
			}, 200);

			return () => clearTimeout(timer);
		}
	}, [isMapReady, updateMapSize]);

	const showOnMapFeature = useUnit($showOnMapFeature);
	const showMultipleOnMapFeatures = useUnit($showMultipleOnMapFeatures);

	// Обработка показа одного объекта
	useEffect(() => {
		if (showOnMapFeature && map) {
			const { layer, featureId } = showOnMapFeature;
			const source = layer.getSource();
			const features = source.getFeatures();
			const foundFeature = features.find(feature => feature.id === featureId);
			if (!foundFeature) return;

			const geometry = foundFeature.getGeometry();
			if (!geometry) {
				window.alert('У выбранного объекта нет геометрии');
				return;
			}
			const extent = foundFeature.getGeometry().getExtent();
			map.getView().fit(extent, { duration: 200, maxZoom: 18, padding: [40, 40, 40, 40] });

			if (
				mapContainerRef?.current &&
				typeof mapContainerRef.current.scrollIntoView === 'function'
			) {
				mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	}, [showOnMapFeature, map]);

	// Обработка показа нескольких объектов
	useEffect(() => {
		if (showMultipleOnMapFeatures && map) {
			const { layer, featureIds } = showMultipleOnMapFeatures;
			const source = layer.getSource();
			const allFeatures = source.getFeatures();
			
			// Находим все выбранные объекты
			const foundFeatures = allFeatures.filter(feature =>
				featureIds.includes(feature.id)
			);

			if (foundFeatures.length === 0) return;

			// Фильтруем объекты с геометрией
			const featuresWithGeometry = foundFeatures.filter(feature => {
				const geometry = feature.getGeometry();
				return geometry != null;
			});

			if (featuresWithGeometry.length === 0) {
				window.alert('У выбранных объектов нет геометрии');
				return;
			}

			// Создаем общий extent для всех объектов
			let combinedExtent = null;
			featuresWithGeometry.forEach(feature => {
				const extent = feature.getGeometry().getExtent();
				if (combinedExtent === null) {
					combinedExtent = extent.slice(); // копируем extent
				} else {
					// Расширяем extent, чтобы включить текущий объект
					combinedExtent[0] = Math.min(combinedExtent[0], extent[0]); // minX
					combinedExtent[1] = Math.min(combinedExtent[1], extent[1]); // minY
					combinedExtent[2] = Math.max(combinedExtent[2], extent[2]); // maxX
					combinedExtent[3] = Math.max(combinedExtent[3], extent[3]); // maxY
				}
			});

			// Центрируем карту на всех объектах
			if (combinedExtent) {
				map.getView().fit(combinedExtent, {
					duration: 200,
					maxZoom: 18,
					padding: [40, 40, 40, 40]
				});

				if (
					mapContainerRef?.current &&
					typeof mapContainerRef.current.scrollIntoView === 'function'
				) {
					mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}
		}
	}, [showMultipleOnMapFeatures, map]);

	const {
		controlButtons,
		cancel: cancelEditing,
		layer,
		rejectCurrentFeature,
	} = useDraw({ map, setCurrentFeature });

	const handleCancelLayerSelector = () => {
		cancelEditing();
	};

	const handleCloseAttributeView = () => {
		rejectCurrentFeature();
		setCurrentFeature(null);
		cancelEditing();
	};

	const toggleFullscreen = () => {
		setIsFullscreen(!isFullscreen);
		setTimeout(() => {
			if (map) {
				map.updateSize();
			}
		}, 100);
	};

	return (
		<div className="map-container-wrapper">
			<div className={`map-wrapper ${isFullscreen ? 'map-fullscreen' : ''}`}>
				<div ref={mapContainerRef} className="map-container" />

				{showCrosshair && <img className="crosshair" src={crosshairImage} alt="crosshair" />}

				<FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />

				<ZoomControls map={map} />

				<MapButtonsContainer />

				<BottomLeftButtonsContainer />

				{controlButtons}

				{measureControlPanel}

				{areaMeasureControlPanel}

				<LayerSelector
					onCancel={handleCancelLayerSelector}
					vectorLayers={layers}
				/>

				{currentFeature && layer && (
					<InfoAttributeView
						featureId={currentFeature.get('id') || currentFeature.ol_uid}
						layer={layer}
						onClose={handleCloseAttributeView}
						initialFeature={currentFeature}
					/>
				)}
				{!isMapReady ? <div className="map-loading">Загрузка карты...</div> : null}
			</div>
		</div>
	);
};

export default MapComponent;
