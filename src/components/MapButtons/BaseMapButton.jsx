import React from 'react';
import { Button } from 'antd';
import styled from 'styled-components';
import { MEDIUM_BLUE, MEDIUM_DARK_BLUE, ORANGE } from '../../consts/style';

export function BaseMapButton({ active, img, title, onClick, isDisabled, styleImage }) {
	return (
		<BaseMapButtonStyle
			$active={active}
			onClick={!isDisabled ? onClick : undefined}
			title={title}
			disabled={isDisabled}
			$isDisabled={isDisabled}
		>
			<img src={img} style={styleImage} />
		</BaseMapButtonStyle>
	);
}

const BaseMapButtonStyle = styled(Button).withConfig({
	shouldForwardProp: prop => !['$active', '$isDisabled'].includes(prop),
})`
	border: 1px solid ${MEDIUM_DARK_BLUE} !important;
	box-shadow: 0 0 0 ${MEDIUM_BLUE} !important;
	border-radius: 20px;
	height: 34px;
	width: 34px;
	top: ${props => props.top}px;
	right: ${props => props.right}px;

	background-color: ${props => (props.$active ? ORANGE : MEDIUM_BLUE)} !important;

	&:hover {
		background-color: ${props => (props.$isDisabled ? MEDIUM_BLUE : ORANGE)} !important;
	}

	opacity: ${props => (props.$isDisabled ? 0.6 : 1)};
	cursor: ${props => (props.$isDisabled ? 'not-allowed' : 'pointer')};
`;
