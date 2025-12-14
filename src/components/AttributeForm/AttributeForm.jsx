import React, { useState, useEffect, useMemo } from 'react';
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Typography, 
  Card, 
  Space,
  Alert,
  DatePicker,
} from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import FloatingWindow from '../FloatingWindow/FloatingWindow.jsx';
import "./style.css";
import { addNewFeature } from '../../features/saveFeature/addNewFeature.js';

const { Title } = Typography;
const { Option } = Select;

const AttributeForm = ({ feature, layer, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

    const initialPosition = useMemo(() => {
      if (typeof window === 'undefined') return { x: 100, y: 100 };
  
      const windowWidth = window.innerWidth;
      const modalWidth = 360;
  
      return {
        x: Math.max(0, (windowWidth - modalWidth) / 2), 
        y: 100,
      };
    }, []);

  useEffect(() => {
    if (feature && layer?.atribs) {
      const initialValues = {};
      layer.atribs.forEach(atrib => {
        initialValues[atrib.name] = feature.get(atrib.name) || '';
      });
      form.setFieldsValue(initialValues);
    }
  }, [feature, layer, form]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      Object.keys(values).forEach(key => {
        feature.set(key, values[key]);
      });
      
      addNewFeature(layer, feature);
      onSave(feature);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFormItem = (atrib) => {
    const rules = [];

    if (atrib.type === 'NUMBER' || atrib.type === 'DOUBLE') {
      rules.push({
        validator: (_, value) => {
          if (value && isNaN(Number(value))) {
            return Promise.reject(new Error('Must be a number'));
          }
          return Promise.resolve();
        },
      });
    }

    switch (atrib.type) {
      case 'ENUM':
        return (
          <Form.Item
            key={atrib.name}
            name={atrib.name}
            label={atrib.label || atrib.name}
            rules={rules}
          >
            <Select placeholder={`Выберите ${atrib.label || atrib.name}`}>
              {Object.entries(atrib.options).map(([value, label], index) => (
                <Option key={index} value={value}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );
      
      case 'NUMBER':
      case 'DOUBLE':
        return (
          <Form.Item
            key={atrib.name}
            name={atrib.name}
            label={atrib.label || atrib.name}
            rules={rules}
            styles={{ label: {color: 'rgb(17, 102, 162)'}}}
          >
            <Input type="number" placeholder='Введите число'/>
          </Form.Item>
        );
    case 'DATE':
        return (
          <Form.Item
            key={atrib.name}
            name={atrib.name}
            label={atrib.label || atrib.name}
            rules={rules}
          >
            <DatePicker 
              format="YYYY-MM-DD"
              placeholder='Введите дату'
              style={{ width: '100%' }}
            />
          </Form.Item>
        );
      
      case 'STRING':
      default:
        return (
          <Form.Item
            key={atrib.name}
            name={atrib.name}
            label={atrib.label || atrib.name}
            rules={rules}
          >
            <Input placeholder='Введите текст' />
          </Form.Item>
        );
    }
  };

  if (!layer?.atribs?.length) {
    return (
      <Card 
        size="small" 
        style={{ width: 300 }}
        actions={[
          <Button onClick={onCancel}>Close</Button>
        ]}
      >
        <Alert 
          message="No attributes defined" 
          type="info" 
          showIcon 
        />
      </Card>
    );
  }

  const visibleAtribs = layer.atribs.filter(atrib => atrib.visible !== false);

  return (
    <FloatingWindow initialPosition={initialPosition}>
        <Card 
            title={
                <Title level={4} style={{ margin: 0, color: 'white' }} className='drag-handle'>
                    { layer.get('descr') }
                </Title>
            }
            styles={{ header: { background: 'rgb(17, 102, 162)', color: 'white' }, body: {maxHeight: '65vh', overflow: 'auto'}}}
            style={{ width: 350, maxHeight: '80vh', overflow: 'auto', cursor: 'default' }}
            actions={[
                <Space key="actions">
                <Button 
                    onClick={onCancel}
                    icon={<CloseOutlined />}
                >
                    Отменить
                </Button>
                <Button 
                    type="primary" 
                    onClick={handleSave}
                    icon={<CheckOutlined />}
                    loading={loading}
                >
                    Сохранить
                </Button>
                </Space>
            ]}
            >
            <Form
                form={form}
                layout="vertical"
                size="small"
                styles={{ label: {color: 'rgb(17, 102, 162)'}}}
            >
                {visibleAtribs.map(renderFormItem)}
            </Form>
        </Card>
    </FloatingWindow>
  );
};

export default AttributeForm;