import { useCallback } from 'react';
import { showOnMap } from '../../../store/showOnMap.js';
import { deleteFeature } from '../../../features/deleteFeature/deleteFeature.js';
import { updateFeatureAttributes } from '../../../features/saveFeature/updateFeature.js';
import { addNewFeature } from '../../../features/saveFeature/addNewFeature.js';
import { editVirtMarker } from '../../../features/VirtMarker/editVirtMarker.js';
import { filterSystemProperties } from '../../../utils/filterSystemProperties.js';
import { showAlert, showConfirm } from '../../../store/modalDialog.js';
import KML from 'ol/format/KML';
import { map } from '../../../legacy/globals.js';

const VIRT_MARKER_LAYER_ID = 'SGIO_ILI_DATA_VIRT_MARKER';

export function useFeatureActions(
	layer,
	featureId,
	feature,
	form,
	isNewFeature,
	config,
	setFeatureData,
	setLoading,
	onClose,
	handleCancelEditGeometry,
	isGeometryEditing,
	messageApi,
	onAfterSave = null
) {
	const handleShowOnMap = useCallback(() => {
		showOnMap({ featureId, layer });
	}, [featureId, layer]);

	const handleDeleteFeature = useCallback(async () => {
		if (isGeometryEditing) {
			handleCancelEditGeometry();
		}

		const confirmed = await showConfirm(
			'Потверждение удаления',
			'Вы уверены, что хотите безвозратно удалить объект?',
			'Да',
			'Нет'
		);

		if (confirmed) {
			if (isNewFeature && feature) {
				const source = layer.getSource();
				source.removeFeature(feature);
				onClose();
			} else {
				deleteFeature(featureId, layer, onClose);
			}
		}
	}, [
		isGeometryEditing,
		isNewFeature,
		feature,
		layer,
		featureId,
		onClose,
		handleCancelEditGeometry,
	]);

	const handleSaveEdit = useCallback(async () => {
		try {
			const confirmed = await showConfirm(
				'Потверждение сохранения',
				'Вы уверены, что хотите сохранить изменения на объекте?',
				'Да',
				'Нет'
			);
			if (!confirmed) {
				return;
			}

			setLoading(true);
			const values = await form.validateFields();

			if (feature) {
				Object.keys(values).forEach(key => {
					feature.set(key, values[key]);
				});

				const visibleAtribs = filterSystemProperties(layer.atribs, config).filter(
					atrib => atrib.visible !== false
				);

				const processedValues = {};
				visibleAtribs.forEach(atrib => {
					const value = values[atrib.name];

					if (atrib.type === 'DATE' && value && value.format) {
						processedValues[atrib.name] = value.format('YYYY-MM-DD');
					} else {
						processedValues[atrib.name] = value;
					}
				});

				if (isNewFeature) {
						await addNewFeature(layer, feature);
						setFeatureData(prev => ({
							...prev,
							...processedValues,
						}));
						messageApi.success('Объект успешно создан');
						if (onAfterSave) {
							onAfterSave();
						} else {
							onClose();
						}
				} else if (layer.id === VIRT_MARKER_LAYER_ID) {
						// Virtual reper — re-project geometry onto route and update via IPC
						try {
							await editVirtMarker(layer, featureId, feature, processedValues);
							setFeatureData(prev => ({ ...prev, ...processedValues }));
							messageApi.success('Виртуальный репер обновлён');
							if (onAfterSave) {
								onAfterSave();
							} else {
								onClose();
							}
						} catch (err) {
							console.error('[editVirtMarker] error:', err);
							messageApi.error(`Ошибка обновления: ${err.message}`);
						}
					} else {
						updateFeatureAttributes(
							layer,
							featureId,
							processedValues,
							() => {
								setFeatureData(prev => ({
									...prev,
									...processedValues,
								}));
								messageApi.success('Изменения успешно сохранены');
							},
							error => {
								console.log(`Ошибка сохранения: ${error.message}`);
								messageApi.error(`Ошибка сохранения: ${error.message}`);
							}
						);
					}
			}
		} catch (error) {
			console.error('Error saving feature:', error);
		} finally {
			setLoading(false);
		}
	}, [
		form,
		feature,
		layer,
		featureId,
		isNewFeature,
		config,
		setFeatureData,
		setLoading,
		onClose,
		messageApi,
		onAfterSave,
	]);

	const handleExportKML = useCallback(async () => {
		if (!feature) return;

		try {
			const format = new KML({
				showPointNames: true,
				writeStyles: true,
			});

			// Клонируем объект для экспорта
			const clonedFeature = feature.clone();
			
			// Трансформируем геометрию в WGS84 для KML
			const geometry = clonedFeature.getGeometry();
			if (geometry) {
				geometry.transform(map.getView().getProjection(), 'EPSG:4326');
			}

			// Генерируем KML контент
			let kmlContent = format.writeFeatures([clonedFeature], {
				dataProjection: 'EPSG:4326',
			});

			// Форматируем KML
			kmlContent = kmlContent.replace(/,0/g, ',nan');
			kmlContent = kmlContent.replace(/<\/\w*>/g, '$&\n');
			kmlContent = kmlContent.replace(/\/>/g, '$&\n');
			kmlContent = kmlContent.replace(/\\\\/g, '\\');

			// Генерируем имя файла на основе названия слоя и ID объекта
			const layerName = layer.get ? layer.get('descr') : (layer.descr || layer.id || 'layer');
			const objectId = featureId || feature.getId() || 'unknown';
			
			// Очищаем название слоя от недопустимых символов для имени файла
			const cleanLayerName = layerName.replace(/[<>:"/\\|?*]/g, '_');
			const cleanObjectId = String(objectId).replace(/[<>:"/\\|?*]/g, '_');
			
			const fileName = `${cleanLayerName}_${cleanObjectId}.kml`;

			// Сохраняем файл
			const { filePath, canceled } = await electronAPI.showSaveDialog({
				title: 'Экспортировать объект в KML',
				defaultPath: fileName,
				filters: [{ name: 'KML Files', extensions: ['kml'] }],
			});

			if (canceled || !filePath) return;

			await electronAPI.writeFile(filePath, kmlContent);

			messageApi.success('Объект успешно экспортирован в KML');
		} catch (error) {
			console.error('Error exporting feature to KML:', error);
			showAlert('Ошибка', `Не удалось экспортировать объект в KML: ${error.message}`);
		}
	}, [feature, messageApi]);

	return {
		handleShowOnMap,
		handleDeleteFeature,
		handleSaveEdit,
		handleExportKML,
	};
}
