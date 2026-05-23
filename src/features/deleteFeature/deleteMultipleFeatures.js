import { requestToDB } from '../../legacy/DBManage';
import { refreshFeatureTable } from '../../store/refreshTable';
import { syncChangesWithKML } from '../KMLLayer/syncChangesWithKML';
import { showAlert, showConfirm } from '../../store/modalDialog';

export async function deleteMultipleFeatures(featureIds, layer, callback) {
	if (!featureIds || featureIds.length === 0) {
		await showAlert('Предупреждение', 'Не выбраны объекты для удаления');
		return;
	}

	const confirmed = await showConfirm(
		'Подтверждение удаления',
		`Вы уверены, что хотите безвозвратно удалить ${featureIds.length} объект(ов)?`,
		'Да',
		'Нет'
	);

	if (!confirmed) {
		return;
	}

	const kmlType = layer.get('kmlType');
	
	if (kmlType) {
		// Для KML слоев помечаем объекты как удаленные
		const features = layer.getSource().getFeatures();
		
		featureIds.forEach(featureId => {
			const feature = features.find(f => f.id === featureId);
			if (feature) {
				feature.deleted = true;
			}
		});
		
		await syncChangesWithKML(layer.id);
		
		if (callback) callback();
		return;
	}

	// Для БД слоев удаляем из базы данных
	const pk = layer.primaryKey || 'id';
	const idsString = featureIds.join(',');
	const deleteQuery = `
		DELETE FROM ${layer.table}
		WHERE ${pk} IN (${idsString});
	`;

	requestToDB(
		deleteQuery,
		async () => {
			// Удаляем объекты с карты
			const source = layer.getSource();
			const features = source.getFeatures();
			
			featureIds.forEach(featureId => {
				const feature = features.find(f => f.id === featureId);
				if (feature) {
					source.removeFeature(feature);
				}
			});
			
			source.changed();
			setTimeout(() => refreshFeatureTable(), 100);
			
			if (callback) callback();
		},
		async error => {
			console.error(`Error deleting features from database:`, error);
			await showAlert('Ошибка', `Не удалось удалить объекты из базы данных\n${String(error)}`);
		}
	);
}