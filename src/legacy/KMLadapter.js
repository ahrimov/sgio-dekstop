import WKT from 'ol/format/WKT';
import { requestToDB } from './DBManage';
import Polygon, { circular } from 'ol/geom/Polygon';
import { LineString, Point } from 'ol/geom';
import { add } from 'ol/coordinate';
import { layers } from './globals.js';

export async function importKML(
	layerID,
	dict,
	features,
	{ startLoading, updateProgress, finishLoading }
) {
	let layer = layers.find(layer => layerID === layer.id);

	const sourceNumberOfFeatures = features.length;

	features = features.filter(feature => {
		try {
			return (
				typeof feature.getGeometry() !== 'undefined' &&
				feature.getGeometry() &&
				feature.getGeometry().getCoordinates()
			);
		} catch (_) {
			return false;
		}
	});

	let acceptedNumberOfFeatures = 0;

	let textFinishingLoading = 'Импорт KML завершён.';

	startLoading(features.length, 'Импорт KML…');

	let featureMaxID;

	let permissionToUpdateFeatures = -1;

	for (let i = 0; i < features.length; i++) {
		let feature = features[i];
		if (compareGeometryTypes(layer.geometryType, feature.getGeometry().getType()) == 0) {
			convertFeatureToLayerGeometry(feature, layer);
		}

		let props;
		props = filterProperties(feature.getProperties(), dict, layer);

		let feature_id = props[dict[layer.atribs[0].name]];

		if (typeof feature_id == 'undefined') {
			if (typeof featureMaxID == 'undefined') {
				featureMaxID = await autonumericID(layer.atribs[0].name, layer);
				feature_id = featureMaxID;
			} else {
				featureMaxID++;
				feature_id = featureMaxID;
			}
			props['id'] = feature_id;
			dict['id'] = 'id';
		}

		let query = `SELECT COUNT(1) as bool FROM ${layer.id} WHERE ${layer.atribs[0].name} = ${feature_id};`;
		const intersection = await new Promise((resolve, reject) => {
			requestToDB(
				query,
				data => {
					resolve(data.rows.item(0).bool);
				},
				er => {
					reject(er);
					window.alert({
						title: 'Ошибка',
						message: 'Нет доступа к базе данных.',
					});
				}
			);
		});

		if (intersection == 1) {
			if (permissionToUpdateFeatures === -1) {
				const userAnswer = window.confirm(permissionToUpdateFeaturesMessage);
				if (userAnswer) {
					permissionToUpdateFeatures = 1;
					updateFeaturesFromKML();
				} else {
					permissionToUpdateFeatures = 0;
					updateProgress(i + 1, features[i]?.getId ? features[i].getId() : '');
					continue;
				}
			} else if (permissionToUpdateFeatures) {
				updateFeaturesFromKML();
			} else {
				updateProgress(i + 1, features[i]?.getId ? features[i].getId() : '');
				continue;
			}

			function updateFeaturesFromKML() {
				let updates = [];
				const atribNames = [];
				const values = [];
				for (let key in dict) {
					if (
						typeof dict[key] == 'undefined' ||
						dict[key] == '' ||
						typeof props[dict[key]] == 'undefined' ||
						key == 'ID'
					)
						continue;
					updates.push(`${key} = '${props[dict[key]]}'`);
					atribNames.push(key);
					values.push(props[dict[key]]);
				}

				let geom = feature.getGeometry();
				geom.transform('EPSG:4326', 'EPSG:3857');

				const format = new WKT();
				let feautureString = format.writeFeature(feature);
				feautureString = convertToGeometryType(feautureString, layer.geometryType);
				updates.push(`Geometry = GeomFromText('${feautureString}', 3857)`);
				query = `UPDATE ${layer.id} SET ${updates.join(', ')} WHERE ${layer.atribs[0].name} = ${feature_id} `;
				requestToDB(query, () => {
					for (let old_feature of layer.getSource().getFeatures()) {
						if (old_feature.id == feature_id) {
							old_feature.setGeometry(feature.getGeometry());

							const typeIndex = atribNames.indexOf(layer.styleTypeColumn);
							if (typeIndex >= 0) old_feature.type = values[typeIndex];

							const labelIndex = atribNames.indexOf(layer.labelColumn);
							if (labelIndex >= 0) old_feature.label = values[labelIndex];

							acceptedNumberOfFeatures += 1;
							updateProgress(i + 1, features[i]?.getId ? features[i].getId() : '');
							break;
						}
					}
				});
			}
		} else {
			let atribNames = [];
			let atribValues = [];
			const values = [];
			for (let key in dict) {
				if (
					typeof dict[key] == 'undefined' ||
					dict[key] === '' ||
					typeof props[dict[key]] == 'undefined'
				)
					continue;
				atribNames.push(key);
				atribValues.push(`'${props[dict[key]]}'`);
				values.push(props[dict[key]]);
			}

			let geom = feature.getGeometry();
			geom.transform('EPSG:4326', 'EPSG:3857');
			const format = new WKT();
			let feautureString = format.writeFeature(feature);
			feautureString = convertToGeometryType(feautureString, layer.geometryType);
			let query = `
                INSERT INTO ${layer.id} (${atribNames.join(', ')}, Geometry)
                VALUES (${atribValues.join(',')}, GeomFromText('${feautureString}', 3857));
            ;`;
			requestToDB(query, () => {
				feature.id = feature_id;
				feature.layerID = layer.id;

				const typeIndex = atribNames.indexOf(layer.styleTypeColumn);
				if (typeIndex >= 0) feature.type = values[typeIndex];
				else feature.type = 'default';
				const labelIndex = atribNames.indexOf(layer.labelColumn);
				if (labelIndex >= 0) feature.label = values[labelIndex];

				feature.setStyle(layer.getStyle());
				layer.getSource().addFeature(feature);
				acceptedNumberOfFeatures += 1;
				updateProgress(i + 1, features[i]?.getId ? features[i].getId() : '');
			});
		}
	}

	finishLoading();

	if (sourceNumberOfFeatures !== acceptedNumberOfFeatures) {
		textFinishingLoading += ` Не все объекты были загружены. Загружено объектов ${acceptedNumberOfFeatures} из ${sourceNumberOfFeatures}.`;
	}
	window.alert({ title: 'Окончание импорта KML', message: textFinishingLoading });

	function convertToGeometryType(inp_string, type) {
		let l_brackets = '((';
		let r_brackets = '))';
		if (type === 'MULTIPOLYGON') {
			l_brackets = '(((';
			r_brackets = ')))';
		}
		inp_string = inp_string.replace(/\(+/g, l_brackets);
		inp_string = inp_string.replace(/\)+/g, r_brackets);
		if (inp_string.search('MULTI') == -1) return insert(inp_string, 'MULTI');
		return inp_string;
	}
}

