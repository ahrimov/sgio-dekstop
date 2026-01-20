import React from 'react';
import { BaseMapButton } from './BaseMapButton.jsx';
import handImage from '../../assets/resources/images/assets/hand.png';
import {
	$mapInteractionMode,
	changeInteractionMode,
	DEFAULT_INTERACTION,
} from '../../shared/mapInteractionMode.js';
import { useUnit } from 'effector-react';

export function PanButton() {
	const mapInteractionMode = useUnit($mapInteractionMode);

	const handleClick = () => {
		changeInteractionMode(DEFAULT_INTERACTION);
	};

	const titleText = 'Режим перемещения по карте';
	return (
		<BaseMapButton
			active={mapInteractionMode === DEFAULT_INTERACTION}
			img={handImage}
			title={titleText}
			onClick={handleClick}
		/>
	);
}
