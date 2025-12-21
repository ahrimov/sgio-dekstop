import { requestToDB } from "../../legacy/DBManage";

export function getFeaturesTotal(layer, filters, callback) {
    const tableName = layer.id;
    const filterClauses = Object.entries(filters).map(([key, value]) =>
        value ? `${key} LIKE '%${value.replace(/'/g, "''")}%'` : null
    ).filter(Boolean);
    const where = filterClauses.length ? `WHERE ${filterClauses.join(' AND ')}` : '';
    const sql = `SELECT count(*) as cnt FROM ${tableName} ${where}`;
    requestToDB(sql, (result) => {
        callback(result.rows.item(0).cnt);
    });
}