import React, { useEffect, useState } from 'react';
import { LoadingProvider, useLoading } from './components/LoadingScreen/LoadingContext';
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen';
import { setProgressCallbacks } from './legacy/XMLParser';
import { setDBProgressCallbacks, loadAllLayers } from './legacy/DBManage.js';
import { Modal } from 'antd';
import MapComponent from './components/Map/MapComponent.js';
import LayersPanel from './components/LayersPanel/LayersPanel.jsx';
import { layers } from './legacy/globals.js';
import { baseRasterLayers } from './legacy/XMLParser';
import { Button } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import "./App.css";

const AppContent = () => {
  const { loadingState, startLoading, updateProgress, finishLoading } = useLoading();
  const [showLayersPanel, setShowLayersPanel] = useState(true);

  useEffect(() => {
    setProgressCallbacks({
      onStart: startLoading,
      onProgress: updateProgress,
      onFinish: finishLoading
    });

    setDBProgressCallbacks(
      updateProgress,
      (layer) => {}
    );

    window.showAlert = (title, message) => {
      Modal.error({
        title: title,
        content: message,
        okText: 'OK',
        width: 400
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

  return (
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
          {showLayersPanel && (
            <div className="layers-panel-wrapper">
              <LayersPanel 
                baseRasterLayers={baseRasterLayers}
                layers={layers}
                onClose={closeLayersPanel}
              />
            </div>
          )}
          
          <div className={`map-content ${showLayersPanel ? 'with-panel' : ''}`}>
            <MapComponent />
          </div>
        </div>
      )}
      
      <LoadingScreen
        visible={loadingState.visible}
        current={loadingState.current}
        total={loadingState.total}
        currentFile={loadingState.currentFile}
        message={loadingState.message}
      />
    </div>
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