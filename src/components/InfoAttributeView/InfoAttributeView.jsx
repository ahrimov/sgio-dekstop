import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
import { showOnMap } from '../../store/showOnMap.js';
import { deleteFeature } from '../../features/deleteFeature/deleteFeature.js';
import { formatValue } from './utils.jsx';
import { getFeatureAttributes } from '../../features/getDataForFeatures/getFeatureAttribute.js';
import { DARK_BLUE, WHITE, ORANGE, BLACK } from '../../consts/style.js';
import { Style, Stroke, Fill, RegularShape } from 'ol/style';
import { useWindowControls } from '../WindowControls/useWindowControls.js';
import { AttributeEditForm } from './AttributeEditForm.jsx';
import {
	updateFeatureAttributes,
	updateFeatureGeometry,
} from '../../features/saveFeature/updateFeature.js';
import { finishGeometryEdit, startGeometryEdit } from '../../features/draw/store.js';
import { useUnit } from 'effector-react';
import {
	$mapInteractionMode,
	changeInteractionMode,
	DEFAULT_INTERACTION,
	GEOMETRY_EDIT_INTERACTION,
} from '../../store/mapInteractionMode.js';
import { $infoAttributeState, CANCEL_EDITING, FINISH_EDITING } from './store.js';
import { useConfig } from '../../context/ConfigContext.jsx';
import { filterSystemProperties } from '../../utils/filterSystemProperties.js';

const { Text } = Typography;

