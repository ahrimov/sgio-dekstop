import React from 'react';
import styled from 'styled-components';
import { Typography } from 'antd';
import { DoubleLeftOutlined, DoubleRightOutlined } from '@ant-design/icons';
import { FeatureActionButtons } from './FeatureActionButtons.jsx';
import { WHITE } from '../../../consts/style.js';

const { Text } = Typography;

export function InfoAttributeHeader({
	layerName,
	metrics,
	currentIndex,
	total,
	onPrevious,
	onNext,
	disablePrevious,
	disableNext,
	isNewFeature,
	isGeometryEditing,
	handleSaveEdit,
	handleCancelEdit,
	handleEditGeometryClick,
	handleShowOnMap,
	handleDeleteFeature,
	handleExportKML,
}) {
	return (
		<HeaderContainer>
			<HeaderRow>
				<NavigationSection>
					<ControlButton onClick={onPrevious} disabled={disablePrevious}>
						<DoubleLeftOutlined />
					</ControlButton>
					<ControlButton onClick={onNext} disabled={disableNext}>
						<DoubleRightOutlined />
					</ControlButton>
					<Text
						style={{
							color: WHITE,
							paddingLeft: '5px',
							width: '40px',
							fontSize: '12px',
						}}
					>
						{currentIndex + 1} из {total}
					</Text>
				</NavigationSection>
				<LayerTitle title={layerName}>
					{layerName}
					{metrics && <MetricsText> {metrics}</MetricsText>}
				</LayerTitle>
				<ActionsSection>
					<FeatureActionButtons
						isNewFeature={isNewFeature}
						isGeometryEditing={isGeometryEditing}
						handleSaveEdit={handleSaveEdit}
						handleCancelEdit={handleCancelEdit}
						handleEditGeometryClick={handleEditGeometryClick}
						handleShowOnMap={handleShowOnMap}
						handleDeleteFeature={handleDeleteFeature}
						handleExportKML={handleExportKML}
					/>
				</ActionsSection>
			</HeaderRow>
		</HeaderContainer>
	);
}

const HeaderContainer = styled.div`
	background: rgb(17, 102, 162);
	padding: 6px 16px;
`;

const HeaderRow = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	justify-content: space-between;
`;

const NavigationSection = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
`;

const ControlButton = styled.button`
	background: none;
	width: 28px;
	height: 28px;
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	color: #ffffff;
	transition: all 0.2s;
	border: 1px solid #ffffff;

	&:hover:not(:disabled) {
		color: #000000;
		background-color: #ffffff;
	}

	&:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
`;

const LayerTitle = styled.span`
	color: white;
	font-weight: 600;
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 16px;
	font-family: 'Arial Narrow', sans-serif;
`;

const MetricsText = styled.span`
	font-weight: 500;
	font-size: 16px;
	padding-left: 3px;
`;

const ActionsSection = styled.div`
	display: flex;
	align-items: center;
	gap: 2px;
	flex: 2;
	max-width: 200px;
`;