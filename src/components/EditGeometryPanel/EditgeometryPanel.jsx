import React from 'react';
import styled from 'styled-components';
import { CloseOutlined } from '@ant-design/icons';
import { useUnit } from 'effector-react';
import { DARK_BLUE, WHITE } from '../../consts/style.js';
import { DrawButton } from '../MapButtons/DrawButton.jsx';
import editGeometryImage from '../../assets/resources/images/assets/editGeometry.png';
import { BaseMapButton } from '../MapButtons/BaseMapButton.jsx';
import {
	$isEditGeometryFeatureSelectionMode,
	clearSelectedEditGeometryFeature,
	closeEditGeometryPanel,
	setEditGeometryFeatureSelectionMode,
} from './store.js';
import {
	changeInteractionMode,
	CHOOSE_GEOMETRY_EDIT_INTERACTION,
} from '../../store/mapInteractionMode.js';

export function EditGeometryPanel({ handleCloseButton }) {
	const isFeatureSelectionMode = useUnit($isEditGeometryFeatureSelectionMode);

	const textHeader = 'Редактирование';
	const editGeometryButtonTitle = 'Выберите объект на карте';

	const handleSelectFeatureClick = () => {
		changeInteractionMode(CHOOSE_GEOMETRY_EDIT_INTERACTION);
		closeEditGeometryPanel();
	};

	const handleClose = () => {
		setEditGeometryFeatureSelectionMode(false);
		clearSelectedEditGeometryFeature();
		handleCloseButton?.();
	};

	return (
		<EditGeometryPanelContainer>
			<Header>
				<HeaderLabel>{textHeader}</HeaderLabel>
			</Header>
			<CloseButton onClick={handleClose}>
				<CloseOutlined />
			</CloseButton>
			<PanelContainer>
				<DrawButton
					style={{ borderRadius: '6px', width: '28px', height: '28px', padding: '0' }}
				/>
				<SelectFeatureButton
					active={isFeatureSelectionMode}
					title={editGeometryButtonTitle}
					onClick={handleSelectFeatureClick}
					img={editGeometryImage}
					style={{ borderRadius: '6px', width: '28px', height: '28px', padding: '0' }}
				/>
			</PanelContainer>
		</EditGeometryPanelContainer>
	);
}

const EditGeometryPanelContainer = styled.div`
	position: absolute;
	top: 90px;
	right: 356px;
	width: 170px;
	height: 65px;
	border-radius: 5px;
	background-color: ${DARK_BLUE};
	z-index: 10000;
`;

const Header = styled.div`
	margin-top: 6px;
	justify-content: center;
	display: flex;
`;

const HeaderLabel = styled.span`
	color: ${WHITE};
	cursor: default;
`;

const PanelContainer = styled.div`
	display: flex;
	justify-content: center;
	gap: 1px;
	background-color: ${DARK_BLUE};
	margin-top: 7px;
`;

const SelectFeatureButton = styled(BaseMapButton)``;

const CloseButton = styled.button`
	position: absolute;
	top: 6px;
	right: 6px;
	background: transparent;
	border: none;
	color: ${WHITE};
	cursor: pointer;
	padding: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 14px;
`;
