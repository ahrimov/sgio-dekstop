import React, { useEffect, useState } from 'react';
import { LoadingProvider, useLoading } from './components/LoadingScreen/LoadingContext.js';
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen.jsx';
import { setProgressCallbacks } from './legacy/XMLParser.js';
import { setDBProgressCallbacks, loadAllLayers } from './legacy/DBManage.js';
import { ConfigProvider, Modal } from 'antd';
import MapComponent from './components/Map/MapComponent.js';
import LayersPanel from './components/LayersPanel/LayersPanel.jsx';
import { layers } from './legacy/globals.js';
import { baseRasterLayers } from './legacy/XMLParser.js';
import { Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import './App.css';
import { FeatureTable } from './components/FeatureTable/FeatureTable.jsx';
import ruRU from 'antd/es/locale/ru_RU';
import { $infoFeature, showInfo } from './shared/featured-info-event.js';
import { useUnit } from 'effector-react';
import InfoAttributeView from './components/InfoAttributeView/InfoAttributeView.js';
import { $featureSelectorData, openFeatureSelector } from './shared/openFeatureSelectronEvent.js';
import { FeaturesSelector } from './components/FeatureSelector/FeatureSelector.jsx';

const AppContent = () => {
	const { loadingState, startLoading, updateProgress, finishLoading } = useLoading();
	const [showLayersPanel, setShowLayersPanel] = useState(true);
	const [activeLayer, setActiveLayer] = useState(null);
	const infoFeature = useUnit($infoFeature);
	const featureSelectorData = useUnit($featureSelectorData);

	useEffect(() => {
		setProgressCallbacks({
			onStart: startLoading,
			onProgress: updateProgress,
			onFinish: finishLoading,
		});

		setDBProgressCallbacks(updateProgress, () => {});

		window.showAlert = (title, message) => {
			Modal.error({
				title: title,
				content: message,
				okText: 'OK',
				width: 400,
			});
		};

		return () => {
			window.showAlert = null;
		};
	}, [startLoading, updateProgress, finishLoading]);

	useEffect(() => {
		if (!layers.length) return;
		async function loadLayers() {
			try {
				startLoading(layers.length, 'Загрузка данных из базы данных');
				await loadAllLayers(layers);
				finishLoading();
			} catch (error) {
				console.error('Ошибка загрузки слоев:', error);
				finishLoading();
			}
		}
		loadLayers();
	}, [layers.length]);

	const toggleLayersPanel = () => {
		setShowLayersPanel(!showLayersPanel);
	};

	const closeLayersPanel = () => {
		setShowLayersPanel(false);
	};

	const handleFeaturesClick = layer => {
		setActiveLayer(layer);
	};

	return (
		<ConfigProvider locale={ruRU}>
			<div className="app">
				<div className="app-controls">
					{!showLayersPanel && (
						<div className="app-controls">
							<Button
								type="primary"
								icon={<MenuOutlined />}
								onClick={toggleLayersPanel}
								className="layers-toggle-btn"
							>
								Слои
							</Button>
						</div>
					)}
				</div>
				{loadingState.total && !loadingState.visible && (
					<div className="app-container">
						<div className="top-row">
							{showLayersPanel && (
								<div className="layers-panel-wrapper">
									<LayersPanel
										baseRasterLayers={baseRasterLayers}
										layers={layers}
										onClose={closeLayersPanel}
										handleFeaturesClick={handleFeaturesClick}
									/>
								</div>
							)}
							<div className={`map-content ${showLayersPanel ? 'with-panel' : ''}`}>
								<MapComponent />
							</div>
						</div>
						{activeLayer && (
							<div className="table-wrapper">
								<FeatureTable layer={activeLayer} />
							</div>
						)}
					</div>
				)}
				{infoFeature && (
					<InfoAttributeView
						feature={infoFeature.feature}
						layer={infoFeature.layer}
						onClose={() => showInfo(null)}
					/>
				)}

				{featureSelectorData?.length && (
					<FeaturesSelector
						featuresByLayer={featureSelectorData}
						onClose={() => openFeatureSelector(null)}
					/>
				)}

				<LoadingScreen
					visible={loadingState.visible}
					current={loadingState.current}
					total={loadingState.total}
					currentFile={loadingState.currentFile}
					message={loadingState.message}
				/>
			</div>
		</ConfigProvider>
	);
};

export const App = () => {
	return (
		<LoadingProvider>
			<AppContent />
		</LoadingProvider>
	);
};

export default App;
