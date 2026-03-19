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
      <ZoomButtonPlus 
        type="primary" 
        icon={<PlusOutlined />}
        onClick={handleZoomIn}
        title="Увеличить"
      />
      <ZoomButtonMinus 
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
  top: 80%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
`;

const ZoomButtonPlus = styled(Button)`
  border-radius: 16px 16px 0px 0px;
    background: white;
    color: rgb(76, 147, 194);
    border: 1px solid;
    position: absolute;
    z-index: 10;
    cursor: pointer;
    bottom: 38px;
    width: 24px !important;
    height: 24px !important;
`;

const ZoomButtonMinus = styled(Button)`
  border-radius: 0px 0px 16px 16px;
  background: white;
  color: rgb(76, 147, 194);
  border: 1px solid;
  position: absolute;
  z-index: 10;
  cursor: pointer;
  bottom: 38px;
  width: 24px !important;
  height: 24px !important;
  top: -39px;
`;

export default ZoomControls;