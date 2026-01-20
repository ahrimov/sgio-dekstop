import React from 'react';
import { BaseMapButton } from './BaseMapButton.jsx';
import infoImage from '../../assets/resources/images/assets/info.png';
import {
	$mapInteractionMode,
	changeInteractionMode,
	INFO_INTERACTION,
} from '../../shared/mapInteractionMode.js';
import { useUnit } from 'effector-react';

export function InfoButton() {
	const mapInteractionMode = useUnit($mapInteractionMode);

	const handleClick = () => {
		changeInteractionMode(INFO_INTERACTION);
	};

	const titleText = 'Режим получения информации';
	return (
		<BaseMapButton
			active={mapInteractionMode === INFO_INTERACTION}
			img={infoImage}
			title={titleText}
			onClick={handleClick}
		/>
	);
}
