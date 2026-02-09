import { addLayerToList, layers, map } from '../../legacy/globals';
import KML from 'ol/format/KML.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector';
import { minZIndexForVectorLayers, tempKMLDir } from '../../legacy/consts';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { app_device_directory } from '../../legacy/initial';
import { generateColor } from '../../shared/utils/colorGenerator';
import { saveFile } from '../../legacy/FileManage';
import { addLayerToMap } from '../../shared/updateMapLayers';

export async function addNewLayer(fullPath) {
	const answer = window.confirm(
		'Если Вы будете вносить изменения в добавляемый слой, то, для получения измененного файла, необходимо использовать функцию "Экспорт kml".',
	);
	if (!answer) return;
	let text = await electronAPI.readFile(fullPath);
	const mapProjection = map.getView().getProjection().getCode();
	const format = new KML();
	const features = format.readFeatures(text, {
		dataProjection: 'EPSG:4326',
		featureProjection: mapProjection,
	});
	if (!features || !features.length) {
		window.alert('Не найдено объектов в файле.');
		return;
	}

	if (!features[0].get('ID')) {
		text = addMissingIdsToKml(text, features);
	}

	const fileName = fullPath.split('/').pop();
	const fileNameNoExt = fileName.replace(/\.kml$/i, '');

	let descrLayerId = '';
	let schemaName = '';
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(text, 'application/xml');

	const schemaElement = xmlDoc.querySelector('kml > Document > Schema');
	if (schemaElement) {
		schemaName = schemaElement.getAttribute('name');
		if (schemaName) descrLayerId += `${schemaName}`;
		else descrLayerId = fileNameNoExt;
		schemaElement.setAttribute('name', descrLayerId);
		const serializer = new XMLSerializer();
		text = serializer.serializeToString(xmlDoc);
	} else {
		descrLayerId = fileNameNoExt;
	}

	const date = new Date();
	const innerLayerId = descrLayerId + formatDate(date) + '.kml';

	const regex = new RegExp(`^${descrLayerId}(_\\d)?`);
	const similarLayers = layers.filter(layer => regex.test(layer.label));
	if (similarLayers?.length) descrLayerId += '_' + similarLayers.length;

	let innerFeatureId = 1;
	features.forEach(feature => {
		if (feature.get('ID')) {
			feature.id = feature.get('ID');
		} else {
			const id = innerFeatureId;
			feature.set('ID', id);
			feature.id = id;
			innerFeatureId += 1;
		}
		feature.layerID = innerLayerId;
		feature.type = 'default';
	});
	const newLayer = new VectorLayer({
		id: innerLayerId,
		descr: descrLayerId,
		source: new VectorSource({ features }),
		zIndex: minZIndexForVectorLayers,
	});

	const pathToTempKMlStorage = app_device_directory + '/' + tempKMLDir;
	console.log('pathToTempKMlStorage: ', pathToTempKMlStorage);
	const exist = await electronAPI.exists(pathToTempKMlStorage);
	if (!exist) {
		await electronAPI.mkdir(pathToTempKMlStorage);
	}

	newLayer.id = innerLayerId;
	newLayer.label = descrLayerId;
	const geometryType = features[0].getGeometry().getType();
	newLayer.geometryType = geometryType;
	for (let i = 0; i < features.length; i++) {
		if (features[i]?.getGeometry().getType() !== geometryType) {
			const topology = convertGeomtetryTypeName(geometryType);
			window.alert(
				`В загружаемых данных имеются объекты различных типов геометрии (топологии). Для объектов ${topology} топологии стиль будет предложено изменить вручную. Для остальных топологий будут использованы автоматически созданные стили.`
			);
			break;
		}
	}
	newLayer.visible = true;
	newLayer.set('kmlType', true);
	newLayer.set('fileUri', pathToTempKMlStorage + '/' + innerLayerId);
	let style = new Style({
		stroke: new Stroke({
			color: '#fa2375',
			width: 3,
		}),
	});

	switch (geometryType) {
		case 'Point':
			style = new Style({
				image: new Circle({
					fill: new Fill({ color: generateColor() }),
					radius: 3,
				}),
			});
			break;
		case 'LineString':
			style = new Style({
				stroke: new Stroke({
					color: generateColor(),
					width: 2,
				}),
			});
			break;
		case 'Polygon':
			style = new Style({
				fill: new Fill({
					color: generateColor(),
				}),
				stroke: new Stroke({
					color: 'rgb(0,0,0)',
					width: 1,
				}),
			});
			break;
	}

	newLayer.setStyle(style);
	features.forEach(feature => {
		feature.setStyle(style);
	});
	const firstFeature = features[0];
	const layerKeys = firstFeature.getKeys();
	const layerAtribs = layerKeys
		.filter(key => key !== 'geometry' && key !== 'styleUrl' && key !== 'name' && key !== 'description')
		.map(key => {
			return { name: key, label: key, visible: true, type: 'STRING' };
		});
	newLayer.atribs = layerAtribs;
	newLayer.enabled = true;

	const path = pathToTempKMlStorage + '/';
	const kmlFileName = innerLayerId;
	const text_ = text;
	saveFile(
		path,
		kmlFileName,
		text_,
		() => { },
		onError
	);
	addLayerToMap(newLayer);
	addLayerToList(newLayer);
	addKMLLayerFileToConfig(innerLayerId);

	function onError() {
		window.alert('Произошла ошибка при чтении файла.');
	}
}

