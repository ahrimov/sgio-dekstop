import React, { useCallback, useMemo } from 'react';
import FloatingWindow from '../FloatingWindow/FloatingWindow.jsx';
import styled from 'styled-components';
import { LIGHT_BLUE, MEDIUM_BLUE } from '../../consts/style.js';
import { useUnit } from 'effector-react';
import { $layerSelectorState, closeLayerSelector } from './layerSelectorState.js';
import { useWindowControls } from '../WindowControls/useWindowControls.js';

const LayerSelector = ({ handleLayerSelector, onCancel, vectorLayers = [] }) => {
	const windowId = useMemo(() => 'layer-selector', []);
	const { isMaximized } = useWindowControls({ windowId });
	const layerSelectorState = useUnit($layerSelectorState);

	const handleLayerSelect = layer => {
		closeLayerSelector();
		handleLayerSelector(layer);
	};

	const handleCancelEvent = useCallback(() => {
		closeLayerSelector();
		onCancel();
	}, []);

	const initialPosition = useMemo(() => {
		if (typeof window === 'undefined') return { x: 100, y: 100 };

		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;

		const modalWidth = 360;
		const modalHeight = 460;

		return {
			x: Math.max(0, (windowWidth - modalWidth) / 2),
			y: Math.max(0, (windowHeight - modalHeight) / 2),
		};
	}, []);

	return layerSelectorState ? (
		<FloatingWindow
			title={'Выберите слой'}
			initialPosition={initialPosition}
			width={350}
			windowId={windowId}
			onClose={handleCancelEvent}
			showControls={true}
		>
			<FloatingWindowContainer>
				<FloatingContent isMaximized={isMaximized}>
					<LayersList>
						{vectorLayers.map(layer => (
							<LayerItem key={layer.id} onClick={() => handleLayerSelect(layer)}>
								<LayerName>
									{layer.label || layer.get('name') || 'Без названия'}
								</LayerName>
							</LayerItem>
						))}
						{vectorLayers.length === 0 && (
							<EmptyMessage>Нет доступных векторных слоев</EmptyMessage>
						)}
					</LayersList>
				</FloatingContent>
			</FloatingWindowContainer>
		</FloatingWindow>
	) : null;
};

const FloatingWindowContainer = styled.div`
	border-radius: 8px;
	box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.2);
	background: white;
	overflow: hidden;
`;

const FloatingContent = styled.div.withConfig({
	shouldForwardProp: prop => prop !== 'isMaximized',
})`
	padding: 16px;
	${props => (props.isMaximized ? 'max-height: calc(100vh - 150px);' : 'max-height: 400px;')}
	overflow-y: auto;
`;

const LayersList = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
`;

const LayerItem = styled.div`
	padding: 8px;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s;
	color: ${MEDIUM_BLUE};

	&:hover {
		background: ${LIGHT_BLUE};
	}
`;

const LayerName = styled.div`
	font-size: 14px;
`;

const EmptyMessage = styled.div`
	text-align: center;
	padding: 20px;
	color: #999;
`;

export default LayerSelector;
