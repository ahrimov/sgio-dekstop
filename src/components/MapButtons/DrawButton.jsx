import React from 'react';
import { BaseMapButton } from './BaseMapButton.jsx';
import addObject from '../../assets/resources/images/assets/addObject.png';
import {
	$mapInteractionMode,
	changeInteractionMode,
	DRAW_INTERACTION,
} from '../../store/mapInteractionMode.js';
import { useUnit } from 'effector-react';
import { openLayerSelector } from '../LayerSelector/layerSelectorState.js';

export function DrawButton({ style }) {
	const mapInteractionMode = useUnit($mapInteractionMode);

	const handleClick = () => {
		changeInteractionMode(DRAW_INTERACTION);
		openLayerSelector();
	};

	const titleText = 'Создать объект';
	return (
		<BaseMapButton
			active={mapInteractionMode === DRAW_INTERACTION}
			img={addObject}
			title={titleText}
			onClick={handleClick}
			style={style}
		/>
	);
}
