import React from 'react';
import { BaseMapButton } from './BaseMapButton.jsx';
import editGeometry from '../../assets/resources/images/assets/editGeometry.png';
import {
	$mapInteractionMode,
	changeInteractionMode,
	DRAW_INTERACTION,
} from '../../shared/mapInteractionMode.js';
import { useUnit } from 'effector-react';
import { openLayerSelector } from '../LayerSelector/layerSelectorState.js';

export function DrawButton() {
	const mapInteractionMode = useUnit($mapInteractionMode);

	const handleClick = () => {
		changeInteractionMode(DRAW_INTERACTION);
		openLayerSelector();
	};

	const titleText = 'Режим рисования';
	return (
		<BaseMapButton
			active={mapInteractionMode === DRAW_INTERACTION}
			img={editGeometry}
			title={titleText}
			onClick={handleClick}
		/>
	);
}
