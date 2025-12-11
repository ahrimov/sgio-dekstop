import React, { useRef, useState, useEffect } from 'react';
import { useMap } from './useMap';
import 'ol/ol.css';
import './styles.css';
import crosshairImage from '../../assets/resources/crosshair.png';
import ZoomControls from '../Controls/ZoomControls';
import LayerSelector from '../LayerSelector/LayerSelector';
import { layers } from '../../legacy/globals';
import { useDraw } from '../../features/draw/useDraw';
import AttributeForm from '../AttributeForm/AttributeForm';

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

  const {
    drawButton,
    controlButtons,
    activeButton: activeEditingButton,
    cancel: cancelEditing,
    handleLayerSelector,
    layer,
    rejectCurrentFeature,
  } = useDraw({ map, setCurrentFeature, buttonPosition: {y: 20, inverseX: 100 } });

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
