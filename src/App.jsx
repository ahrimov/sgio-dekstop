import React, { useEffect, useState } from 'react';
import { LoadingProvider, useLoading } from './components/LoadingScreen/LoadingContext.js';
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen.jsx';
import { setProgressCallbacks, setConfigUpdateCallback } from './legacy/XMLParser.js';
import { setDBProgressCallbacks, loadAllLayers } from './legacy/DBManage.js';
import { ConfigProvider, Modal } from 'antd';
import { ConfigProvider as AppConfigProvider, useConfig } from './context/ConfigContext.jsx';
import MapComponent from './components/Map/MapComponent.js';
import LayersPanel from './components/LayersPanel/LayersPanel.jsx';
import { layers } from './legacy/globals.js';
import { baseRasterLayers } from './legacy/XMLParser.js';
import { Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import './App.css';
import { FeatureTable } from './components/FeatureTable/FeatureTable.jsx';
import ruRU from 'antd/es/locale/ru_RU';
import { useUnit } from 'effector-react';
import { InfoAttributeView } from './components/InfoAttributeView/InfoAttributeView.jsx';
import { $featureSelectorData, openFeatureSelector } from './store/openFeatureSelectronEvent.js';
import { FeaturesSelector } from './components/FeatureSelector/FeatureSelector.jsx';
import { $numberOfLayers } from './store/numberOfLayers.js';
import { $infoFeature, showInfo } from './store/featuredInfoEvent.js';
import { Taskbar } from './components/WindowControls/taskbar.jsx';
import { InfoModal } from './components/InfoModal/InfoModal.jsx';
import { AttributeComparisonDialog } from './components/KMLImport/AttributeComparisonDialog.jsx';
import {
	$kmlImportDialogData,
	closeKMLImportDialog,
	acceptKMLImport,
} from './store/kmlImportDialog.js';
import { importKML } from './legacy/KMLadapter.js';
import { DARK_BLUE } from './consts/style.js';
import { KMLImportProgress } from './components/KMLImport/KMLImportProgress.jsx';
import {
	$kmlImportProgress,
	startKMLImport,
	updateKMLImportProgress,
	finishKMLImport,
} from './store/kmlImportProgress.js';

const AppContent = () => {
	const { loadingState, startLoading, updateProgress, finishLoading } = useLoading();
	const { updateConfig } = useConfig();
	const [showLayersPanel, setShowLayersPanel] = useState(true);
	const [activeLayer, setActiveLayer] = useState(null);
	const infoFeature = useUnit($infoFeature);
	const featureSelectorData = useUnit($featureSelectorData);
	const numberOfLayers = useUnit($numberOfLayers);
	const kmlImportDialogData = useUnit($kmlImportDialogData);
	const kmlImportProgress = useUnit($kmlImportProgress);

	useEffect(() => {
		setProgressCallbacks({
			onStart: startLoading,
			onProgress: updateProgress,
			onFinish: finishLoading,
		});

		setConfigUpdateCallback(updateConfig);

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

		if (numberOfLayers && numberOfLayers === layers.length) {
			loadLayers();
		}
	}, [numberOfLayers, layers.length]);

	const toggleLayersPanel = () => {
		setShowLayersPanel(!showLayersPanel);
	};

	const closeLayersPanel = () => {
		setShowLayersPanel(false);
	};

	const handleFeaturesClick = layer => {
		setActiveLayer(layer);
	};

	const handleAcceptKMLImport = dict => {
		if (!kmlImportDialogData) return;

		const { layerId, features } = kmlImportDialogData;

		const loadingCallbacks = {
			startLoading: (total, message) => startKMLImport({ total, message }),
			updateProgress: (current, message) => updateKMLImportProgress({ current, message }),
			finishLoading: () => finishKMLImport(),
		};

		importKML(layerId, dict, features, loadingCallbacks);
		acceptKMLImport();
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
				{loadingState.total && !loadingState.visible ? (
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
								<FeatureTable key={activeLayer.id} layer={activeLayer} />
							</div>
						)}
					</div>
				) : null}
				{infoFeature && (
					<InfoAttributeView
						featureId={infoFeature.featureId}
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

				<Taskbar />
				<InfoModal />

				<KMLImportProgress
					visible={kmlImportProgress.visible}
					message={kmlImportProgress.message}
					current={kmlImportProgress.current}
					total={kmlImportProgress.total}
				/>

				{kmlImportDialogData && (
					<AttributeComparisonDialog
						visible={!!kmlImportDialogData}
						onClose={closeKMLImportDialog}
						layerAttributes={kmlImportDialogData.layerAttributes || []}
						kmlProperties={kmlImportDialogData.properties || []}
						onAccept={handleAcceptKMLImport}
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
		<AppConfigProvider>
			<ConfigProvider
				theme={{
					components: {
						Modal: {
							headerBg: DARK_BLUE,
						},
					},
				}}
			>
				<LoadingProvider>
					<AppContent />
				</LoadingProvider>
			</ConfigProvider>
		</AppConfigProvider>
	);
};

export default App;
