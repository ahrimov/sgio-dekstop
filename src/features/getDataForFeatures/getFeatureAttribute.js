import { requestToDBPromise } from '../../legacy/DBManage';

export async function getFeatureAttributes(layer, featureId) {
	const tableName = layer.id;
	const atribs = layer.atribs.map(a => a.name);
	const fields = atribs.join(', ');

	const sql = `SELECT ${fields} FROM ${tableName} WHERE id = ${featureId}`;

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
	});

	return featureData;
}