function compareGeometryTypes(first, second) {
	first = first.toLowerCase();
	second = second.toLowerCase();
	first = first.replace('multi', '');
	second = second.replace('multi', '');
	if (first == second) return 1;
	return 0;
}

function convertFeatureToLayerGeometry(feature, layer) {
	let new_geom;
	switch (layer.geometryType) {
		case 'MULTIPOINT':
			new_geom = new Point(feature.getGeometry().getFirstCoordinate());
			break;
		case 'MULTIPOLYGON':
			if (feature.getGeometry().getType().search('Point') > -1) {
				new_geom = circular(feature.getGeometry().getFirstCoordinate(), 1);
			} else {
				let geom = feature.getGeometry();
				let first_coord = geom.getFirstCoordinate();
				geom.appendCoordinate(first_coord);
				let string_coords = geom.getCoordinates().toString().split(',');
				let int_coords = string_coords.map(v => {
					return parseFloat(v);
				});
				let main_array = [];
				let outer_contour = [];
				const number_of_points = int_coords.length / 3;
				for (let i = 0; i < number_of_points; i++) {
					let point = [];
					for (let j = 0; j < 3; j++) point.push(int_coords[i * 3 + j]);
					outer_contour.push(point);
				}
				main_array.push(outer_contour);
				new_geom = new Polygon(main_array);
			}
			break;
		case 'MULTILINESTRING':
			console.log(feature.getGeometry().getType());
			if (feature.getGeometry().getType().search('Point') > -1) {
				let first = feature.getGeometry().getFirstCoordinate();
				let second = feature.getGeometry().getFirstCoordinate();
				add(second, [0.000001, 0.000001]);
				new_geom = new LineString([first, second]);
			} else {
				const linearRing = feature.getGeometry().getLinearRing();
				console.log(linearRing.getCoordinates());
				new_geom = new LineString(linearRing.getCoordinates());
			}
			break;
	}
	feature.setGeometry(new_geom);
}

