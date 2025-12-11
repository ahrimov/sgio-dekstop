import React from 'react';
import { Button } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const ZoomControls = ({ map }) => {
  const handleZoomIn = () => {
    if (map) {
      const view = map.getView();
      const currentZoom = view.getZoom();
      view.animate({
        zoom: currentZoom + 1,
        duration: 250
      });
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const view = map.getView();
      const currentZoom = view.getZoom();
      view.animate({
        zoom: currentZoom - 1,
        duration: 250
      });
    }
  };

  return (
    <ZoomControlsContainer>
      <ZoomButton 
        type="primary" 
        icon={<PlusOutlined />}
        onClick={handleZoomIn}
        title="Увеличить"
      />
      <ZoomButton 
        type="primary" 
        icon={<MinusOutlined />}
        onClick={handleZoomOut}
        title="Уменьшить"
      />
    </ZoomControlsContainer>
  );
};

const ZoomControlsContainer = styled.div`
  position: absolute;
  right: 25px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
`;

const ZoomButton = styled(Button)`
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50% !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  
  border: none;
  min-width: 45px;
  padding: 0;

  .anticon {
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  &:hover {
    transform: scale(1.05);
    transition: transform 0.2s ease;
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

export default ZoomControls;