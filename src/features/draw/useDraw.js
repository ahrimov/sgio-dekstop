import React, { useEffect, useRef } from 'react';
import { Button, Flex, Typography } from 'antd';
import styled from 'styled-components';
import { useDrawGeometry } from './useDrawGeometry.js';
import { CloseOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons';
import {
	$mapInteractionMode,
	changeInteractionMode,
	DEFAULT_INTERACTION,
	DRAW_INTERACTION,
	GEOMETRY_EDIT_INTERACTION,
} from '../../shared/mapInteractionMode.js';
import { useUnit } from 'effector-react';
import { $drawingState, DRAWING_TYPE, EDITING_TYPE } from './store.js';
import { cancelEditingGeometry } from '../../components/InfoAttributeView/store.js';

const { Text } = Typography;

export function useDraw({ map, setCurrentFeature }) {
	const {
		startDrawing: startDrawingGeometry,
		startGeometryEdit: startGeometryEditInteraction,
		finishGeometryEdit: finishGeometryEditInteraction,
		cancelGeometryEdit: cancelGeometryEditInteraction,
		undo,
		reset,
		finishEditing,
		showUndoButton,
		acceptButtonDisabled,
		isDrawing,
		isModifying,
		canReset,
		rejectCurrentFeature,
	} = useDrawGeometry({ map });
	const layerRef = useRef(null);
	const featureRef = useRef(null);
	const drawingState = useUnit($drawingState);

	const mapInteractionMode = useUnit($mapInteractionMode);

	const closeControlPanel = () => {
		if (isDrawing) {
			rejectCurrentFeature();
		} else if (isModifying) {
			cancelGeometryEditInteraction();
			cancelEditingGeometry();
		}
		reset();
		changeInteractionMode(DEFAULT_INTERACTION);
	};

	useEffect(() => {
		if (
			mapInteractionMode !== DRAW_INTERACTION &&
			mapInteractionMode !== GEOMETRY_EDIT_INTERACTION
		) {
			if (isDrawing) {
				rejectCurrentFeature();
			}
			if (isModifying) {
				cancelGeometryEditInteraction();
			}
			reset();
		}
	}, [
		mapInteractionMode,
		isDrawing,
		isModifying,
		rejectCurrentFeature,
		reset,
		cancelGeometryEditInteraction,
	]);

	useEffect(() => {
		if (drawingState?.type === DRAWING_TYPE && drawingState?.start) {
			changeInteractionMode(DRAW_INTERACTION);
			const layer = drawingState.layer;
			startDrawingGeometry(layer);
			layerRef.current = layer;
		}
	}, [drawingState, startDrawingGeometry]);

	useEffect(() => {
		if (drawingState?.type === EDITING_TYPE && drawingState?.start) {
			changeInteractionMode(GEOMETRY_EDIT_INTERACTION);
			const { feature, layer } = drawingState;
			startGeometryEditInteraction(feature, layer);
			layerRef.current = layer;
			featureRef.current = feature;
		}
	}, [drawingState, startGeometryEditInteraction]);

	useEffect(() => {
		if (drawingState?.type === EDITING_TYPE && !drawingState?.start) {
			finishGeometryEditInteraction();
			changeInteractionMode(DEFAULT_INTERACTION);
		}
	}, [drawingState, finishGeometryEditInteraction]);

	const cancel = () => {
		changeInteractionMode(DEFAULT_INTERACTION);
		reset();
	};

	const handleFinishEditing = () => {
		const feature = finishEditing();
		if (feature) {
			setCurrentFeature(feature);
		}
		changeInteractionMode(DEFAULT_INTERACTION);
	};

	const handleFinishGeometryEdit = () => {
		const result = finishGeometryEditInteraction();
		if (result) {
			const { feature, geometry } = result;
			changeInteractionMode(DEFAULT_INTERACTION);
			return { feature, geometry };
		}
		return null;
	};

	const controlButtons = (isDrawing || isModifying) && (
		<ControlPanel>
			<CloseButton onClick={closeControlPanel}>
				<CloseOutlined />
			</CloseButton>
			<Flex vertical gap={10} style={{ width: '100%' }}>
				<Flex justify="center">
					<Text style={{ color: 'rgb(17, 102, 162)' }}>
						{isDrawing
							? `Создание: ${layerRef.current?.get('descr')}`
							: `Редактирование: ${layerRef.current?.get('descr')}`}
					</Text>
				</Flex>
				<Flex justify="center" gap={10}>
					<ControlButton
						disabled={!canReset}
						onClick={() => {
							if (isDrawing) {
								canReset && rejectCurrentFeature();
							} else if (isModifying) {
								cancelGeometryEditInteraction();
							}
						}}
					>
						<CloseOutlined style={{ color: 'red' }} />
						Отменить
					</ControlButton>
					{isDrawing && (
						<ControlButton
							disabled={!showUndoButton}
							onClick={() => showUndoButton && undo()}
						>
							<ReloadOutlined
								style={{
									color: 'black',
									transform: 'scaleX(-1)',
								}}
								rotate={0}
							/>
						</ControlButton>
					)}
					<ControlButton
						type="primary"
						onClick={() => {
							if (isDrawing) {
								handleFinishEditing();
							} else if (isModifying) {
								handleFinishGeometryEdit();
							}
						}}
						disabled={acceptButtonDisabled}
					>
						<CheckOutlined style={{ color: 'black' }} />
						Завершить
					</ControlButton>
				</Flex>
			</Flex>
		</ControlPanel>
	);

	return {
		controlButtons,
		cancel,
		isDrawing: isDrawing || isModifying,
		isModifyingGeometry: isModifying,
		layer: layerRef.current,
		rejectCurrentFeature,
	};
}

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
	height: 83px;
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
