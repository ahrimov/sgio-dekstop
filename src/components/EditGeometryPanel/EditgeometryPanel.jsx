import React from 'react';
import styled from 'styled-components';
import { CloseButton } from '../../../Buttons/CloseButton';
import { AddObjectControl } from './AddObjectControl';
import { EditGeometryControl } from './EditGeometryControl';
import { DARK_BLUE, WHITE } from '../../consts/style';

export function EditGeometryPanel({
	mapId,
	mapRef,
	hideButtons,
	showButtons,
	handleCloseButton,
	mapInfoRadius,
}) {
	const textHeader = 'Редактирование';

	function checkButton(buttonName) {
		if (showButtons) return !showButtons.includes(buttonName);
		return hideButtons.includes(buttonName);
	}

	return (
		<EditGeometryPanelContainer>
			<Header>
				<HeaderLabel>{textHeader}</HeaderLabel>
			</Header>
			<CloseButton onClick={handleCloseButton}></CloseButton>
			<PanelContainer>
				{!checkButton('AddObject') && (
					<AddObjectControl mapId={mapId} handler={handleCloseButton} />
				)}
				{!checkButton('EditGeometry') && (
					<EditGeometryControl
						mapId={mapId}
						mapRef={mapRef}
						handler={handleCloseButton}
						mapInfoRadius={mapInfoRadius}
					/>
				)}
			</PanelContainer>
		</EditGeometryPanelContainer>
	);
}

const EditGeometryPanelContainer = styled.div`
	position: absolute;
	top: 50px;
	right: 356px;
	width: 223px;
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
	background-color: ${DARK_BLUE};
	margin-top: 7px;
`;
