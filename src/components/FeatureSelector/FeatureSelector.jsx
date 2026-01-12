import React, { useMemo } from 'react';
import FloatingWindow from '../FloatingWindow/FloatingWindow.jsx';
import styled from 'styled-components';
import { showInfo } from '../../shared/featured-info-event.js';

export function FeaturesSelector({ featuresByLayer = [], onClose }) {
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
		<FloatingWindow initialPosition={initialPosition}>
			<FloatingWindowContainer>
				<FloatingHeader>
					<h3 style={{ margin: 0, fontSize: '14px' }}>Объекты на карте</h3>
					<CloseButton onClick={onClose}>×</CloseButton>
				</FloatingHeader>
				<FloatingContent>
					{featuresByLayer.length === 0 ? (
						<EmptyMessage>Нет объектов в выбранной области</EmptyMessage>
					) : (
						featuresByLayer.map(({ layer, features }) => (
							<React.Fragment key={layer.id || layer.get('id') || layer.get('name')}>
								<LayerHeader>
									{layer.label || layer.get?.('name') || 'Без названия слоя'}
									<Count>({features.length})</Count>
								</LayerHeader>
								<FeatureList>
									{features.map((feature, i) => (
										<FeatureItem
											key={feature.id || feature.getId() || i}
											onClick={() => {
												showInfo({ feature, layer });
												onClose();
											}}
										>
											<FeatureTitle>
												{feature.get?.('name') ||
													feature.get?.('title') ||
													feature.id ||
													feature.getId() ||
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

// Стили
const FloatingWindowContainer = styled.div`
	border-radius: 8px;
	box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.2);
	background: white;
	overflow: hidden;
`;

const FloatingHeader = styled.div`
	background: #4d94c2;
	color: white;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0 16px;
	height: 34px;
	cursor: move;
`;

const CloseButton = styled.button`
	background: none;
	border: none;
	font-size: 18px;
	cursor: pointer;
	color: white;
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
`;

const FloatingContent = styled.div`
	padding: 16px;
	max-height: 400px;
	max-width: 380px;
	overflow-y: auto;
`;

const LayerHeader = styled.div`
	font-weight: bold;
	font-size: 14px;
	margin-top: 12px;
	margin-bottom: 4px;
	color: #1968a8;
	display: flex;
	align-items: baseline;
`;

const Count = styled.span`
	font-size: 12px;
	color: #888;
	margin-left: 6px;
`;

const FeatureList = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
`;

const FeatureItem = styled.div`
	padding: 7px 6px;
	border-radius: 6px;
	cursor: pointer;
	background: #f4faff;
	transition: background 0.19s;
	font-size: 13px;

	&:hover {
		background: #dbeefd;
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
