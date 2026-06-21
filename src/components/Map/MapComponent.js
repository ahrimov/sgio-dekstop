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
import { $showOnMapFeatures, clearShowOnMap } from '../../store/showOnMap.js';
import { $showCrosshair } from '../../store/showCrosshair.js';
import { MapButtonsContainer } from '../MapButtons/MapButtonsContainer.jsx';
import { BottomLeftButtonsContainer } from '../MapButtons/BottomLeftButtonsContainer.jsx';
import FullscreenButton from './FullscreenButton.jsx';
import { useShowOnMapHighlight } from './hooks/useShowOnMapHighlight.js';
import { ScaleText } from './ScaleText.jsx';
import { showAlert } from '../../store/modalDialog.js';
import { openInfoModal } from '../InfoModal/store.js';
import { Dropdown, Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';

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

	const showOnMapFeatures = useUnit($showOnMapFeatures);

	// Apply highlight to features shown on map
	useShowOnMapHighlight(map, showOnMapFeatures);

	// Обработка показа объектов на карте (единая для одного и нескольких)
	useEffect(() => {
		if (!showOnMapFeatures || !map) return;

		const { layer, featureIds } = showOnMapFeatures;
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
			showAlert('Внимание', 'У выбранных объектов нет геометрии');
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
	}, [showOnMapFeatures, map]);

	// Обработчик клика на карту для сброса подсветки showOnMap
	useEffect(() => {
		if (!map) return;

		const handleMapClick = () => {
			// Сбрасываем подсветку при любом клике на карту
			if (showOnMapFeatures) {
				clearShowOnMap();
			}
		};

		map.on('click', handleMapClick);

		return () => {
			map.un('click', handleMapClick);
		};
	}, [map, showOnMapFeatures]);

	const {
		controlButtons,
		cancel: cancelEditing,
		layer,
		rejectCurrentFeature,
		restartDrawing,
	} = useDraw({ map, setCurrentFeature });

	const handleCancelLayerSelector = () => {
		cancelEditing();
	};

	const handleCloseAttributeView = () => {
		rejectCurrentFeature();
		setCurrentFeature(null);
		cancelEditing();
	};

	// Called after a new feature is saved — close the attribute panel and
	// immediately restart drawing on the same layer so the user can add
	// the next object without re-opening the draw panel.
	const handleAfterSave = () => {
		setCurrentFeature(null);
		restartDrawing();
	};

	const toggleFullscreen = () => {
		setIsFullscreen(!isFullscreen);
		setTimeout(() => {
			if (map) {
				map.updateSize();
			}
		}, 100);
	};

	const menuItems = [
		{
			key: 'about',
			label: 'О приложении',
			onClick: openInfoModal,
		},
	];

	return (
		<div className="map-container-wrapper">
			<div className={`map-wrapper ${isFullscreen ? 'map-fullscreen' : ''}`}>
				<div ref={mapContainerRef} className="map-container" />

				{showCrosshair && <img className="crosshair" src={crosshairImage} alt="crosshair" />}

				<FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />

				<ZoomControls map={map} />

				<div className="app-menu">
					<Dropdown
						menu={{ items: menuItems }}
						trigger={['click']}
						placement="bottomRight"
						overlayClassName="app-menu-dropdown"
					>
						<Button
							type="text"
							icon={<MenuOutlined />}
							className="app-menu-btn"
							style={{
								backgroundColor: 'rgba(255, 255, 255, 0.7)',
								opacity: 0.9,
								border: '1px solid rgb(76, 147, 194)',
								borderRadius: '8px',
								color: 'rgb(76, 147, 194)',
								width: '34px',
								height: '34px',
							}}
						/>
					</Dropdown>
				</div>

				<MapButtonsContainer />

				<BottomLeftButtonsContainer />
	
				<ScaleText map={map} />

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
							onAfterSave={handleAfterSave}
							initialFeature={currentFeature}
						/>
					)}
				{!isMapReady ? <div className="map-loading">Загрузка карты...</div> : null}
			</div>
		</div>
	);
};

export default MapComponent;
