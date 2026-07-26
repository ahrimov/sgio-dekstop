import { requestToDB } from '../../legacy/DBManage';
import { buildFilterClauses } from './utils';

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

export function getFeatureDatas(
	layer,
	{ offset = 0, limit = 100, filters = {}, sorter = {} },
	callback
) {
	const tableName = layer.table;
	const pk = layer.primaryKey || 'rowid';
	const atribs = layer.atribs.map(a => a.name);
	const extraFields = pk === 'id' ? ['rowid as key'] : [`${pk} as id`, 'rowid as key'];
	const fields = [...atribs, ...extraFields].join(', ');
	const filterClauses = buildFilterClauses(layer.atribs, filters);
	const allClauses = layer.whereClause
		? [layer.whereClause, ...filterClauses]
		: filterClauses;
	const where = allClauses.length ? `WHERE ${allClauses.join(' AND ')}` : '';
	let orderBy = '';
	if (sorter.field && sorter.order) {
		orderBy = `ORDER BY "${sorter.field}" ${sorter.order}`;
	}

	const sql = `SELECT ${fields} FROM ${tableName} ${where} ${orderBy} LIMIT ${limit} OFFSET ${offset}`;

	requestToDB(sql, result => {
		const data = [];
		for (let i = 0; i < result.rows.length; i++) {
			const item = result.rows.item(i);

			layer.atribs.forEach(atrib => {
				if (atrib.type === 'ENUM' && atrib.options) {
					let value = item[atrib.name];

					if (Array.isArray(atrib.options)) {
						const found = atrib.options.find(opt => opt.value == value);
						if (found) item[atrib.name] = found.label;
					} else if (typeof atrib.options === 'object') {
						if (Object.prototype.hasOwnProperty.call(atrib.options, value)) {
							item[atrib.name] = atrib.options[value];
						}
					}
				}
				if (atrib.type === 'DATE' && item[atrib.name]) {
					const date = new Date(item[atrib.name]);
					item[atrib.name] = date.toLocaleDateString('ru-RU');
				}
				item[atrib.name] = roundNumericValue(item[atrib.name], atrib);
			});

			data.push(item);
		}
		callback(data);
	});
}
