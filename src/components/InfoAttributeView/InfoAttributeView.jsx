import React, { useMemo } from 'react';
import { Card, Typography, Descriptions, Button, Flex } from 'antd';
import { CloseOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import FloatingWindow from '../FloatingWindow/FloatingWindow.jsx';
import { showOnMap } from '../../shared/map-events.js';
import { deleteFeature } from '../../features/deleteFeature/deleteFeature.js';

const { Text } = Typography;

function formatValue(atrib, value) {
	if (atrib.type === 'ENUM' && atrib.options) {
		return atrib.options?.[value] ?? value;
	}
	if (atrib.type === 'DATE' && value) {
		try {
			return new Date(value).toLocaleDateString();
		} catch {
			return value;
		}
	}
	return value === undefined || value === null || value === '' ? (
		<span style={{ color: '#bbb' }}>—</span>
	) : (
		value
	);
}

const InfoAttributeView = ({ feature, layer, onClose }) => {
	const initialPosition = useMemo(() => {
		if (typeof window === 'undefined') return { x: 100, y: 100 };
		const windowWidth = window.innerWidth;
		const modalWidth = 360;
		return {
			x: Math.max(0, (windowWidth - modalWidth) / 2),
			y: 100,
		};
	}, []);

	if (!layer?.atribs?.length) {
		return (
			<Card
				size="small"
				style={{ width: 300 }}
				actions={[
					<Button key={layer.id} onClick={onClose}>
						Закрыть
					</Button>,
				]}
			>
				<Typography.Text type="secondary">Нет атрибутов</Typography.Text>
			</Card>
		);
	}

	const handleShowOnMap = () => {
		showOnMap({ featureId: feature.id, layer });
	};

	const handleDeleteFeature = () => {
		deleteFeature(feature.id, layer, onClose);
	};

	const visibleAtribs = layer.atribs.filter(atrib => atrib.visible !== false);

	return (
		<FloatingWindow initialPosition={initialPosition}>
			<Card
				title={
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							userSelect: 'none',
						}}
					>
						<span className="drag-handle" style={{ color: 'white', fontWeight: 500 }}>
							{layer.get ? layer.get('descr') : (layer.descr ?? 'Информация об объекте')}
						</span>
						<Button
							type="text"
							size="small"
							onClick={onClose}
							icon={<CloseOutlined />}
							style={{ color: 'white', marginLeft: 8 }}
							aria-label="Закрыть"
						/>
					</div>
				}
				styles={{
					header: { background: 'rgb(17, 102, 162)', color: 'white' },
					body: { maxHeight: '65vh', overflow: 'auto', paddingTop: '10px' },
				}}
				style={{ width: 350, maxHeight: '80vh', overflow: 'auto', cursor: 'default' }}
			>
				<Flex vertical gap={5}>
					<Flex gap={2} justify="flex-end">
						<Button title='Показать на карте' shape='square' icon={<SearchOutlined />} onClick={handleShowOnMap} />
						<Button variant='outlined' color="red" title='Удалить объект' shape='square' icon={<DeleteOutlined />} onClick={handleDeleteFeature} />
					</Flex>
					<Descriptions
						column={1}
						size="small"
						bordered
						labelStyle={{
							width: '140px',
							background: '#fafcff',
							fontWeight: 500,
							color: '#1166a2',
						}}
						contentStyle={{ background: '#fff' }}
					>
						{visibleAtribs.map(atrib => (
							<Descriptions.Item key={atrib.name} label={atrib.label || atrib.name}>
								<Text>
									{formatValue(atrib, feature.get ? feature.get(atrib.name) : feature[atrib.name])}
								</Text>
							</Descriptions.Item>
						))}
					</Descriptions>
				</Flex>
			</Card>
		</FloatingWindow>
	);
};

export default InfoAttributeView;
