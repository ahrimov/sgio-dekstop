import React from 'react';
import { Button } from 'antd';
import styled from 'styled-components';
import { MEDIUM_BLUE, MEDIUM_DARK_BLUE, ORANGE } from '../../consts/style';
import ruleIcon from '../../assets/resources/images/assets/rule.png';
import {
	$mapInteractionMode,
	changeInteractionMode,
	MEASURE_INTERACTION,
} from '../../store/mapInteractionMode.js';
import { useUnit } from 'effector-react';

export function MeasureButton() {
	const mapInteractionMode = useUnit($mapInteractionMode);

	const handleClick = () => {
		changeInteractionMode(MEASURE_INTERACTION);
	};

	const titleText = '';
	return (
		<MeasureButtonStyle
			$active={mapInteractionMode === MEASURE_INTERACTION}
			onClick={handleClick}
			title={titleText}
		>
			<img src={ruleIcon} />
		</MeasureButtonStyle>
	);
}

const MeasureButtonStyle = styled(Button).withConfig({
	shouldForwardProp: prop => !['active'].includes(prop),
})`
	border: 1px solid ${MEDIUM_DARK_BLUE} !important;
	box-shadow: 0 0 0 ${MEDIUM_BLUE} !important;
	border-radius: 20px;
	height: 34px;
	width: 34px;

	background-color: ${props => (props.$active ? ORANGE : MEDIUM_BLUE)} !important;

	&:hover {
		background-color: ${ORANGE} !important;
	}

	img {
		width: 32px;
		height: 32px;
		object-fit: contain;
	}
`;