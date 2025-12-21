import { requestToDB } from "../../legacy/DBManage";

export function getFeatureDatas(layer, { offset = 0, limit = 100, filters = {} }, callback) {
    const tableName = layer.id; 
    const atribs = layer.atribs.map(a => a.name);

    const fields = [...atribs, 'rowid as key'].join(', ');

    const filterClauses = Object.entries(filters)
        .map(([key, value]) =>
            value ? `${key} LIKE '%${value.replace(/'/g, "''")}%'` : null
        )
        .filter(Boolean);
    const where = filterClauses.length ? `WHERE ${filterClauses.join(' AND ')}` : '';

    const sql = `SELECT ${fields} FROM ${tableName} ${where} LIMIT ${limit} OFFSET ${offset}`;

    requestToDB(sql, (result) => {
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