async function addKMLLayerFileToConfig(kmlFile) {
	try {
		const pathToConfig = app_device_directory + '/Project/config.xml';
		const data = await electronAPI.readFile(pathToConfig);
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(data, 'application/xml');

		const storageNode = xmlDoc.querySelector('storage KML');
		if (!storageNode) {
			console.error('Тег <KML> не найден в конфигурационном файле.');
			return;
		}

		let kmlFilesNode = storageNode.querySelector('KMLFiles');
		if (!kmlFilesNode) {
			kmlFilesNode = xmlDoc.createElement('KMLFiles');
			storageNode.appendChild(kmlFilesNode);
		}

		const existingFiles = kmlFilesNode.textContent
			.split('|')
			.filter(file => file.trim() !== '');
		const updatedFiles = Array.from(new Set([...existingFiles, kmlFile]));

		kmlFilesNode.textContent = updatedFiles.join('|');

		const serializer = new XMLSerializer();
		const updatedXml = serializer.serializeToString(xmlDoc);

		await electronAPI.writeFile(pathToConfig, updatedXml);
	} catch (error) {
		console.error('Ошибка при добавлении файла в конфигурационный файл:', error);
	}
}

function addMissingIdsToKml(kmlContent, features) {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(kmlContent, 'application/xml');

	let schema = xmlDoc.querySelector('Schema');
	if (!schema) {
		const document = xmlDoc.querySelector('Document');
		schema = xmlDoc.createElement('Schema');
		schema.setAttribute('name', 'DefaultSchema');
		schema.setAttribute('id', 'DefaultSchema');
		document.insertBefore(schema, document.firstChild);
	}

	let idField = Array.from(schema.querySelectorAll('SimpleField')).find(
		field => field.getAttribute('name') === 'ID'
	);

	if (!idField) {
		idField = xmlDoc.createElement('SimpleField');
		idField.setAttribute('name', 'ID');
		idField.setAttribute('type', 'string');
		schema.appendChild(idField);
	}

	const placemarks = xmlDoc.querySelectorAll('Placemark');

	placemarks.forEach((placemark, index) => {
		const schemaData = placemark.querySelector('SchemaData');
		if (!schemaData) return;

		const idData = placemark.querySelector('SimpleData[name="ID"]');
		if (idData) {
			return;
		}

		const newId = `${index}`;
		if (features[index]) {
			features[index].set('ID', newId);
		}

		const newIdData = xmlDoc.createElement('SimpleData');
		newIdData.setAttribute('name', 'ID');
		newIdData.textContent = newId;

		schemaData.appendChild(newIdData);
	});

	const serializer = new XMLSerializer();
	const updatedKml = serializer.serializeToString(xmlDoc);

	return updatedKml;
}

export function getFileNameFromUri(uri) {
	try {
		const decodedUri = decodeURIComponent(uri);

		const lastSeparatorIndex = Math.max(
			decodedUri.lastIndexOf('/'),
			decodedUri.lastIndexOf(':')
		);

		let fileName = decodedUri.substring(lastSeparatorIndex + 1);

		fileName = fileName.split('?')[0];
		fileName = fileName.split('#')[0];

		return fileName;
	} catch (e) {
		console.error('Ошибка при получении имени файла:', e);
		return 'unknown.kml';
	}
}

function convertGeomtetryTypeName(geometryType) {
	switch (geometryType) {
		case 'Point':
		case 'MultiPoint':
			return 'точечной';
		case 'LineString':
		case 'MultiLineString':
			return 'линейной';
		case 'Polygon':
		case 'MultiPolygon':
			return 'площадной';
		default:
			return geometryType;
	}
}

export function waitForLayerReady(layer, timeout = 5000) {
	return new Promise((resolve, reject) => {
		const startTime = Date.now();

		function check() {
			if (layer.getSource().getState() === 'ready') {
				resolve();
			} else if (Date.now() - startTime > timeout) {
				reject(new Error('Layer loading timeout'));
			} else {
				setTimeout(check, 100);
			}
		}

		check();
	});
}

function formatDate(date) {
	return `_${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}_${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
}