export function InfoAttributeView({ featureId, layer, onClose, featuresByLayer = null }) {
	const [featureData, setFeatureData] = useState(null);
	const [isEditing, setIsEditing] = useState(false);
	const [feature, setFeature] = useState(null);
	const [form] = Form.useForm();
	const [loading, setLoading] = useState(false);
	const [currentIndex, setCurrentIndex] = useState(0);
	
	const allFeatures = useMemo(() => {
		if (!featuresByLayer) return null;
		return featuresByLayer.flatMap(({ layer, features }) =>
			features.map(feature => ({ feature, layer }))
		);
	}, [featuresByLayer]);
	
	const currentFeatureData = useMemo(() => {
		if (allFeatures && allFeatures.length > 0) {
			return allFeatures[currentIndex];
		}
		return { feature: { id: featureId }, layer };
	}, [allFeatures, currentIndex, featureId, layer]);
	
	const activeFeatureId = currentFeatureData.feature.id;
	const activeLayer = currentFeatureData.layer;
	const isMultiple = allFeatures && allFeatures.length > 1;
	
	const windowId = useMemo(() => {
		if (isMultiple) {
			return 'info-multiple-features';
		}
		return `info-${activeFeatureId}`;
	}, [isMultiple, activeFeatureId]);

	const { isMaximized } = useWindowControls({ windowId });
	const isGeometryEditing = useUnit($mapInteractionMode) === GEOMETRY_EDIT_INTERACTION;
	const infoAttributeState = useUnit($infoAttributeState);
	const { config } = useConfig();
	const originalStyleRef = useRef(null);
	const isGeometryEditingRef = useRef(isGeometryEditing);

	const initialPosition = useMemo(() => {
		if (typeof window === 'undefined') return { x: 100, y: 100 };
		const windowWidth = window.innerWidth;
		const modalWidth = 360;
		return {
			x: Math.max(0, (windowWidth - modalWidth) / 2),
			y: 100,
		};
	}, []);

	const handleCancelEditGeometry = useCallback(() => {
		changeInteractionMode(DEFAULT_INTERACTION);
	}, []);

	const handleCancelEditGeometryRef = useRef(handleCancelEditGeometry);

	useEffect(() => {
		isGeometryEditingRef.current = isGeometryEditing;
		handleCancelEditGeometryRef.current = handleCancelEditGeometry;
	}, [isGeometryEditing, handleCancelEditGeometry]);

	const handleSaveGeometryEdit = useCallback(() => {
		try {
			setLoading(true);

			const features = activeLayer.getSource().getFeatures();
			const updatedFeature = features.find(f => f.id === activeFeatureId);

			if (updatedFeature) {
				updateFeatureGeometry(
					activeLayer,
					activeFeatureId,
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
	}, [activeLayer, activeFeatureId]);

	useEffect(() => {
		const fetchFeatureAttributes = async () => {
			try {
				const data = activeLayer.get('kmlType') ? getFeatureAttributesFromKML(activeLayer, activeFeatureId) : await getFeatureAttributes(activeLayer, activeFeatureId);
				const atribs = filterSystemProperties(activeLayer.atribs, config);
				if (data) {
					setFeatureData(data);
					const features = activeLayer.getSource().getFeatures();
					const featureObj = features.find(feature => feature.id === activeFeatureId);
					setFeature(featureObj);

					const initialValues = {};
					atribs.forEach(atrib => {
						initialValues[atrib.name] = data[atrib.name] || '';
					});
					form.setFieldsValue(initialValues);
				}
			} catch (err) {
				console.error('Error fetching feature attributes:', err);
			}
		};

		fetchFeatureAttributes();
	}, [activeLayer, activeFeatureId, form, config]);

	useEffect(() => {
		if (!feature) return;

		const applyHighlight = () => {
			originalStyleRef.current = feature.getStyle();

			const geometry = feature.getGeometry();
			const geometryType = geometry.getType();

			let highlightStyle;
			if (geometryType === 'Point' || geometryType === 'MultiPoint') {
				highlightStyle = new Style({
					image: new RegularShape({
						points: 4,
						radius: 10,
						angle: Math.PI / 4,
						fill: new Fill({ color: ORANGE }),
						stroke: new Stroke({ color: BLACK, width: 2 }),
					}),
				});
			} else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
				highlightStyle = [
					new Style({
						stroke: new Stroke({ color: BLACK, width: 6 }),
					}),
					new Style({
						stroke: new Stroke({ color: WHITE, width: 4 }),
					}),
				];
			} else {
				[
					new Style({
						stroke: new Stroke({ color: BLACK, width: 6 }),
					}),
					new Style({
						stroke: new Stroke({ color: WHITE, width: 4 }),
					}),
				];
			}

			feature.setStyle(highlightStyle);
		};

		const removeHighlight = () => {
			if (originalStyleRef.current !== null) {
				feature.setStyle(originalStyleRef.current);
				originalStyleRef.current = null;
			} else {
				feature.setStyle(undefined);
			}
		};

		if (!isGeometryEditing) {
			applyHighlight();
		} else {
			removeHighlight();
		}

		return () => {
			removeHighlight();
		};
	}, [feature, isGeometryEditing]);

	useEffect(() => {
		if (infoAttributeState?.editingType === FINISH_EDITING) {
			handleSaveGeometryEdit();
		} else if (infoAttributeState?.editingType === CANCEL_EDITING) {
			handleCancelEditGeometry();
		}
	}, [handleCancelEditGeometry, handleSaveGeometryEdit, infoAttributeState]);

	const handleShowOnMap = () => {
		showOnMap({ featureId: activeFeatureId, layer: activeLayer });
	};

	const handleDeleteFeature = () => {
		if (isGeometryEditing) {
			handleCancelEditGeometry();
		}
		deleteFeature(activeFeatureId, activeLayer, onClose);
	};
	
	const handlePrevious = useCallback(() => {
		if (isEditing || isGeometryEditing) return;
		setIsEditing(false);
		setCurrentIndex(prev => (prev > 0 ? prev - 1 : allFeatures.length - 1));
	}, [isEditing, isGeometryEditing, allFeatures]);
	
	const handleNext = useCallback(() => {
		if (isEditing || isGeometryEditing) return;
		setIsEditing(false);
		setCurrentIndex(prev => (prev < allFeatures.length - 1 ? prev + 1 : 0));
	}, [isEditing, isGeometryEditing, allFeatures]);

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
					activeLayer,
					activeFeatureId,
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
		if (isGeometryEditing) {
			handleCancelEditGeometry();
			return;
		}
		if (!feature) {
			console.error('Не удалось начать редактирование геометрии');
			return;
		}

		startGeometryEdit({ feature, layer: activeLayer });
	}, [feature, handleCancelEditGeometry, isGeometryEditing, activeLayer]);

	const handleClose = useCallback(() => {
		onClose();
		if (isGeometryEditingRef.current) {
			handleCancelEditGeometryRef.current();
		}
	}, [onClose]);

	const visibleAtribs = filterSystemProperties(activeLayer.atribs, config).filter(atrib => atrib.visible !== false);

	return featureData ? (
		<FloatingWindow
			title={activeLayer.get ? activeLayer.get('descr') : (activeLayer.descr ?? 'Информация об объекте')}
			initialPosition={initialPosition}
			width={550}
			windowId={windowId}
			onClose={handleClose}
			showControls={true}
			titleWidth={'400px'}
			isMultiple={isMultiple}
			onPrevious={handlePrevious}
			onNext={handleNext}
			current={currentIndex}
			total={allFeatures?.length || 1}
			disablePrevious={currentIndex === 0 || isEditing || isGeometryEditing}
			disableNext={currentIndex === (allFeatures?.length || 1) - 1 || isEditing || isGeometryEditing}
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
										onClick={handleCancelEditGeometry}
										icon={<CloseOutlined />}
									>
										Отменить
									</Button>
									<Button
										type="primary"
										onClick={() => {
											finishGeometryEdit();
										}}
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
						{isEditing ? null : (
							<>
								<Button
									title="Редактировать геометрию"
									shape="square"
									icon={<RadiusSettingOutlined />}
									onClick={handleEditGeometryClick}
									styles={{ root: { backgroundColor: isGeometryEditing ? DARK_BLUE : null, color: isGeometryEditing ? WHITE : null } }}
								/>
								<Button
									title="Редактировать атрибуты"
									shape="square"
									icon={<EditOutlined />}
									onClick={handleEditClick}
									disabled={isGeometryEditing}
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
						(() => {
							const totalItems = visibleAtribs.length;
							
							let columnsCount = 1;
							if (totalItems > 10) {
								columnsCount = 3;
							} else if (totalItems > 4) {
								columnsCount = 2;
							}
							
							const columns = [];
							if (columnsCount === 1) {
								columns.push(visibleAtribs);
							} else {
								const itemsPerColumn = Math.ceil(totalItems / columnsCount);
								for (let i = 0; i < columnsCount; i++) {
									const start = i * itemsPerColumn;
									const end = Math.min(start + itemsPerColumn, totalItems);
									if (start < totalItems) {
										columns.push(visibleAtribs.slice(start, end));
									}
								}
							}
							
							return (
								<Flex gap={10} wrap="nowrap" style={{ overflowX: 'auto' }}>
									{columns.map((columnAttribs, columnIndex) => (
										<div key={columnIndex} style={{ flex: columnsCount > 1 ? '0 0 auto' : '1', minWidth: '300px' }}>
											<Descriptions
												column={1}
												size="small"
												bordered
												labelStyle={{
													width: '140px',
													background: '#fafcff',
													fontWeight: 500,
													color: DARK_BLUE,
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap',
													display: 'inline-block',
												}}
												contentStyle={{ background: '#fff' }}
											>
												{featureData
													? columnAttribs.map(atrib => (
														<Descriptions.Item
															key={atrib.name}
															label={
																<span title={atrib.label || atrib.name}>
																	{atrib.label || atrib.name}
																</span>
															}
														>
															<Text>
																{formatValue(atrib, featureData[atrib.name])}
															</Text>
														</Descriptions.Item>
													))
													: null}
											</Descriptions>
										</div>
									))}
								</Flex>
							);
						})()
					)}
				</Flex>
			</Card>
		</FloatingWindow>
	) : null;
}

function getFeatureAttributesFromKML(layer, featureId) {
	const features = layer.getSource().getFeatures();
	const feature = features.find(f =>
		String(f.get('ID')) === String(featureId)
	);
	if (!feature) return null;
	const props = feature.getProperties();
	// eslint-disable-next-line no-unused-vars
	const { geometry, id, lgAttach, ...attrs } = props;
	return attrs;
}
