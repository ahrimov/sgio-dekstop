import { requestToDB } from '../../legacy/DBManage.js';
import { writeFeatureInKML } from './writeFeatureInKml.js';

export function addNewFeature(layer, feature) {
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
	const feautureString = writeFeatureInKML(feature);
	const query = `
                INSERT INTO ${layer.id} (${atribNames.join(', ')}, Geometry)
                VALUES (${atribValues.join(',')}, GeomFromText('${feautureString}', 3857));
                ;`;
	try {
		requestToDB(query, () => {
			feature.id = feature.get('id');
			feature.layerID = layer.id;

			const typeIndex = atribNames.indexOf(layer.styleTypeColumn);
			if (typeIndex >= 0) {
				feature.type = filteredProps[typeIndex];
			} else {
				feature.type = 'default';
			}

			const labelIndex = atribNames.indexOf(layer.labelColumn);
			if (labelIndex >= 0) {
				feature.label = filteredProps[labelIndex];
			}

			feature.changed();
		});
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
