import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Flex, Form } from 'antd';
import { useUnit } from 'effector-react';
import { toLonLat } from 'ol/proj';
import { getLength } from 'ol/sphere';
import { getArea } from 'ol/sphere';
import FloatingWindow from '../FloatingWindow/FloatingWindow.jsx';
import { useWindowControls } from '../WindowControls/useWindowControls.js';
import { useConfig } from '../../context/ConfigContext.jsx';
import { useMessage } from '../../context/MessageContext.jsx';
import { filterSystemProperties } from '../../utils/filterSystemProperties.js';
import { $infoAttributeState, CANCEL_EDITING, FINISH_EDITING } from './store.js';
import { AttributeEditForm } from './AttributeEditForm.jsx';
import {
	useFeatureHighlight,
	useGeometryEditing,
	useFeatureData,
	useFeatureNavigation,
	useFeatureActions,
} from './hooks/index.js';
import { InfoAttributeHeader, GeometryEditActions } from './components/index.js';

function decimalToDMS(decimal) {
	const absolute = Math.abs(decimal);
	const degrees = Math.floor(absolute);
	const minutesDecimal = (absolute - degrees) * 60;
	const minutes = Math.floor(minutesDecimal);
	const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);
	
	return { degrees, minutes, seconds };
}

function getClickCoordinates(clickCoordinate) {
	if (!clickCoordinate) return '';
	
	try {
		const [lon, lat] = toLonLat(clickCoordinate);
		
		const latDMS = decimalToDMS(lat);
		const lonDMS = decimalToDMS(lon);
		
		const latDir = lat >= 0 ? 'с.ш.' : 'ю.ш.';
		const lonDir = lon >= 0 ? 'в.д.' : 'з.д.';
		
		return `Шир. ${latDMS.degrees}°${latDMS.minutes}'${latDMS.seconds}" ${latDir} (${lat.toFixed(6)}°); Долг. ${lonDMS.degrees}°${lonDMS.minutes}'${lonDMS.seconds}" ${lonDir} (${lon.toFixed(6)}°)`;
	} catch (error) {
		console.error('Error getting click coordinates:', error);
		return '';
	}
}

/**
 * Get metric data from feature geometry
 * @param {Object} feature - OpenLayers feature
 * @returns {string} Formatted metric data string
 */
function getFeatureMetrics(feature) {
	if (!feature) return '';
	
	const geometry = feature.getGeometry();
	if (!geometry) return '';
	
	try {
		const geometryType = geometry.getType();
		
		if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
			const length = getLength(geometry);
			const km = Math.floor(length / 1000);
			const m = Math.round(length % 1000);
			
			if (km > 0) {
				return `${km} км ${m} м`;
			}
			return `${Math.round(length)} м`;
		}
		
		if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
			const area = getArea(geometry);
			const km2 = Math.floor(area / 1000000);
			const m2 = Math.round(area % 1000000);
			
			if (km2 > 0) {
				return `${km2} км² ${m2} м²`;
			}
			return `${Math.round(area)} м²`;
		}
		
		return '';
	} catch (error) {
		console.error('Error getting feature metrics:', error);
		return '';
	}
}