function filterProperties(values, dict, layer) {
	let result = {};
	let is_error_in_kml = false;
	let error_message = {};
	for (let key in values) {
		if (typeof values[key] === 'undefined') continue;
		result[key.toLowerCase()] = values[key].toString();
	}
	for (let key in dict) {
		if (dict[key] === '' || typeof result[dict[key]] === 'undefined') continue;
		let atrib = getAtribByName(layer.atribs, key);
		if (atrib.type == 'DOUBLE') {
			result[dict[key]] = result[dict[key]].replace(/[^-0-9.]/g, '');
		}
		if (atrib.type == 'DATE') {
			let date_string = result[dict[key]];
			let date;
			let pattern = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/;
			if (date_string.search(pattern) === 0) {
				date = date_string.replace(pattern, '$3-$2-$1');
			} else {
				date = new Date(date_string);
			}
			if ((!date) instanceof Date && !isNaN(date.valueOf())) {
				date = '';
				error_message[dict[key]] = 'Некорректная дата';
				is_error_in_kml = true;
			}
			if (date.toString() === 'Invalid Date') {
				date = '';
			}
			result[dict[key]] = date;
		}
		if (atrib.type == 'BOOLEAN') {
			if (['true', 'false'].indexOf(result[dict[key]]) == -1) {
				error_message[dict[key]] = 'Неккоректное значение';
				is_error_in_kml = true;
			}
		}
	}
	if (is_error_in_kml) {
		window.alert({
			title: 'Внимание',
			message: `Ошибка в импортируемом KML.
                 Возможно неккоректное отображение данных`,
		});
	}
	return result;
}

function autonumericID(idName, layer) {
	return new Promise(resolve => {
		requestToDB(
			`SELECT MAX(${idName}) as id FROM ${layer.id}`,
			function (data) {
				let id = 0;
				if (typeof data.rows.item(0).id != 'undefined') id = data.rows.item(0).id + 1;
				resolve(id);
			},
			'Ошибка генерации id'
		);
	});
}

function insert(main_string, ins_string, pos) {
	if (typeof pos == 'undefined') {
		pos = 0;
	}
	if (typeof ins_string == 'undefined') {
		ins_string = '';
	}
	return main_string.slice(0, pos) + ins_string + main_string.slice(pos);
}

function getAtribByName(atribs, atribName) {
	for (const atrib of atribs) {
		if (atrib.name == atribName) {
			return atrib;
		}
	}
}

const permissionToUpdateFeaturesMessage = `Выявлено, что в базе данных и в импортируемом KML-файле имеются объекты с одинаковыми идентификаторами. Если Вы подтвердите обновление, то объекты в базе данных будут заменены на объекты из KML-файла. Иначе, будут оставлены исходные объекты базы данных. Объекты с несовпадающими идентификаторами будут импортированы.Выполнить обновление?`;
