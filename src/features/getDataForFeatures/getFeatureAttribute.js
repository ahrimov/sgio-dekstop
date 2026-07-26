import { requestToDBPromise } from '../../legacy/DBManage';


function roundNumericValue(value, atrib) {
	if (
		window.showAllPrecision ||
		value === null ||
		value === undefined ||
		typeof value !== 'number'
	) {
		return value;
	}
	if (atrib.type === 'NUMBER' || atrib.type === 'FLOAT' || atrib.type === 'DOUBLE') {
		return Number(value.toFixed(2));
	}
	return value;
}

export async function getFeatureAttributes(layer, featureId) {
	if (featureId === undefined || featureId === null) {
		console.warn(`getFeatureAttributes: featureId is ${featureId} for layer "${layer?.table}"`);
		return null;
	}

	const tableName = layer.table;
	const pk = layer.primaryKey || 'id';
	const atribs = layer.atribs.map(a => a.name);
	const fields = atribs.join(', ');

	const sql = `SELECT ${fields} FROM ${tableName} WHERE ${pk} = ${featureId}`;

	const result = await requestToDBPromise(sql);

	if (result.rows.length === 0) {
		return null;
	}

	const featureData = result.rows.item(0);

	layer.atribs.forEach(atrib => {
		if (atrib.type === 'ENUM' && atrib.options) {
			let value = featureData[atrib.name];

			if (Array.isArray(atrib.options)) {
				const found = atrib.options.find(opt => opt.value == value);
				if (found) featureData[atrib.name] = found.label;
			} else if (typeof atrib.options === 'object') {
				if (Object.prototype.hasOwnProperty.call(atrib.options, value)) {
					featureData[atrib.name] = atrib.options[value];
				}
			}
		}
		featureData[atrib.name] = roundNumericValue(featureData[atrib.name], atrib);
	});

	return featureData;
}
