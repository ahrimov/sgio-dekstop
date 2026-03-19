import React from 'react';
import { BaseMapButton } from './BaseMapButton.jsx';
import plusIcon from '../../assets/resources/images/assets/zoom_in.png';
import {
	$mapInteractionMode,
	changeInteractionMode,
	ZOOM_IN_INTERACTION,
} from '../../store/mapInteractionMode.js';
import { useUnit } from 'effector-react';

export function ZoomInButton() {
	const mapInteractionMode = useUnit($mapInteractionMode);

	const handleClick = () => {
		changeInteractionMode(ZOOM_IN_INTERACTION);
	};

	const titleText = '';
	return (
		<BaseMapButton
			active={mapInteractionMode === ZOOM_IN_INTERACTION}
			img={plusIcon}
			title={titleText}
			onClick={handleClick}
		/>
	);
}