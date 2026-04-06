import React from 'react';
import styled from 'styled-components';
import { useScaleText } from './hooks/useScaleText.js';

export function ScaleText({ map }) {
	const distanceText = useScaleText(map);

	if (!distanceText) return null;

	return (
		<ScaleTextContainer>Масштаб: в 1 см карты {distanceText} на местности</ScaleTextContainer>
	);
}

const ScaleTextContainer = styled.div`
	position: absolute;
	bottom: 65px;
	left: 50px;
	z-index: 999;
	color: #005d98;
	font-size: 12px;
	font-weight: 500;
	padding: 1px 6px;
	border-radius: 4px;
	background-color: rgba(255, 255, 255, 0.5);
	cursor: default;
	user-select: none;
	pointer-events: none;
	text-shadow: rgba(128, 128, 128, 0.5) 1px 1px 1px;
	white-space: nowrap;
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
`;
