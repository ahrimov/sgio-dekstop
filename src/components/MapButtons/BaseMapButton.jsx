import React from 'react';
import { Button } from 'antd';
import styled from 'styled-components';
import { MEDIUM_BLUE, MEDIUM_DARK_BLUE, ORANGE } from '../../consts/style';

export function BaseMapButton({ active, img, title, onClick }) {
	return (
		<BaseMapButtonStyle $active={active} onClick={onClick} title={title}>
			<img src={img} />
		</BaseMapButtonStyle>
	);
}

const BaseMapButtonStyle = styled(Button).withConfig({
	shouldForwardProp: prop => !['active'].includes(prop),
})`
	border: 1px solid ${MEDIUM_DARK_BLUE} !important;
	box-shadow: 0 0 0 ${MEDIUM_BLUE} !important;
	border-radius: 20px;
	height: 40px;
	width: 40px;
	top: ${props => props.top}px;
	right: ${props => props.right}px;

	background-color: ${props => (props.$active ? ORANGE : MEDIUM_BLUE)} !important;

	&:hover {
		background-color: ${ORANGE} !important;
	}
`;
