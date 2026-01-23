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
} from '../../shared/mapInteractionMode.js';
import { useUnit } from 'effector-react';
import { $drawingState } from './store.js';

const { Text } = Typography;

export function useDraw({ map, setCurrentFeature }) {
	const {
		startDrawing: startDrawingGeometry,
		undo,
		reset,
		finishEditing,
		showUndoButton,
		acceptButtonDisabled,
		isDrawing,
		canReset,
		rejectCurrentFeature,
	} = useDrawGeometry({ map });
	const layerRef = useRef(null);
	const drawingState = useUnit($drawingState);

	const mapInteractionMode = useUnit($mapInteractionMode);

	const closeControlPanel = () => {
		rejectCurrentFeature();
		reset();
		changeInteractionMode(DEFAULT_INTERACTION);
	};

	useEffect(() => {
		if (mapInteractionMode !== DRAW_INTERACTION && isDrawing) {
			rejectCurrentFeature();
			reset();
		}
	}, [mapInteractionMode, isDrawing, rejectCurrentFeature, reset]);

	useEffect(() => {
		if (drawingState?.start) {
			changeInteractionMode(DRAW_INTERACTION);
			const layer = drawingState.layer;
			startDrawingGeometry(layer);
			layerRef.current = layer;
		}
	}, [drawingState, startDrawingGeometry]);

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

	const controlButtons = isDrawing && (
		<ControlPanel>
			<CloseButton onClick={closeControlPanel}>
				<CloseOutlined />
			</CloseButton>
			<Flex vertical gap={10} style={{ width: '100%' }}>
				<Flex justify="center">
					<Text style={{ color: 'rgb(17, 102, 162)' }}>
						{layerRef.current?.get('descr')}
					</Text>
				</Flex>
				<Flex justify="center" gap={10}>
					<ControlButton
						disabled={!canReset}
						onClick={() => canReset && rejectCurrentFeature()}
					>
						<CloseOutlined style={{ color: 'red' }} />
						Отменить
					</ControlButton>
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
					<ControlButton
						type="primary"
						onClick={handleFinishEditing}
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
		isDrawing,
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
	height: 63px;
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
