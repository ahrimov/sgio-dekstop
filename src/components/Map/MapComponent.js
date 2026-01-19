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
import AttributeForm from '../AttributeForm/AttributeForm.jsx';
import { $showOnMapFeature } from '../../shared/mapEvents.js';

const MapComponent = () => {
	const mapContainerRef = useRef(null);
	const { isMapReady, updateMapSize, map } = useMap(mapContainerRef);
	const [currentFeature, setCurrentFeature] = useState(null);

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
			const foundFeature = features.find(feature => feature.get('id') === featureId);
			if (!foundFeature) return;

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
		drawButton,
		controlButtons,
		activeButton: activeEditingButton,
		cancel: cancelEditing,
		handleLayerSelector,
		layer,
		rejectCurrentFeature,
	} = useDraw({ map, setCurrentFeature, buttonPosition: { y: 20, inverseX: 100 } });

	const handleCloseLayerSelector = () => {
		cancelEditing();
	};

	const handleSaveFeature = () => {
		setCurrentFeature(null);
	};

	const handleCancelCurrentFeature = () => {
		rejectCurrentFeature();
		setCurrentFeature(null);
		cancelEditing();
	};

	return (
		<div className="map-container-wrapper">
			<div className="map-wrapper">
				<div ref={mapContainerRef} className="map-container" />

				<img className="crosshair" src={crosshairImage} alt="crosshair" />

				<ZoomControls map={map} />

				{drawButton}

				{controlButtons}

				{activeEditingButton && (
					<LayerSelector
						handleLayerSelector={handleLayerSelector}
						onClose={handleCloseLayerSelector}
						vectorLayers={layers}
					/>
				)}
				{currentFeature && (
					<AttributeForm
						feature={currentFeature}
						layer={layer}
						onSave={handleSaveFeature}
						onCancel={handleCancelCurrentFeature}
					/>
				)}
				{!isMapReady ? <div className="map-loading">Загрузка карты...</div> : null}
			</div>
		</div>
	);
};

export default MapComponent;
