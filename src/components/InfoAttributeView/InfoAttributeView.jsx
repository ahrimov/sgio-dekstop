import React, { useEffect, useMemo, useState } from 'react';
import { Card, Typography, Descriptions, Button, Flex } from 'antd';
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import FloatingWindow from '../FloatingWindow/FloatingWindow.jsx';
import { showOnMap } from '../../shared/showOnMap.js';
import { deleteFeature } from '../../features/deleteFeature/deleteFeature.js';
import { formatValue } from './utils.jsx';
import { getFeatureAttributes } from '../../features/getDataForFeatures/getFeatureAttribute.js';
import { DARK_BLUE } from '../../consts/style.js';
import { useWindowControls } from '../WindowControls/useWindowControls.js';

const { Text } = Typography;

export function InfoAttributeView({ featureId, layer, onClose }) {
	const [featureData, setFeatureData] = useState(null);
	const windowId = useMemo(() => `info-${featureId}`, [featureId]);
	const { isMaximized } = useWindowControls({ windowId });

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
		const fetchFeatureAttributes = async () => {
			try {
				const data = await getFeatureAttributes(layer, featureId);
				if (data) {
					setFeatureData(data);
				}
			} catch (err) {
				console.error('Error fetching feature attributes:', err);
			}
		};

		fetchFeatureAttributes();
	}, [layer, featureId]);

	const handleShowOnMap = () => {
		showOnMap({ featureId: featureId, layer });
	};

	const handleDeleteFeature = () => {
		deleteFeature(featureId, layer, onClose);
	};

	const visibleAtribs = layer.atribs.filter(atrib => atrib.visible !== false);

	return featureData ? (
		<FloatingWindow
			title={layer.get ? layer.get('descr') : (layer.descr ?? 'Информация об объекте')}
			initialPosition={initialPosition}
			width={350}
			windowId={windowId}
			onClose={onClose}
			showControls={true}
		>
			<Card
				styles={{
					header: { background: 'rgb(17, 102, 162)', color: 'white' },
					body: { maxHeight: '65vh', overflow: 'auto', paddingTop: '10px' },
				}}
				style={{
					width: '100%',
					border: 'none',
					boxShadow: 'none',
					maxHeight: !isMaximized ? '80vh' : '',
					overflow: 'auto',
					cursor: 'default',
				}}
			>
				<Flex vertical gap={5}>
					<Flex gap={2} justify="flex-end">
						<Button
							title="Показать на карте"
							shape="square"
							icon={<SearchOutlined />}
							onClick={handleShowOnMap}
						/>
						<Button
							variant="outlined"
							color="red"
							title="Удалить объект"
							shape="square"
							icon={<DeleteOutlined />}
							onClick={handleDeleteFeature}
						/>
					</Flex>
					<Descriptions
						column={1}
						size="small"
						bordered
						labelStyle={{
							width: '140px',
							background: '#fafcff',
							fontWeight: 500,
							color: DARK_BLUE,
						}}
						contentStyle={{ background: '#fff' }}
					>
						{featureData
							? visibleAtribs.map(atrib => (
									<Descriptions.Item
										key={atrib.name}
										label={atrib.label || atrib.name}
									>
										<Text>{formatValue(atrib, featureData[atrib.name])}</Text>
									</Descriptions.Item>
								))
							: null}
					</Descriptions>
				</Flex>
			</Card>
		</FloatingWindow>
	) : null;
}
