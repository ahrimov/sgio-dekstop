import React, { useMemo } from 'react';
import FloatingWindow from '../FloatingWindow/FloatingWindow.jsx';
import styled from 'styled-components';
import { showInfo } from '../../shared/featuredInfoEvent.js';
import { LIGHT_BLUE, MEDIUM_BLUE } from '../../consts/style.js';
import { useWindowControls } from '../WindowControls/useWindowControls.js';

export function FeaturesSelector({ featuresByLayer = [], onClose }) {
	const windowId = 'feature-selector';
	const { isMaximized } = useWindowControls({ windowId });
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

	return (
		<FloatingWindow
			title={'Объекты на карте'}
			initialPosition={initialPosition}
			width={350}
			windowId={windowId}
			onClose={onClose}
			showControls={true}
		>
			<FloatingWindowContainer>
				<FloatingContent isMaximized={isMaximized}>
					{featuresByLayer.length === 0 ? (
						<EmptyMessage>Нет объектов в выбранной области</EmptyMessage>
					) : (
						featuresByLayer.map(({ layer, features }) => (
							<React.Fragment key={layer.id || layer.get('id') || layer.get('name')}>
								<LayerHeader>
									{layer.label || layer.get?.('name') || 'Без названия слоя'}
								</LayerHeader>
								<FeatureList>
									{features.map((feature, i) => (
										<FeatureItem
											key={feature.id || i}
											onClick={() => {
												showInfo({ featureId: feature.id, layer });
												onClose();
											}}
										>
											<FeatureTitle>
												{feature.get?.('name') ||
													feature.label ||
													feature.get?.('title') ||
													feature.id ||
													'Без имени'}
											</FeatureTitle>
										</FeatureItem>
									))}
								</FeatureList>
							</React.Fragment>
						))
					)}
				</FloatingContent>
			</FloatingWindowContainer>
		</FloatingWindow>
	);
}

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
	${props => !props.isMaximized && 'max-height: 400px;'}
	overflow-y: auto;
`;

const LayerHeader = styled.div`
	margin-top: 2px;
	margin-bottom: 4px;
	color: #1968a8;
	display: flex;
	align-items: baseline;
	font-size: 12px;
`;

const FeatureList = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
`;

const FeatureItem = styled.div`
	padding: 8px;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s;
	color: ${MEDIUM_BLUE};

	&:hover {
		background: ${LIGHT_BLUE};
	}
`;

const FeatureTitle = styled.div`
	font-weight: 500;
`;

const EmptyMessage = styled.div`
	text-align: center;
	padding: 20px 5px;
	color: #999;
`;
