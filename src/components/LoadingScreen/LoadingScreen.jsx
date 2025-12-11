import React from 'react';
import { Modal, Progress, Typography, Space } from 'antd';

const { Text, Title } = Typography;

export const LoadingScreen = ({ 
  visible, 
  current = 0, 
  total = 0, 
  currentFile = '',
  message = 'Загрузка слоев карты'
}) => {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <Modal
      open={visible}
      closable={false}
      footer={null}
      width={450}
      centered
      maskClosable={false}
    >
      <Space style={{ width: '100%' }} size="middle">
        <Title level={4} style={{ margin: 0, textAlign: 'center' }}>
          {message}
        </Title>
        
        <Progress 
          percent={percent} 
          status={percent < 100 ? "active" : "success"}
          format={() => `${current}/${total}`}
        />
        
        {currentFile && (
          <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
            Текущий файл: {currentFile}
          </Text>
        )}
        
        <Text type="secondary" style={{ fontSize: '11px', textAlign: 'center', display: 'block' }}>
          Пожалуйста, подождите...
        </Text>
      </Space>
    </Modal>
  );
};