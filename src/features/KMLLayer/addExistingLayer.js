import KML from 'ol/format/KML';
import { layers, map } from '../../legacy/globals';
import { pathToTempKMlStorage, root_directory } from '../../legacy/initial';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { minZIndexForVectorLayers } from '../../legacy/consts';
import { Circle, Fill, Stroke, Style } from 'ol/style';

export async function addExistingKMLLayers(updateCounter, updateProgress) {
	try {
		const folderPath = pathToTempKMlStorage + '/';
		const files = await getKmlLayerFiles();
		if (!files?.length) {
			return;
		}

		const mapProjection = map.getView().getProjection().getCode();
		const format = new KML();

		updateCounter(files.filter(file => file.endsWith('.kml')).length);

		for (const file of files) {
			if (!file.endsWith('.kml')) continue;

			try {
				if (file.endsWith('.kml')) {
					const innerLayerId = file;
					let descrLayerId = file;

					const kmlContent = await electronAPI.readFile(folderPath + file);
					if (!kmlContent) continue;
					const features = format.readFeatures(kmlContent, {
						dataProjection: 'EPSG:4326',
						featureProjection: mapProjection,
					});

					const parser = new DOMParser();
					const xmlDoc = parser.parseFromString(kmlContent, 'application/xml');

					const schemaElement = xmlDoc.querySelector('kml > Document > Schema');
					if (schemaElement) {
						const schemaId = schemaElement.getAttribute('name');
						descrLayerId = schemaId;
					}

					const layerAtribs = [];

					const schemaElements = xmlDoc.getElementsByTagName('Schema');

					if (schemaElements.length > 0) {
						const simpleFields = schemaElements[0].getElementsByTagName('SimpleField');
						for (let i = 0; i < simpleFields.length; i++) {
							const name = simpleFields[i].getAttribute('name');
							if (name) {
								layerAtribs.push({
									name,
									label: name,
									visible: true,
									type: 'STRING',
								});
							}
						}
					}

					const regex = new RegExp(`^${descrLayerId}(_\\d)?`);
					const similarLayers = layers.filter(layer => regex.test(layer.label));
					if (similarLayers?.length) descrLayerId += '_' + similarLayers.length;

					features.forEach(feature => {
						feature.id = feature.get('ID');
						feature.layerID = innerLayerId;
						feature.type = 'default';
					});
					const newLayer = new VectorLayer({
						id: innerLayerId,
						descr: descrLayerId,
						source: new VectorSource({ features }),
						zIndex: minZIndexForVectorLayers,
						style: styleFunction,
					});
					newLayer.id = innerLayerId;
					newLayer.label = descrLayerId;

					let geometryType = null;
					const geometryTypeField = xmlDoc.querySelector(
						'SimpleField[name="geometryType"]'
					);
					if (geometryTypeField) {
						geometryType = geometryTypeField.getAttribute('actualType');
					}

					if (!geometryType && features[0].getGeometry()) {
						geometryType = features[0].getGeometry().getType();
					}

					newLayer.geometryType = geometryType;

					//loadKMLLayerStyle(newLayer, kmlContent, geometryType);

					newLayer.set('fileUri', pathToTempKMlStorage + '/' + innerLayerId);
					newLayer.visible = true;
					newLayer.set('kmlType', true);
					newLayer.atribs = layerAtribs;
					newLayer.enabled = true;

					layers.push(newLayer);

					//loadLayersVisibility();
				}
			} catch (error) {
				console.error(`Error processing file ${file}:`, error);
			} finally {
				updateProgress(file);
			}
		}
	} catch (e) {
		console.error('Error in addExistingKMLLayers:', e);
	}
}

function styleFunction(feature) {
	const geometryType = feature.getGeometry().getType();
	switch (geometryType) {
		case 'Point':
			return new Style({
				image: new Circle({
					radius: 8,
					fill: new Fill({ color: '#2375fa' }),
					stroke: new Stroke({
						color: 'white',
						width: 3,
					}),
				}),
			});

		case 'LineString':
			return new Style({
				stroke: new Stroke({
					color: '#2375fa',
					width: 3,
				}),
			});

		case 'Polygon':
			return new Style({
				fill: new Fill({
					color: 'rgba(35, 117, 250, 0.5)',
				}),
				stroke: new Stroke({
					color: '#2375fa',
					width: 2,
				}),
			});

		default:
			return new Style();
	}
}

async function getKmlLayerFiles() {
	const pathToConfig = root_directory + '/config.xml';
	const data = await electronAPI.readFile(pathToConfig);
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(data, 'application/xml');

	const kmlFilesNode = xmlDoc.querySelector('storage KML KMLFiles');
	if (!kmlFilesNode || !kmlFilesNode.textContent.trim()) {
		console.log('Тег <KMLFiles> не найден или пуст.');
		return [];
	}

	const kmlFiles = kmlFilesNode.textContent.split('|').filter(file => file.trim() !== '');
	console.log(`Найдены KML файлы в конфиге: ${kmlFiles.join(', ')}`);
	return kmlFiles;
}
