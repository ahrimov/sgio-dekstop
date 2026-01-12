import React, { useMemo } from 'react';
import FloatingWindow from '../FloatingWindow/FloatingWindow.jsx';
import styled from 'styled-components';

const LayerSelector = ({
  handleLayerSelector,
  onClose,
  vectorLayers = [],
}) => {
  const handleLayerSelect = layer => {
    onClose();
    handleLayerSelector(layer);
  };

  const initialPosition = useMemo(() => {
    if (typeof window === 'undefined') return { x: 100, y: 100 };

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const modalWidth = 360;
    const modalHeight = 460;

    return {
      x: Math.max(0, (windowWidth - modalWidth) / 2), 
      y: Math.max(0, (windowHeight - modalHeight) / 2),
    };
  }, []);

  return (
    <FloatingWindow initialPosition={initialPosition}>
      <FloatingWindowContainer>
        <FloatingHeader>
          <h3 style={{ margin: 0, fontSize: '14px' }}>Выберите слой</h3>
          <CloseButton onClick={onClose}>×</CloseButton>
        </FloatingHeader>

        <FloatingContent>
          <LayersList>
            {vectorLayers.map(layer => (
              <LayerItem key={layer.id} onClick={() => handleLayerSelect(layer)}>
                <LayerName>{layer.label || layer.get('name') || 'Без названия'}</LayerName>
              </LayerItem>
            ))}
            {vectorLayers.length === 0 && (
              <EmptyMessage>Нет доступных векторных слоев</EmptyMessage>
            )}
          </LayersList>
        </FloatingContent>
      </FloatingWindowContainer>
    </FloatingWindow>
  );
};

const FloatingWindowContainer = styled.div`
  border-radius: 8px;
  box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.2);
  background: white;
  overflow: hidden;
`;

const FloatingHeader = styled.div`
  background: #4d94c2;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  height: 34px;
  cursor: move;

  &:active {
    cursor: grabbing;
  }
`;

const FloatingContent = styled.div`
  padding: 16px;
  max-height: 400px;
  max-width: 360px;
  overflow-y: auto;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: white;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
  }
`;

const LayersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const LayerItem = styled.div`
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #4c93c2;

  &:hover {
    background: #e8f8fd;
  }
`;

const LayerName = styled.div`
  font-size: 14px;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 20px;
  color: #999;
`;

export default LayerSelector;
