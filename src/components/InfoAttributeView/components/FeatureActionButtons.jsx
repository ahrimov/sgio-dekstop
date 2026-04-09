import React from 'react';
import { Flex } from 'antd';
import { BaseMapButton } from '../../MapButtons/BaseMapButton.jsx';
import editGeometry from '../../../assets/resources/images/assets/editGeometry.png';
import showOnMapIcon from '../../../assets/resources/images/assets/showOnMap.png';
import deleteIcon from '../../../assets/resources/images/assets/delete.png';
import saveIcon from '../../../assets/resources/images/assets/save.png';
import undoIcon from '../../../assets/resources/images/assets/undo.png';
import exportIcon from '../../../assets/resources/images/assets/exportNAV.png';

export function FeatureActionButtons({
	isNewFeature,
	isGeometryEditing,
	handleSaveEdit,
	handleEditGeometryClick,
	handleShowOnMap,
	handleDeleteFeature,
	handleCancelEdit,
	handleExportKML,
}) {
	if (isNewFeature) {
		return (
			<Flex gap={2} justify="center" style={{ width: '100%' }}>
				<BaseMapButton title="Сохранить" img={saveIcon} onClick={handleSaveEdit} />
				<BaseMapButton title="Удалить" img={deleteIcon} onClick={handleDeleteFeature} />
			</Flex>
		);
	}

	return (
		<Flex gap={2} justify="flex-start">
			<BaseMapButton title="Сохранить" img={saveIcon} onClick={handleSaveEdit} />
			<BaseMapButton title="Отменить изменения" img={undoIcon} onClick={handleCancelEdit} />
			<BaseMapButton
				title="Редактировать геометрию"
				img={editGeometry}
				onClick={handleEditGeometryClick}
				active={isGeometryEditing}
			/>
			<BaseMapButton title="Удалить" img={deleteIcon} onClick={handleDeleteFeature} />
			<BaseMapButton title="Экспорт в KML" img={exportIcon} onClick={handleExportKML} />
			<BaseMapButton
				title="Показать на карте"
				img={showOnMapIcon}
				onClick={handleShowOnMap}
			/>
		</Flex>
	);
}
