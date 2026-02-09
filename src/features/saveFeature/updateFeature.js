import { requestToDBPromise } from '../../legacy/DBManage';
import { refreshFeatureTable } from '../../shared/refreshTable';
import { syncChangesWithKML } from '../KMLLayer/syncChangesWithKML';
import { writeFeatureInKML } from './writeFeatureInKml';

export async function updateFeatureAttributes(
	layer,
	featureId,
	updatedAttributes,
	onSuccess,
	onError
) {
	try {
		const features = layer.getSource().getFeatures();
		const feature = features.find(f => f.id === featureId);

		if (!feature) {
			throw new Error(`Фича с ID ${featureId} не найдена`);
		}

		Object.entries(updatedAttributes).forEach(([key, value]) => {
			feature.set(key, value);
		});

		const properties = feature.getProperties();

		const filteredProps = Object.entries(properties)
			.filter(([key, value]) => key !== 'geometry')
			.reduce((obj, [key, value]) => {
				if (value !== undefined && value !== null && value !== '') {
					obj[key] = value;
				}
				return obj;
			}, {});

		const setClauses = Object.entries(filteredProps)
			.filter(([key]) => key !== 'id')
			.map(([key, value]) => {
				const sqlValue = toSqlValue(value);
				return `${key} = ${sqlValue}`;
			})
			.join(', ');

		if (!setClauses) {
			if (onSuccess) onSuccess(feature);
			return;
		}

		let geometryUpdate = '';
		const geometry = feature.getGeometry();
		if (geometry) {
			const featureString = writeFeatureInKML(feature);
			geometryUpdate = `, Geometry = GeomFromText('${featureString}', 3857)`;
		}

		const kmlType = layer.get('kmlType');
		if (kmlType) {
			feature.changed();
			await syncChangesWithKML(layer.id);
		} else {
			const query = `
			UPDATE ${layer.id} 
			SET ${setClauses}${geometryUpdate}
			WHERE id = ${featureId};
		`;
			await requestToDBPromise(query);
		}

		feature.id = featureId;
		feature.layerID = layer.id;

		if (layer.styleTypeColumn && filteredProps[layer.styleTypeColumn] !== undefined) {
			feature.type = filteredProps[layer.styleTypeColumn];
		}

		if (layer.labelColumn && filteredProps[layer.labelColumn] !== undefined) {
			feature.label = filteredProps[layer.labelColumn];
		}

		feature.changed();

		setTimeout(() => refreshFeatureTable(), 50);

		if (onSuccess) onSuccess(feature);
	} catch (error) {
		console.error('Error updating feature attributes:', error);
		if (onError) {
			onError(error);
		} else {
			alert(`Ошибка обновления: ${error.message}`);
		}
	}
}

export async function updateFeatureGeometry(layer, featureId, geometry, onSuccess, onError) {
	try {
		const source = layer.getSource();
		const features = source.getFeatures();
		const feature = features.find(f => f.id === featureId);

		if (!feature) {
			throw new Error(`Фича с ID ${featureId} не найдена в слое ${layer.id}`);
		}

		if (!geometry) {
			throw new Error('Не указана новая геометрия');
		}

		feature.setGeometry(geometry);

		const kmlType = layer.get('kmlType');
		if (kmlType) {
			feature.changed();
			await syncChangesWithKML(layer.id);
		} else {
			const featureString = writeFeatureInKML(feature);
			const query = `
				UPDATE ${layer.id} 
				SET Geometry = GeomFromText('${featureString}', 3857)
				WHERE id = ${featureId};
			`;
			await requestToDBPromise(query);
		}

		feature.id = featureId;
		feature.layerID = layer.id;

		feature.changed();

		setTimeout(() => refreshFeatureTable(), 50);

		if (onSuccess) onSuccess(feature);
	} catch (error) {
		console.error('Error updating feature geometry:', error);
		if (onError) {
			onError(error);
		} else {
			alert(`Ошибка обновления геометрии: ${error.message}`);
		}
	}
}

function toSqlValue(val) {
	if (typeof val === 'string') {
		return escapeSqlString(val);
	}
	if (val instanceof Date) {
		return escapeSqlString(val.toISOString().split('T')[0]);
	}
	if (typeof val === 'number' || typeof val === 'boolean') {
		return val;
	}
	if (val !== null && val !== undefined) {
		return escapeSqlString(val.toString());
	}
	return 'NULL';
}

function escapeSqlString(str) {
	return `'${String(str).replace(/'/g, "''")}'`;
}