export function InfoAttributeView({
	featureId,
	layer,
	onClose,
	featuresByLayer = null,
	initialFeature = null,
	clickCoordinate = null
}) {
	const messageApi = useMessage();
	const [featureData, setFeatureData] = useState(null);
	const [feature, setFeature] = useState(initialFeature);
	const [form] = Form.useForm();
	const [loading, setLoading] = useState(false);
	const [isNewFeature, setIsNewFeature] = useState(!!initialFeature);
	
	const { config } = useConfig();
	const infoAttributeState = useUnit($infoAttributeState);

	const {
		isGeometryEditing,
		isGeometryEditingRef,
		handleCancelEditGeometry,
		handleCancelEditGeometryRef,
		handleSaveGeometryEdit,
		handleEditGeometryClick,
		finishGeometryEdit,
	} = useGeometryEditing(feature, layer, featureId, setFeature, setLoading);

	const {
		currentIndex,
		allFeatures,
		currentFeatureData,
		isMultiple,
		handlePrevious,
		handleNext,
	} = useFeatureNavigation(featuresByLayer, featureId, layer, isGeometryEditing);

	const activeFeatureId = currentFeatureData.feature.id;
	const activeLayer = currentFeatureData.layer;

	const windowId = useMemo(() => {
		if (isMultiple) {
			return 'info-multiple-features';
		}
		return `info-${activeFeatureId}`;
	}, [isMultiple, activeFeatureId]);

	const { isMaximized } = useWindowControls({ windowId });

	const initialPosition = useMemo(() => {
		if (typeof window === 'undefined') return { x: 100, y: 100 };
		const windowWidth = window.innerWidth;
		const modalWidth = 650;
		return {
			x: Math.max(0, (windowWidth - modalWidth) / 2),
			y: 100,
		};
	}, []);

	useFeatureData(
		activeLayer,
		activeFeatureId,
		form,
		config,
		initialFeature,
		setFeatureData,
		setFeature,
		setIsNewFeature
	);

	useFeatureHighlight(feature, isGeometryEditing);

	const {
		handleShowOnMap,
		handleDeleteFeature,
		handleSaveEdit,
		handleExportKML,
	} = useFeatureActions(
		activeLayer,
		activeFeatureId,
		feature,
		form,
		isNewFeature,
		config,
		setFeatureData,
		setLoading,
		onClose,
		handleCancelEditGeometry,
		isGeometryEditing,
		messageApi
	);

	useEffect(() => {
		if (infoAttributeState?.editingType === FINISH_EDITING) {
			handleSaveGeometryEdit();
		} else if (infoAttributeState?.editingType === CANCEL_EDITING) {
			handleCancelEditGeometry();
		}
	}, [handleCancelEditGeometry, handleSaveGeometryEdit, infoAttributeState]);

	const handleCancelEdit = useCallback(() => {
		if (featureData) {
			form.setFieldsValue(featureData);
		}
	}, [form, featureData]);

	const handleClose = useCallback(() => {
		if (isNewFeature && feature) {
			const source = activeLayer.getSource();
			source.removeFeature(feature);
		}
		onClose();
		if (isGeometryEditingRef.current) {
			handleCancelEditGeometryRef.current();
		}
	}, [onClose, isNewFeature, feature, activeLayer, isGeometryEditingRef, handleCancelEditGeometryRef]);

	const visibleAtribs = filterSystemProperties(activeLayer.atribs, config).filter(
		atrib => atrib.visible !== false
	);

	const layerName = activeLayer.get ? activeLayer.get('descr') : (activeLayer.descr ?? 'Информация об объекте');
	const coordinates = useMemo(() => getClickCoordinates(clickCoordinate), [clickCoordinate]);
	const metrics = useMemo(() => getFeatureMetrics(feature), [feature]);
	const windowTitle = coordinates || layerName;

	return featureData ? (
		<FloatingWindow
			title={windowTitle}
			initialPosition={initialPosition}
			width={650}
			windowId={windowId}
			onClose={handleClose}
			showControls={true}
			titleWidth={'400px'}
			isMultiple={false}
			compact={true}
		>
			<Card
				styles={{
					header: {
						background: 'rgb(17, 102, 162)',
						padding: 0,
						border: 'none',
					},
					body: {
						maxHeight: !isMaximized ? '65vh' : '',
						overflow: 'auto',
						padding: '0',
						borderRadius: '0',
					},
				}}
				style={{
					width: '100%',
					border: 'none',
					boxShadow: 'none',
					maxHeight: !isMaximized ? '80vh' : '',
					overflow: 'auto',
					cursor: 'default',
					borderRadius: '0',
				}}
				actions={
					isGeometryEditing
						? [
							<GeometryEditActions
								key="geometry-actions"
								handleCancelEditGeometry={handleCancelEditGeometry}
								finishGeometryEdit={finishGeometryEdit}
								loading={loading}
							/>,
						]
						: null
				}
			>
				<InfoAttributeHeader
					layerName={layerName}
					metrics={metrics}
					currentIndex={currentIndex}
					total={allFeatures?.length || 1}
					onPrevious={handlePrevious}
					onNext={handleNext}
					disablePrevious={currentIndex === 0 || isGeometryEditing}
					disableNext={currentIndex === (allFeatures?.length || 1) - 1 || isGeometryEditing}
					isNewFeature={isNewFeature}
					isGeometryEditing={isGeometryEditing}
					handleSaveEdit={handleSaveEdit}
					handleCancelEdit={handleCancelEdit}
					handleEditGeometryClick={handleEditGeometryClick}
					handleShowOnMap={handleShowOnMap}
					handleDeleteFeature={handleDeleteFeature}
					handleExportKML={handleExportKML}
				/>
				<Flex vertical gap={14} style={{ padding: '15px' }}>
					<AttributeEditForm form={form} attributes={visibleAtribs} />
				</Flex>
			</Card>
		</FloatingWindow>
	) : null;
}
