import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Typography, Descriptions, Button, Flex, Form, Space } from 'antd';
import {
	CheckOutlined,
	CloseOutlined,
	DeleteOutlined,
	EditOutlined,
	RadiusSettingOutlined,
	SearchOutlined,
} from '@ant-design/icons';
import FloatingWindow from '../FloatingWindow/FloatingWindow.jsx';
import { showOnMap } from '../../shared/showOnMap.js';
import { deleteFeature } from '../../features/deleteFeature/deleteFeature.js';
import { formatValue } from './utils.jsx';
import { getFeatureAttributes } from '../../features/getDataForFeatures/getFeatureAttribute.js';
import { DARK_BLUE } from '../../consts/style.js';
import { useWindowControls } from '../WindowControls/useWindowControls.js';
import { AttributeEditForm } from './AttributeEditForm.jsx';
import {
	updateFeatureAttributes,
	updateFeatureGeometry,
} from '../../features/saveFeature/updateFeature.js';
import { startGeometryEdit } from '../../features/draw/store.js';
import { useUnit } from 'effector-react';
import { $mapInteractionMode, GEOMETRY_EDIT_INTERACTION } from '../../shared/mapInteractionMode.js';

const { Text } = Typography;

export function InfoAttributeView({ featureId, layer, onClose }) {
	const [featureData, setFeatureData] = useState(null);
	const [isEditing, setIsEditing] = useState(false);
	const [feature, setFeature] = useState(null);
	const [form] = Form.useForm();
	const [loading, setLoading] = useState(false);
	const windowId = useMemo(() => `info-${featureId}`, [featureId]);
	const { isMaximized } = useWindowControls({ windowId });
	const isGeometryEditing = useUnit($mapInteractionMode) === GEOMETRY_EDIT_INTERACTION;

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
					const features = layer.getSource().getFeatures();
					const featureObj = features.find(feature => feature.get('id') === featureId);
					setFeature(featureObj);

					const initialValues = {};
					layer.atribs.forEach(atrib => {
						initialValues[atrib.name] = data[atrib.name] || '';
					});
					form.setFieldsValue(initialValues);
				}
			} catch (err) {
				console.error('Error fetching feature attributes:', err);
			}
		};

		fetchFeatureAttributes();
	}, [layer, featureId, form]);

	const handleShowOnMap = () => {
		showOnMap({ featureId: featureId, layer });
	};

	const handleDeleteFeature = () => {
		deleteFeature(featureId, layer, onClose);
	};

	const handleEditClick = () => {
		setIsEditing(true);
	};

	const handleSaveEdit = async () => {
		try {
			setLoading(true);
			const values = await form.validateFields();

			if (feature) {
				Object.keys(values).forEach(key => {
					feature.set(key, values[key]);
				});

				const processedValues = {};
				visibleAtribs.forEach(atrib => {
					const value = values[atrib.name];

					if (atrib.type === 'DATE' && value && value.format) {
						processedValues[atrib.name] = value.format('YYYY-MM-DD');
					} else {
						processedValues[atrib.name] = value;
					}
				});

				updateFeatureAttributes(
					layer,
					featureId,
					processedValues,
					() => {
						setFeatureData(prev => ({
							...prev,
							...processedValues,
						}));
						setIsEditing(false);
					},
					error => {
						console.log(`Ошибка сохранения: ${error.message}`);
					}
				);
			}

			setIsEditing(false);
		} catch (error) {
			console.error('Error saving feature:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleCancelEdit = () => {
		if (featureData) {
			form.setFieldsValue(featureData);
		}
		setIsEditing(false);
	};

	const handleEditGeometryClick = useCallback(() => {
		if (!feature) {
			console.error('Не удалось начать редактирование геометрии');
			return;
		}

		startGeometryEdit({ feature, layer });
	}, [feature, layer]);

	const handleSaveGeometryEdit = useCallback(() => {
		try {
			setLoading(true);

			const features = layer.getSource().getFeatures();
			const updatedFeature = features.find(f => f.get('id') === featureId);

			if (updatedFeature) {
				updateFeatureGeometry(
					layer,
					featureId,
					updatedFeature.getGeometry(),
					() => {
						setFeature(updatedFeature);
					},
					error => {
						console.error(`Ошибка сохранения геометрии: ${error.message}`);
					}
				);
			}
		} catch (error) {
			console.error('Error saving geometry:', error);
		} finally {
			setLoading(false);
		}
	}, [layer, featureId]);

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
					body: {
						maxHeight: !isMaximized ? '65vh' : '',
						overflow: 'auto',
						paddingTop: '10px',
					},
				}}
				style={{
					width: '100%',
					border: 'none',
					boxShadow: 'none',
					maxHeight: !isMaximized ? '80vh' : '',
					overflow: 'auto',
					cursor: 'default',
				}}
				actions={
					isEditing
						? [
								<Space key="actions">
									<Button onClick={handleCancelEdit} icon={<CloseOutlined />}>
										Отменить
									</Button>
									<Button
										type="primary"
										onClick={handleSaveEdit}
										icon={<CheckOutlined />}
										loading={loading}
									>
										Сохранить
									</Button>
								</Space>,
							]
						: isGeometryEditing
							? [
									<Space key="geometry-actions">
										<Button
											onClick={() => {
												/* отмена редактирования геометрии */
											}}
											icon={<CloseOutlined />}
										>
											Отменить
										</Button>
										<Button
											type="primary"
											onClick={handleSaveGeometryEdit}
											icon={<CheckOutlined />}
											loading={loading}
										>
											Сохранить геометрию
										</Button>
									</Space>,
								]
							: null
				}
			>
				<Flex vertical gap={5}>
					<Flex gap={2} justify="flex-end">
						{isEditing || isGeometryEditing ? null : (
							<>
								<Button
									title="Редактировать геометрию"
									shape="square"
									icon={<RadiusSettingOutlined />}
									onClick={handleEditGeometryClick}
								/>
								<Button
									title="Редактировать атрибуты"
									shape="square"
									icon={<EditOutlined />}
									onClick={handleEditClick}
								/>
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
							</>
						)}
					</Flex>
					{isEditing ? (
						<AttributeEditForm form={form} attributes={visibleAtribs} />
					) : (
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
											<Text>
												{formatValue(atrib, featureData[atrib.name])}
											</Text>
										</Descriptions.Item>
									))
								: null}
						</Descriptions>
					)}
				</Flex>
			</Card>
		</FloatingWindow>
	) : null;
}
