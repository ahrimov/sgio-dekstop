import React from 'react';
import { BaseMapButton } from '../MapButtons/BaseMapButton.jsx';
import editGeometryImage from '../../assets/resources/images/assets/editGeometry.png';
import { useUnit } from 'effector-react';
import {
	$editGeometryPanelVisible,
	closeEditGeometryPanel,
	openEditGeometryPanel,
	setEditGeometryFeatureSelectionMode,
} from './store.js';

const show_panel_editing_geometry_tooltip = 'Редактирование геометрии';

export function ShowEditingGeometryPanelControl({ onClick }) {
	const isPanelVisible = useUnit($editGeometryPanelVisible);

	const handleClick = () => {
		if (isPanelVisible) {
			setEditGeometryFeatureSelectionMode(false);
			closeEditGeometryPanel();
		} else {
			openEditGeometryPanel();
		}
		onClick?.();
	};

	return (
		<BaseMapButton
			active={isPanelVisible}
			title={show_panel_editing_geometry_tooltip}
			onClick={handleClick}
			img={editGeometryImage}
		/>
	);
}
