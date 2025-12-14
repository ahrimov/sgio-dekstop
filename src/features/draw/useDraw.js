import React, { useRef } from 'react';
import { Button, Flex, Typography } from 'antd';
import { useState } from 'react';
import styled from 'styled-components';
import editGeometry from '../../assets/resources/images/assets/editGeometry.png';
import { useDrawGeometry } from './useDrawGeometry.js';
import { CloseOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

export function useDraw({ map, setCurrentFeature, buttonPosition = { y: 0, inverseX: 0 } }) {
  const [activeButton, setActiveButton] = useState(false);
  const {
    startDrawing,
    undo,
    reset,
    finishEditing,
    showUndoButton,
    acceptButtonDisabled,
    isDrawing,
    canReset,
    rejectCurrentFeature,
  } = useDrawGeometry({ map });
  const layerRef = useRef(null);

  const handleClickButton = () => setActiveButton(prev => !prev);

  const handleLayerSelector = layer => {
    startDrawing(layer);
    console.log(layer);
    layerRef.current = layer;
    setActiveButton(false);
  };

  const cancel = () => {
    setActiveButton(false);
    reset();
  };

  const drawButton = (
    <DrawButton active={activeButton} onClick={handleClickButton} top={buttonPosition.y} right={buttonPosition.inverseX}>
      <img src={editGeometry} />
    </DrawButton>
  );

    const handleFinishEditing = () => {
        const feature = finishEditing();
        if (feature) {
            setCurrentFeature(feature);
        }
    };

    const closeControlPanel = () => {
        reset();
    };

  const controlButtons = isDrawing && (
    <ControlPanel>
        <CloseButton onClick={closeControlPanel}>
            <CloseOutlined />
        </CloseButton>
        <Flex vertical gap={10} style={{width: '100%'}}>
            <Flex justify='center'>
                <Text style={{ color: 'rgb(17, 102, 162)' }}>{layerRef.current?.get('descr')}</Text>
            </Flex>
            <Flex justify='center' gap={10}>
                <ControlButton disabled={!canReset} onClick={() => canReset && rejectCurrentFeature()}>
                    <CloseOutlined style={{ color: 'red' }} />
                    Отменить
                </ControlButton>
                <ControlButton disabled={!showUndoButton} onClick={() => showUndoButton && undo()}>
                    <ReloadOutlined style={{color: 'black',  transform: 'scaleX(-1)' }} rotate={0} />
                </ControlButton>
                <ControlButton 
                    type="primary" 
                    onClick={handleFinishEditing}
                    disabled={acceptButtonDisabled}
                >
                    <CheckOutlined style={{color: 'black'}} />
                    Завершить
                </ControlButton>
            </Flex>
        </Flex>
    </ControlPanel>
  );

    return { 
        drawButton, 
        controlButtons, 
        activeButton, 
        cancel, 
        handleLayerSelector, 
        isDrawing,
        layer: layerRef.current, 
        rejectCurrentFeature,
    };
}

const DrawButton = styled(Button)`
  background-color: ${props => props.active ? '#e68a00' : '#4d94c2'} !important;
  border: 1px solid #005d98 !important;
  box-shadow: 0 0 0 #4d94c2 !important;
  position: absolute;
  border-radius: 20px;
  height: 40px;
  width: 40px;
  top: ${props => props.top}px;
  right: ${props => props.right}px;

  &:hover {
    background-color: #ff9900 !important;
    border-color: #3a7ba8 !important;
  }
`;

const ControlPanel = styled.div`
  position: absolute;
  top: 13px;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  background: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  height: 63px;
  width: 325px;
  color: rgb(17, 102, 162);
  border: 2px solid rgb(17, 102, 162);
  background-color: rgb(219 251 255 / 85%);
`;

const ControlButton = styled(Button)`
  font-size: 12px;
  white-space: nowrap;
  opacity: 1 !important;
  color: #ffffff !important;
  background-color: rgb(76, 147, 194) !important;
  border: 1px solid #005d98 !important;
  border-radius: 16px !important;
  cursor: pointer !important;

  &:hover {
    background-color: #ff9900 !important;
    border-color: #3a7ba8 !important;
  }

  &:disabled {
    opacity: 0.5 !important;
    cursor: default !important;

    &:hover {
        color: #ffffff !important;
        background-color: rgb(76, 147, 194) !important;
    }
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  color: rgb(17, 102, 162);
  padding: 2px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid;
  border-radius: 4px;
  background-color: white;
  
  &:hover {
    background: rgba(17, 102, 162, 0.1);
  }
`;
