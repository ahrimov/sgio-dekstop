import React from 'react';
import { BaseMapButton } from './BaseMapButton.jsx';
import minusIcon from '../../assets/resources/images/assets/zoom_out.png';
import {
	$mapInteractionMode,
	changeInteractionMode,
	ZOOM_OUT_INTERACTION,
} from '../../store/mapInteractionMode.js';
import { useUnit } from 'effector-react';

export function ZoomOutButton() {
	const mapInteractionMode = useUnit($mapInteractionMode);

	const handleClick = () => {
		changeInteractionMode(ZOOM_OUT_INTERACTION);
	};

	const titleText = '';
	return (
		<BaseMapButton
			active={mapInteractionMode === ZOOM_OUT_INTERACTION}
			img={minusIcon}
			title={titleText}
			onClick={handleClick}
		/>
	);
}