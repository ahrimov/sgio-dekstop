import { requestToDB } from "../../legacy/DBManage";
import { refreshFeatureTable } from "../../store/refreshTable";
import { syncChangesWithKML } from "../KMLLayer/syncChangesWithKML";

export function clearLayer(layer) {
	const confirmed = window.confirm(
		`Вы уверены, что хотите очистить слой "${layer.get('descr') || layer.id}"?`
	);

    const kmlType = layer.get('kmlType');

	if (!confirmed) return;

	if (kmlType) {
		const features = layer.getSource().getFeatures();
		features.forEach(feature => (feature.deleted = true));
		syncChangesWithKML(layer.id);
		refreshFeatureTable();
	} else {
		const query = `DELETE FROM ${layer.id};`;

		requestToDB(query, () => {
			layer.getSource().clear();
			refreshFeatureTable();
		});
	}
}
