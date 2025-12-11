import React, { useState, useRef } from 'react';
import { Collapse } from 'antd';
import { 
  MoreOutlined,
  MenuOutlined,
  CloseOutlined
} from '@ant-design/icons';
import './LayersPanel.css';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import styled from 'styled-components';
import { icons } from '../../icons';

import arrowDownIcon from '../../assets/resources/images/assets/icon-down-sort.png';
import arrowRightIcon from '../../assets/resources/images/assets/arrowRight.png';

const ItemTypes = {
  RASTER_LAYER: 'rasterLayer',
  VECTOR_LAYER: 'vectorLayer',
};

const RasterLayersList = ({ layers, moveLayer, toggleVisibility }) => {
  return (
    <LayersList>
      {layers.map((layer, index) => (
        <DraggableRasterLayer
          key={layer.get('id')}
          layer={layer}
          index={index}
          moveLayer={moveLayer}
          toggleVisibility={toggleVisibility}
        />
      ))}
    </LayersList>
  );
};

const VectorLayersList = ({ 
  layers, 
  moveLayer, 
  toggleVisibility, 
  onClickMore, 
  currentElementWithActions 
}) => {
  return (
    <LayersList>
      {layers.map((layer, index) => (
        <DraggableVectorLayer
          key={layer.id}
          layer={layer}
          index={index}
          id={layer.id}
          moveLayer={moveLayer}
          toggleVisibility={toggleVisibility}
          onClickMore={onClickMore}
          currentElementWithActions={currentElementWithActions}
        />
      ))}
    </LayersList>
  );
};

