import { requestToDBPromise } from '../../legacy/DBManage.js';
import { refreshFeatureTable } from '../../store/refreshTable.js';
import { syncChangesWithKML } from '../KMLLayer/syncChangesWithKML.js';
import { writeFeatureInKML } from './writeFeatureInKml.js';
import { addVirtMarker } from '../VirtMarker/addVirtMarker.js';

const VIRT_MARKER_LAYER_ID = 'SGIO_ILI_DATA_VIRT_MARKER';

export async function addNewFeature(layer, feature) {
	// Virtual reper — use specialised IPC flow (project onto route, insert via SQL)
	if (layer.id === VIRT_MARKER_LAYER_ID) {
		try {
			await addVirtMarker(layer, feature);
		} catch (error) {
			alert(error.message || error);
		}
		return;
	}

	if (!feature.get('id')) {
		feature.set('id', generateId(layer));
	}
	const properties = feature.getProperties();
	const filteredProps = Object.entries(properties)
		.filter(([key, value]) => !!value && key !== 'geometry')
		.reduce((obj, [key, value]) => {
			obj[key] = value;
			return obj;
		}, {});
	const atribNames = Object.keys(filteredProps);
	const atribValues = Object.values(filteredProps).map(toSqlValue);
	feature.isNew = true;

	try {
		const kmlType = layer.get('kmlType');
		if (kmlType) {
			await syncChangesWithKML(layer.id);
		} else {
			const feautureString = writeFeatureInKML(feature);
			const query = `
			              INSERT INTO ${layer.table} (${atribNames.join(', ')}, Geometry)
			              VALUES (${atribValues.join(',')}, GeomFromText('${feautureString}', 3857));
			              ;`;
			console.log('draw insert: ', query);
			await requestToDBPromise(query);
		}

		feature.id = layer.get('kmlType') ? feature.get('ID') : feature.get('id');
		feature.layerID = layer.id;

		feature.type = filteredProps[layer.styleTypeColumn] ?? 'default';

		if (filteredProps[layer.labelColumn] !== undefined) {
			feature.label = filteredProps[layer.labelColumn];
		}

		feature.changed();
		setTimeout(() => refreshFeatureTable(), 50);
	} catch (error) {
		alert(error);
	}
}

function generateId(layer) {
	const features = layer.getSource().getFeatures();
	let maxId = 0;
	features.forEach(feature => {
		const id = feature.id;
		if (id > maxId) {
			maxId = id;
		}
	});
	return maxId + 1;
}

function toSqlValue(val) {
	if (typeof val === 'string') {
		return escapeSqlString(val);
	}
	if (val instanceof Date) {
		return escapeSqlString(val.toISOString());
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
