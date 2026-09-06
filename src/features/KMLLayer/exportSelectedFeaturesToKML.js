import KML from 'ol/format/KML';
import { map } from '../../legacy/globals';
import { requestToDBPromise } from '../../legacy/DBManage';
import { showAlert } from '../../store/modalDialog.js';

export async function exportSelectedFeaturesToKML(layer, featureIds) {
	if (!layer || !featureIds || featureIds.length === 0) {
		await showAlert('Предупреждение', 'Не выбраны объекты для экспорта');
		return;
	}

	const format = new KML({
		showPointNames: true,
		writeStyles: true,
	});

	try {
		const source = layer.getSource();
		const allFeatures = source.getFeatures();

		// Находим выбранные объекты
		const selectedIds = new Set(featureIds.map(String));
		const selectedFeatures = allFeatures.filter(feature => selectedIds.has(String(feature.id)));

		if (selectedFeatures.length === 0) {
			await showAlert('Предупреждение', 'Выбранные объекты не найдены на карте');
			return;
		}

		const attributesById = layer.get('kmlType')
			? null
			: await loadSelectedAttributes(
					layer,
					selectedFeatures.map(feature => feature.id)
				);
		const exportedFeatures = [];

		for (const feature of selectedFeatures) {
			const clonedFeature = feature.clone();
			if (attributesById) {
				const row = attributesById.get(String(feature.id));
				if (!row) {
					throw new Error(`Не найдены атрибуты объекта ${feature.id}`);
				}
				for (const atrib of layer.atribs || []) {
					let value = row[atrib.name] ?? '';
					if (atrib.type === 'DATE' && typeof value === 'string') {
						value = value.replace(/^(\d{4})-(\d{2})-(\d{2})(.*)$/, '$3.$2.$1');
					}
					clonedFeature.set(atrib.name, value);
				}
			}

			// Трансформируем геометрию в WGS84 для KML
			const geometry = clonedFeature.getGeometry();
			if (geometry) {
				geometry.transform(map.getView().getProjection(), 'EPSG:4326');
			}

			exportedFeatures.push(clonedFeature);
		}

		let kml = format.writeFeatures(exportedFeatures, {
			dataProjection: 'EPSG:4326',
		});

		// Форматирование KML
		kml = kml.replace(/<\/\w*>/g, '$&\n');
		kml = kml.replace(/\/>/g, '$&\n');

		const fileName = `${layer.id}_selected_${selectedFeatures.length}.kml`;

		const { filePath, canceled } = await electronAPI.showSaveDialog({
			title: 'Сохранить выбранные объекты как KML',
			defaultPath: fileName,
			filters: [{ name: 'KML Files', extensions: ['kml'] }],
		});

		if (canceled || !filePath) return;

		await electronAPI.writeFile(filePath, kml);

		await showAlert(
			'Успех',
			`Экспортировано объектов: ${selectedFeatures.length}\nФайл сохранён: ${filePath}`
		);
	} catch (e) {
		console.error('Export error:', e);
		await showAlert('Ошибка', `Не удалось экспортировать объекты\n${String(e)}`);
	}
}

// Map features only contain geometry and styling fields; export attributes from the DB.
async function loadSelectedAttributes(layer, featureIds) {
	const quoteIdentifier = value => `"${value.replace(/"/g, '""')}"`;
	const pk = layer.primaryKey || 'id';
	const fields = [...new Set([pk, ...(layer.atribs || []).map(atrib => atrib.name)])]
		.map(quoteIdentifier)
		.join(', ');
	const attributesById = new Map();

	for (let offset = 0; offset < featureIds.length; offset += 500) {
		const ids = featureIds
			.slice(offset, offset + 500)
			.map(id => `'${String(id).replace(/'/g, "''")}'`)
			.join(', ');
		const result = await requestToDBPromise(
			`SELECT ${fields} FROM ${quoteIdentifier(layer.table)} WHERE ${quoteIdentifier(pk)} IN (${ids})`
		);
		for (let i = 0; i < result.rows.length; i++) {
			const row = result.rows.item(i);
			attributesById.set(String(row[pk]), row);
		}
	}
	return attributesById;
}