const DraggableRasterLayer = ({ layer, index, moveLayer, toggleVisibility }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.RASTER_LAYER,
    item: { index, id: layer.get('id') },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemTypes.RASTER_LAYER,
    hover: (draggedItem) => {
      if (draggedItem.index !== index) {
        moveLayer(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  const ref = useRef(null);
  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <RasterLayerElementContainer 
        active={layer.getVisible()}
        showTitle={true}
        isDragging={isDragging}
      >
        <DragHandle>
          <MenuOutlined />
        </DragHandle>
        <IconWrapper onClick={() => toggleVisibility(layer.get('id'), true)}>
          <img src={icons[layer.get('icon')]} width={24} height={24} alt={layer.get('descr')}/>
        </IconWrapper>
        <label 
          onClick={() => toggleVisibility(layer.get('id'), true)}
          title={layer.get('descr')}
        >
          {layer.get('descr')}
        </label>
      </RasterLayerElementContainer>
    </div>
  );
};

const DraggableVectorLayer = ({ 
  layer, 
  index, 
  moveLayer, 
  toggleVisibility, 
  onClickMore, 
  currentElementWithActions,
  id 
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.VECTOR_LAYER,
    item: { index, id: layer.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemTypes.VECTOR_LAYER,
    hover: (draggedItem) => {
      if (draggedItem.index !== index) {
        moveLayer(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  return (
    <div ref={(node) => drag(drop(node))} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <VectorLayerElementContainer 
        isActive={true}
        selected={layer.getVisible()}
        showTitle={true}
        isDragging={isDragging}
        className={currentElementWithActions === id ? 'show-actions' : ''}
      >
        <DragHandle>
          <MenuOutlined />
        </DragHandle>
        <label 
          onClick={() => toggleVisibility(layer.id, false)}
          title={layer.label}
        >
          {layer.label}
        </label>
        <div className="layer-actions">
          <MoreButton onClick={() => onClickMore(id)}>
            <MoreOutlined />
          </MoreButton>
          {currentElementWithActions === id && (
            <MoreActions>
              <ActionButton title="Свойства">⚙️</ActionButton>
              <ActionButton title="Экспорт">📤</ActionButton>
              <ActionButton title="Удалить" danger>🗑️</ActionButton>
            </MoreActions>
          )}
        </div>
      </VectorLayerElementContainer>
    </div>
  );
};

const LayersPanel = ({ baseRasterLayers = [], layers = [], onClose }) => {
  const [rasterLayers, setRasterLayers] = useState(baseRasterLayers);
  const [vectorLayers, setVectorLayers] = useState(layers);
  const [isRasterExpand, setRasterExpand] = useState(true);
  const [isVectorExpand, setVectorExpand] = useState(false);
  const [currentElementWithActions, setCurrentElementWithActions] = useState(-1);

  const toggleLayerVisibility = (layerId, isRaster = false) => {
    if (isRaster) {
      setRasterLayers(prev => prev.map(layer => {
        if (layer?.get('id') === layerId) {
          const newVisibility = !layer.getVisible();
          layer.setVisible(newVisibility);
        }
        return layer;
      }));
    } else {
      setVectorLayers(prev => prev.map(layer => {
        if (layer.id === layerId) {
          const newVisibility = !layer.getVisible();
          layer.setVisible(newVisibility);
        }
        return layer;
      }));
    }
  };

  const handleClickOnMore = (id) => {
    if (currentElementWithActions === id) {
      setCurrentElementWithActions(-1);
    } else {
      setCurrentElementWithActions(id);
    }
  };

  const moveRasterLayer = (fromIndex, toIndex) => {
    const newRasterLayers = [...rasterLayers];
    const [movedItem] = newRasterLayers.splice(fromIndex, 1);
    newRasterLayers.splice(toIndex, 0, movedItem);
    setRasterLayers(newRasterLayers);
    
    newRasterLayers.forEach((layer, index) => {
      if (typeof layer.setZIndex === 'function') {
        layer.setZIndex(newRasterLayers.length - index);
      }
    });
  };

  const moveVectorLayer = (fromIndex, toIndex) => {
    const newVectorLayers = [...vectorLayers];
    const [movedItem] = newVectorLayers.splice(fromIndex, 1);
    newVectorLayers.splice(toIndex, 0, movedItem);
    setVectorLayers(newVectorLayers);
    
    newVectorLayers.forEach((layer, index) => {
      if (typeof layer.setZIndex === 'function') {
        layer.setZIndex(newVectorLayers.length - index);
      }
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <LayersPanelContainer>
        <Header>
          <span>Слои</span>
          <CloseButton onClick={onClose}>
            <CloseOutlined />
          </CloseButton>
        </Header>
        
        <PanelContent>
          <LayersHeader onClick={() => setRasterExpand(!isRasterExpand)}>
            <MapLayersToggle closed={!isRasterExpand} />
            <label className="map-layers-toggle-label">Растровые слои</label>
          </LayersHeader>
          
          {isRasterExpand && (
            <RasterLayersList
                layers={rasterLayers}
                moveLayer={moveRasterLayer}
                toggleVisibility={toggleLayerVisibility}
            />
          )}

          <LayersHeader onClick={() => setVectorExpand(!isVectorExpand)}>
            <MapLayersToggle closed={!isVectorExpand} />
            <label className="map-layers-toggle-label">Векторные слои</label>
          </LayersHeader>
          
          {isVectorExpand && (
            <VectorLayersList
              layers={vectorLayers}
              moveLayer={moveVectorLayer}
              toggleVisibility={toggleLayerVisibility}
              onClickMore={handleClickOnMore}
              currentElementWithActions={currentElementWithActions}
            />
          )}
        </PanelContent>
      </LayersPanelContainer>
    </DndProvider>
  );
};

export default LayersPanel;

const DragHandle = styled.div`
  cursor: grab;
  color: #8c8c8c;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #1890ff;
  }
  
  &:active {
    cursor: grabbing;
  }
`;

const RasterLayerElementContainer = styled.div`
  display: grid;
  grid-template-columns: 30px 40px 1fr 20px; /* Добавляем столбец для DragHandle */
  align-content: center;
  border-top: 1px solid #4c93c2;
  padding: 2px;
  height: 32px;
  ${props => props.active && 'background-color: rgb(255, 175, 48, 0.7);'}
  align-items: center;
`;


const VectorLayerElementContainer = styled.div`
  display: grid;
  grid-template-columns: 30px 1fr 60px;
  align-content: center;
  line-height: 24px;
  font-size: 12px;
  height: 27px;
  border-top: 1px solid #ccc;
  align-items: center;
  padding: 2px;
  
  ${props => {
    if (!props.isActive) {
      return `
        pointer-events: none;
        opacity: 0.4;
      `;
    }
  }}
  
  ${props => props.selected && 'background-color: rgb(255, 175, 48, 0.7);'}
  
  .layer-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
  }
  
  .layer-visibility {
    color: #8c8c8c;
    font-size: 14px;
  }
`;


const LayersPanelContainer = styled.div`
  position: relative;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #4c93c2;
  border-radius: 8px;
  width: 300px;
  height: 100vh;
  overflow: hidden;
  color: rgb(0, 94, 154);
`;

const CloseButton = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  border-radius: 3px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const Header = styled.div`
  height: 32px;
  cursor: default;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgb(76 147 194 / 70%);
  border-top-left-radius: 7px;
  border-top-right-radius: 7px;
  color: white;
  position: relative; // Добавляем для позиционирования кнопки закрытия
`;

const PanelContent = styled.div`
  overflow: auto;
  height: calc(100% - 32px);
  padding: 0;
`;

const LayersHeader = styled.div`
  padding: 2px;
  display: flex;
  flex-direction: row;
  gap: 10px;
  border-top: 1px solid #4c93c2;
  height: 32px;
  align-items: center;
  align-content: center;
  cursor: pointer;
`;

const MapLayersToggle = styled.div`
  display: inline-block;
  position: relative;
  left: 5px;
  outline: 0;
  top: 1px;
  cursor: pointer;
  background: ${props => props.closed 
    ? `url(${arrowRightIcon}) no-repeat center`
    : `url(${arrowDownIcon}) no-repeat center`}; 
  background-size: contain;
  width: 15px;
  height: 15px;
  bottom: 5px;
`;

const LayersList = styled.div`
  padding: 0;
`;

const IconWrapper = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
`;

const MoreButton = styled.button`
  width: 18px;
  height: 18px;
  opacity: 0.6;
  cursor: pointer;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    opacity: 1;
  }
`;

const MoreActions = styled.div`
  width: 44px;
  height: 43px;
  overflow: hidden;
  background-color: rgb(255, 255, 255);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 5px;
  position: absolute;
  right: 20px;
  transform: translate(15px, -3px);
  box-shadow: rgba(0, 0, 0, 0.176) 0 6px 12px;
  z-index: 1;
  display: grid;
  grid-template-columns: 50% 50%;
  grid-template-rows: 50% 50%;
  
  &:after {
    content: "";
    border-bottom: 6px solid #ccc;
    border-right: 6px solid transparent;
    border-left: 6px solid transparent;
    position: absolute;
    top: -6px;
    right: 4px;
    z-index: 9; 
  }
  
  &:before {
    content: "";
    border-bottom: 5px solid #fff;
    border-right: 5px solid transparent;
    border-left: 5px solid transparent;
    position: absolute;
    top: -5px;
    right: 5px;
    z-index: 10;
  }
`;

const ActionButton = styled.button`
  width: 16px;
  height: 16px;
  display: inline-block;
  border: 1px solid rgb(204, 204, 204);
  border-radius: 16px;
  margin: 2px;
  cursor: pointer;
  background: none;
  
  &:hover {
    border-color: #ffab25;
  }
  
  ${props => !props.active && 'opacity: 0.5'}
`;
