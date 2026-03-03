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
import { $showOnMapFeature } from '../../store/showOnMap.js';
import { MapButtonsContainer } from '../MapButtons/MapButtonsContainer.jsx';
import FullscreenButton from './FullscreenButton.jsx';

const MapComponent = () => {
	const mapContainerRef = useRef(null);
	const { isMapReady, updateMapSize, map } = useMap(mapContainerRef);
	const [currentFeature, setCurrentFeature] = useState(null);
	const [isFullscreen, setIsFullscreen] = useState(false);

	useEffect(() => {
		if (isMapReady) {
			const timer = setTimeout(() => {
				updateMapSize();
			}, 200);

			return () => clearTimeout(timer);
		}
	}, [isMapReady, updateMapSize]);

	const showOnMapFeature = useUnit($showOnMapFeature);

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

				<img className="crosshair" src={crosshairImage} alt="crosshair" />

				<FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />

				<ZoomControls map={map} />

				<MapButtonsContainer />

				{controlButtons}

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
