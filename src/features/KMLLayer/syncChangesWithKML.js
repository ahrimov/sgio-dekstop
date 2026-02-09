import { toLonLat } from 'ol/proj';
import { saveFile } from '../../legacy/FileManage';
import { layers } from '../../legacy/globals';
import { pathToTempKMlStorage } from '../../legacy/initial';

export async function syncChangesWithKML(layerId, succes, onError) {
	const layer = layers.find(layer => layer.get('id') === layerId);
	const fileUri = layer.get('fileUri');
	const features = layer.getSource().getFeatures();
	const originalKMLContent = await electronAPI.readFile(fileUri);
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(originalKMLContent, 'application/xml');

	if (features.length) {
		ensureGeometryTypeInSchema(xmlDoc, features[0].getGeometry().getType());
	}

	const placemarks = {};
	const placemarkNodes = xmlDoc.querySelectorAll('Placemark');
	placemarkNodes.forEach(placemark => {
		const id = placemark.querySelector('SimpleData[name="ID"]')?.textContent;
		if (id) {
			placemarks[id] = placemark;
		}
	});

	features.forEach(feature => {
		const featureId = feature.get('ID');
		const placemark = placemarks[featureId];

		if (placemark) {
			const properties = feature.getProperties();
			Object.entries(properties).forEach(([key, value]) => {
				if (key === 'geometry') return;

				const simpleData = placemark.querySelector(`SimpleData[name="${key}"]`);

				if (simpleData) {
					simpleData.textContent = String(value);
				} else {
					const newSimpleData = xmlDoc.createElement('SimpleData');
					newSimpleData.setAttribute('name', key);
					newSimpleData.textContent = String(value);
					const schemaData = placemark.querySelector('SchemaData');
					if (schemaData) {
						schemaData.appendChild(newSimpleData);
					} else {
						console.warn(`Не найден тег SchemaData для Placemark с ID ${featureId}.`);
					}
				}
			});

			const geometry = feature.getGeometry();
			if (geometry) {
				const geometryType = geometry.getType();

				const oldGeometryNode = placemark.querySelector('Point, LineString, Polygon');
				if (oldGeometryNode) {
					oldGeometryNode.parentNode.removeChild(oldGeometryNode);
				}

				let newGeometryNode;
				if (geometryType === 'Point') {
					newGeometryNode = createPointGeometry(geometry, xmlDoc);
				} else if (geometryType === 'LineString') {
					newGeometryNode = createLineStringGeometry(geometry, xmlDoc);
				} else if (geometryType === 'Polygon') {
					newGeometryNode = createPolygonGeometry(geometry, xmlDoc);
				}

				if (newGeometryNode) {
					placemark.appendChild(newGeometryNode);
				}
			}
		}
	});

	features.forEach(feature => {
		const featureId = feature.get('ID');
		if (!featureId) return;

		const placemark = placemarks[featureId];
		if (placemark && feature.deleted) {
			placemark.parentNode.removeChild(placemark);
			layer.getSource().removeFeature(feature);
		}
	});

	features.forEach(feature => {
		if (feature.isNew) {
			const newPlacemark = createPlacemarkFromFeature(layerId, feature, xmlDoc);
			const folder = xmlDoc.querySelector('Folder');
			if (folder) {
				folder.appendChild(newPlacemark);
				feature.isNew = false;
			}
		}
	});

	const serializer = new XMLSerializer();
	const newKMLContent = serializer.serializeToString(xmlDoc);

	const path = pathToTempKMlStorage + '/';
	const fileName = layerId;
	saveFile(
		path,
		fileName,
		newKMLContent,
		() => {
			console.log('Успешное сохранение данных в файл: ' + fileName);
			if (succes) succes();
		},
		error => {
			window.alert('Произошла ошибка при сохранение данных.');
			if (onError) onError(error);
		}
	);
}

function createPlacemarkFromFeature(layerId, feature, xmlDoc) {
	const placemark = xmlDoc.createElement('Placemark');

	const name = xmlDoc.createElement('name');
	name.textContent = feature.get('name') || '';
	placemark.appendChild(name);

	const description = xmlDoc.createElement('description');
	description.textContent = feature.get('description') || '';
	placemark.appendChild(description);

	const extendedData = xmlDoc.createElement('ExtendedData');
	const schemaData = xmlDoc.createElement('SchemaData');
	schemaData.setAttribute('schemaUrl', layerId);

	const properties = feature.getProperties();
	Object.entries(properties).forEach(([key, value]) => {
		if (key === 'geometry') return;

		const simpleData = xmlDoc.createElement('SimpleData');
		simpleData.setAttribute('name', key);
		simpleData.textContent = String(value);
		schemaData.appendChild(simpleData);
	});

	extendedData.appendChild(schemaData);
	placemark.appendChild(extendedData);

	const geometry = feature.getGeometry();
	if (geometry) {
		const geometryType = geometry.getType();
		let geometryNode;

		if (geometryType === 'Point') {
			geometryNode = createPointGeometry(geometry, xmlDoc);
		} else if (geometryType === 'LineString') {
			geometryNode = createLineStringGeometry(geometry, xmlDoc);
		} else if (geometryType === 'Polygon') {
			geometryNode = createPolygonGeometry(geometry, xmlDoc);
		}

		if (geometryNode) {
			placemark.appendChild(geometryNode);
		}
	}

	return placemark;
}

function createPointGeometry(geometry, xmlDoc) {
	const point = xmlDoc.createElement('Point');
	const coordinates = xmlDoc.createElement('coordinates');
	const geomCoordinates = geometry.getCoordinates();
	const lonLat = toLonLat(geomCoordinates);
	coordinates.textContent = `${lonLat[0]},${lonLat[1]}`;
	point.appendChild(coordinates);
	return point;
}

function createLineStringGeometry(geometry, xmlDoc) {
	const lineString = xmlDoc.createElement('LineString');
	const coordinates = xmlDoc.createElement('coordinates');
	const geomCoordinates = geometry.getCoordinates();
	const lonLatCoordinates = geomCoordinates.map(coord => toLonLat(coord));
	coordinates.textContent = lonLatCoordinates.map(coord => `${coord[0]},${coord[1]}`).join(' ');
	lineString.appendChild(coordinates);
	return lineString;
}

function createPolygonGeometry(geometry, xmlDoc) {
	const polygon = xmlDoc.createElement('Polygon');
	const outerBoundaryIs = xmlDoc.createElement('outerBoundaryIs');
	const linearRing = xmlDoc.createElement('LinearRing');
	const coordinates = xmlDoc.createElement('coordinates');

	const geomCoordinates = geometry.getCoordinates()[0];
	const lonLatCoordinates = geomCoordinates.map(coord => toLonLat(coord));
	coordinates.textContent = lonLatCoordinates.map(coord => `${coord[0]},${coord[1]}`).join(' ');

	linearRing.appendChild(coordinates);
	outerBoundaryIs.appendChild(linearRing);
	polygon.appendChild(outerBoundaryIs);
	return polygon;
}

function ensureGeometryTypeInSchema(xmlDoc, geometryType) {
	const schema = xmlDoc.querySelector('Schema');
	if (!schema) return;

	const hasGeometryType = Array.from(schema.querySelectorAll('SimpleField')).some(
		field => field.getAttribute('name') === 'geometryType'
	);

	if (!hasGeometryType) {
		const geometryTypeField = xmlDoc.createElement('SimpleField');
		geometryTypeField.setAttribute('name', 'geometryType');
		geometryTypeField.setAttribute('type', 'string');

		geometryTypeField.setAttribute('actualType', geometryType);
		schema.appendChild(geometryTypeField);
	}
}
