import { requestToDB } from '../../legacy/DBManage';
import { buildFilterClauses } from './utils';

export function getFeatureDatas(
	layer,
	{ offset = 0, limit = 100, filters = {}, sorter = {} },
	callback
) {
    const tableName = layer.id;
    const atribs = layer.atribs.map(a => a.name);
    const fields = [...atribs, 'rowid as key'].join(', ');
    const filterClauses = buildFilterClauses(layer.atribs, filters);
    const where = filterClauses.length ? `WHERE ${filterClauses.join(' AND ')}` : '';
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
						if (atrib.options.hasOwnProperty(value)) {
							item[atrib.name] = atrib.options[value];
						}
					}
				}
			});

			data.push(item);
		}
		callback(data);
	});
}
