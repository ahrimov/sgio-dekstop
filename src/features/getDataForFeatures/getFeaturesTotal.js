import { requestToDB } from "../../legacy/DBManage";
import { buildFilterClauses } from "./utils";

export function getFeaturesTotal(layer, filters, callback) {
    const kmlType = layer.get('kmlType');
    if (kmlType) {
        const source = layer.getSource();
        const features = source.getFeatures();
        callback(features.length);
    } else {
        const tableName = layer.id;
        const filterClauses = buildFilterClauses(layer.atribs, filters);
        const where = filterClauses.length ? `WHERE ${filterClauses.join(' AND ')}` : '';
        const sql = `SELECT count(*) as cnt FROM ${tableName} ${where}`;
        requestToDB(sql, (result) => {
            callback(result.rows.item(0).cnt);
        });
    }
}
