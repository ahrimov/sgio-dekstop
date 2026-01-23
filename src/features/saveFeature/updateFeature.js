import { requestToDB } from '../../legacy/DBManage';
import { refreshFeatureTable } from '../../shared/refreshTable';
import { writeFeatureInKML } from './writeFeatureInKml';

export function updateFeature(layer, feature, onSuccess, onError) {
	try {
		const featureId = feature.get('id');
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

		let geometryUpdate = '';
		const geometry = feature.getGeometry();
		if (geometry) {
			const featureString = writeFeatureInKML(feature);
			geometryUpdate = `, Geometry = GeomFromText('${featureString}', 3857)`;
		}

		const query = `
			UPDATE ${layer.id} 
			SET ${setClauses}${geometryUpdate}
			WHERE id = ${featureId};
		`;

		requestToDB(query, () => {
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
		});
	} catch (error) {
		console.error('Error updating feature:', error);
		if (onError) onError(error);
	}
}

export function updateFeatureAttributes(layer, featureId, updatedAttributes, onSuccess, onError) {
	try {
		const features = layer.getSource().getFeatures();
		const feature = features.find(f => f.get('id') === featureId);

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

		const query = `
			UPDATE ${layer.id} 
			SET ${setClauses}${geometryUpdate}
			WHERE id = ${featureId};
		`;

		requestToDB(query, () => {
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
		});
	} catch (error) {
		console.error('Error updating feature attributes:', error);
		if (onError) {
			onError(error);
		} else {
			alert(`Ошибка обновления: ${error.message}`);
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
