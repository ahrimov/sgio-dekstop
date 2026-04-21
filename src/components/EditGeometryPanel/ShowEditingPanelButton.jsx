import React from 'react';
import { BaseMapButton } from '../MapButtons/BaseMapButton.jsx';
import editGeometryImage from '../../assets/resources/images/assets/editGeometry.png';
import {
	$mapInteractionMode,
	changeInteractionMode,
	DRAW_INTERACTION,
} from '../../store/mapInteractionMode';
import { useUnit } from 'effector-react';

const show_panel_editing_geometry_tooltip = 'Показать/скрыть панель редактирования';

export function ShowEditingGeometryPanelControl({ onClick }) {
	const mapInteractionMode = useUnit($mapInteractionMode);

	const handleClick = () => {
		changeInteractionMode(DRAW_INTERACTION);
		onClick?.();
	};

	return (
		<BaseMapButton
			active={mapInteractionMode === DRAW_INTERACTION}
			title={show_panel_editing_geometry_tooltip}
			onClick={handleClick}
			img={editGeometryImage}
		/>
	);
}
