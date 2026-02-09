import { root_directory } from './initial.js';
import { openFile } from './FileManage.js';
import { setDBProgressCallbacks, setTotalLayersCount, initialDB, updateTotalLayersCount } from './DBManage.js';
import { convertColorToHEX, getZoomFromMeters } from './converter.js';
import { map, layers } from './globals.js';
import { LayerAtribs } from './Map.js';
import { minZIndexForVectorLayers } from './consts.js';

import View from 'ol/View.js';
import { fromLonLat } from 'ol/proj.js';
import VectorLayer from 'ol/layer/Vector.js';
import Style from 'ol/style/Style.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Circle from 'ol/style/Circle.js';
import Text from 'ol/style/Text.js';
import RegularShape from 'ol/style/RegularShape.js';
import XYZ from 'ol/source/XYZ.js';
import TileLayer from 'ol/layer/Tile.js';
import { createXYZ } from 'ol/tilegrid.js';
import { setNumberOfLayers } from '../shared/numberOfLayers.js';
import { generateColor } from '../shared/utils/colorGenerator.js';
import { addExistingKMLLayers } from '../features/KMLLayer/addExistingLayer.js';

let progressCallbacks = {};

export let currentMapView = null;
export let baseRasterLayers = [];

export function setProgressCallbacks(callbacks) {
	progressCallbacks = callbacks;
}

export function configParser(data) {
	const parser = new DOMParser();
	const dom = parser.parseFromString(data, 'application/xml');

	const appName = dom.getElementsByTagName('AppName').item(0).textContent;
	document.getElementById('app-name').textContent = appName;

	const pathToLayers = dom.getElementsByTagName('PathToLayers').item(0).textContent;
	const layersName = dom
		.getElementsByTagName('LayersName')
		.item(0)
		.textContent.split('|')
		.filter(el => Boolean(el));

	if (progressCallbacks.onProgress) {
		setDBProgressCallbacks(progressCallbacks.onProgress);
	}
	setTotalLayersCount(layersName.length);
	setNumberOfLayers(layersName.length);

	if (progressCallbacks.onStart) {
		progressCallbacks.onStart(layersName.length, 'Загрузка векторных слоев');
	}

	let loadedLayersCount = 0;

	const updateLayerProgress = (fileName = '') => {
		loadedLayersCount++;
		if (progressCallbacks.onProgress) {
			progressCallbacks.onProgress(loadedLayersCount, fileName);
		}

		if (loadedLayersCount === layersName.length && progressCallbacks.onFinish) {
			setTimeout(progressCallbacks.onFinish, 500);
		}
	};

	const nameDB = dom.getElementsByTagName('NameDB').item(0).textContent;
	const filenameDB = dom.getElementsByTagName('FilenameDB').item(0).textContent;
	const pathToDB = dom.getElementsByTagName('PathToDB').item(0).textContent;
	initialDB(root_directory + pathToDB, filenameDB, nameDB);

	const centerLong = parseFloat(dom.getElementsByTagName('longitude').item(0).textContent);
	const centerLat = parseFloat(dom.getElementsByTagName('latitude').item(0).textContent);
	const minZoom = parseInt(dom.getElementsByTagName('MinZoom').item(0).textContent);
	const maxZoom = parseInt(dom.getElementsByTagName('MaxZoom').item(0).textContent);
	const zoom = parseInt(dom.getElementsByTagName('zoom').item(0).textContent);

	currentMapView = new View({
		center: fromLonLat([centerLong, centerLat]),
		zoom: zoom,
		minZoom: minZoom,
		maxZoom: maxZoom,
		projection: 'EPSG:3857',
	});

	const pathToBaseRasterLayers = dom
		.getElementsByTagName('PathToBaseRasterLayers')
		?.item(0)?.textContent;
	if (typeof pathToBaseRasterLayers !== 'undefined') {
		openFile(
			root_directory + pathToBaseRasterLayers,
			function (text) {
				try {
					const jsonArray = JSON.parse(text);
					baseRasterLayers = parseBaseRasterLayers(jsonArray);
				} catch (e) {
					if (window.showAlert) {
						window.showAlert(
							'Внимание',
							`Некорректный json-файл: ${pathToBaseRasterLayers}`
						);
					} else {
						console.error('Некорректный json-файл:', pathToBaseRasterLayers, e);
					}
				}
			},
			true
		);
	}

	window.pathToImageStorage = dom.getElementsByTagName('PathToImageStorage').item(0).textContent;
	window.pathToKMLStorage = dom.getElementsByTagName('PathToKMLStorage').item(0).textContent;
	if (typeof dom.getElementsByTagName('NumberNodesOnMap').item(0).textContent != 'undefined') {
		window.numberNodesOnMap = dom.getElementsByTagName('NumberNodesOnMap').item(0).textContent;
	}

	async function processLayersSerially() {
		for (const layerName of layersName) {
			await new Promise(resolve => {
				openFile(root_directory + pathToLayers + layerName, data => {
					layerParser(data, layerName).then(resolve);
					updateLayerProgress(layerName);
				});
			});
		}
		addExistingKMLLayers(updateTotalLayersCount, updateLayerProgress);
	}
	processLayersSerially();

	async function layerParser(data, title) {
		const parser = new DOMParser();
		const dom = parser.parseFromString(data, 'application/xml');
		if (dom.getElementsByTagName('parsererror').item(0)) {
			const errorMessage = dom.querySelector('parsererror div').textContent;
			console.log(errorMessage);
			alert('Некорректный xml-файл: ' + title + '. Ошибка: ' + errorMessage);
			return;
		}

		const geometryType = dom.getElementsByTagName('geometry').item(0).textContent;
		let styles = {};
		switch (geometryType) {
			case 'MULTIPOINT':
				try {
					styles = await pointStyleParse(dom);
				} catch (e) {
					styles = {
						default: new Style({
							image: new Circle({
								fill: new Fill({ color: generateColor() }),
								radius: 3,
							}),
							text: new Text({
								fill: new Fill({ color: '#000000' }),
							}),
						}),
					};
				}
				break;
			case 'MULTIPOLYGON':
				try {
					styles = polygonStyleParse(dom);
				} catch (e) {
					styles = {
						default: new Style({
							fill: new Fill({
								color: generateColor(),
							}),
							stroke: new Stroke({
								color: 'rgb(0,0,0)',
								width: 1,
							}),
							text: new Text({
								fill: new Fill({ color: '#000000' }),
							}),
						}),
					};
				}
				break;
			case 'MULTILINESTRING':
				try {
					styles = lineStyleParse(dom);
				} catch (e) {
					styles = {
						default: new Style({
							stroke: new Stroke({
								color: generateColor(),
								width: 2,
							}),
							text: new Text({
								fill: new Fill({ color: '#000000' }),
							}),
						}),
					};
				}
				break;
			default:
				styles = {
					default: new Style({
						image: new Circle({
							fill: new Fill({ color: generateColor() }),
							radius: 3,
						}),
						text: new Text({
							fill: new Fill({ color: '#000000' }),
						}),
					}),
				};
		}

		if (styles['UNKNOWN']) styles['default'] = styles['UNKNOWN'];

		const layer = new VectorLayer({
			renderMode: 'image',
			declutter: true,
		});

		layer.setStyle(function (feature) {
			let featureStyle;
			const type = feature.type || 'default';
			if (type !== 'UNKNOWN' && styles[type] !== void 0 && styles[type]) {
				featureStyle = styles[type];
			} else {
				if (styles['default'] === void 0) featureStyle = styles['default_old'];
				else featureStyle = styles['default'];
			}
			const mapZoom = map.getView().getZoom();
			if (
				!map.localMap &&
				((!map.draw && !map.modify) ||
					(map.draw?.currentFeature !== feature && map.modify?.modifyFeature !== feature))
			) {
				let zoomMin = getZoomFromMeters(featureStyle.zoomMin, map);
				if (isNaN(zoomMin)) zoomMin = 0;
				let zoomMax = getZoomFromMeters(featureStyle.zoomMax, map);
				if (isNaN(zoomMax)) zoomMax = Infinity;
				if (mapZoom < zoomMin || mapZoom > zoomMax) {
					return new Style({});
				}
			}
			featureStyle = featureStyle.clone();
			const geometryType = feature.getGeometry().getType();
			if (
				feature.label &&
				!(
					(geometryType === 'MultiLineString' || geometryType === 'LineString') &&
					mapZoom >= 19
				)
			) {
				const featureLabelStyle = featureStyle.getText();
				featureLabelStyle.setText(feature.label);
				featureStyle.setText(featureLabelStyle);
			}
			return featureStyle;
		});

		layer.set('id', dom.getElementsByTagName('id').item(0).textContent);
		layer.set('descr', dom.getElementsByTagName('label').item(0).textContent);
		layer.id = dom.getElementsByTagName('id').item(0).textContent;
		layer.label = dom.getElementsByTagName('label').item(0).textContent;
		layer.geometryType = geometryType;

		let layerZoomMin = parseFloat(dom.getElementsByTagName('zoomMax').item(0)?.textContent);
		let layerZoomMax = parseFloat(dom.getElementsByTagName('zoomMin').item(0)?.textContent);
		layerZoomMin = getZoomFromMeters(layerZoomMin, map);
		layerZoomMax = getZoomFromMeters(layerZoomMax, map);
		if (isNaN(layerZoomMin)) layerZoomMin = 0;
		if (isNaN(layerZoomMax)) layerZoomMax = Infinity;
		layer.setMinZoom(layerZoomMin);
		layer.setMaxZoom(layerZoomMax);

		layer.atribs = [];
		const atribs = dom.getElementsByTagName('attribute');
		for (const atrib of atribs) {
			let atribName = atrib.getElementsByTagName('id').item(0).textContent;
			let label = atrib.getElementsByTagName('label').item(0).textContent;
			const tagVisible = atrib.getElementsByTagName('visible').item(0);
			const visible = tagVisible ? tagVisible.textContent === 'true' : true;
			let type = atrib.getAttribute('type');
			if (type == 'ENUM') {
				let options = parseEnum(atrib.getElementsByTagName('options').item(0).textContent);
				layer.atribs.push(new LayerAtribs(atribName, label, type, visible, options));
			} else layer.atribs.push(new LayerAtribs(atribName, label, type, visible));
		}

		const styleTypeColumn =
			dom.getElementsByTagName('StyleTypeColumn').item(0)?.textContent || 'type_cl';
		const labelColumn = dom.getElementsByTagName('LabelColumn').item(0)?.textContent || 'none';
		layer.styleTypeColumn = styleTypeColumn;
		layer.labelColumn = labelColumn;

		layer.minZoom = parseFloat(dom.getElementsByTagName('zoomMax').item(0)?.textContent);
		layer.maxZoom = parseFloat(dom.getElementsByTagName('zoomMin').item(0)?.textContent);

		let enabled = true;
		if (typeof dom.getElementsByTagName('layerDb').item(0) != 'undefined') {
			let enabled_string = dom
				.getElementsByTagName('layerDb')
				.item(0)
				.getAttribute('enabled');
			if (enabled_string === 'false') {
				enabled = false;
			}
		}
		layer.enabled = enabled;

		for (let i in layersName) {
			if (layersName[i] === title) {
				layer.setZIndex(minZIndexForVectorLayers + layersName.length - i);
			}
		}

		layers.push(layer);
		layer.visible = true;
	}
}

export async function pointStyleParse(dom) {
	const styles = {};

	const geometryStyle = dom.getElementsByTagName('geometryStyle').item(0);
	if (geometryStyle) {
		styles['default_old'] = parsePointStyleOld(geometryStyle);
	}

	const domStylesContainer = dom.getElementsByTagName('styles').item(0);
	if (!domStylesContainer) return styles;

	const domStyles = domStylesContainer.getElementsByTagName('Style');

	for (let i = 0; i < domStyles.length; i++) {
		const domStyle = domStyles.item(i);
		const value = domStyle.getElementsByTagName('value').item(0)?.textContent || 'default';
		styles[value] = await parsePointDekstopStyle(domStyle);
	}

	return styles;

	async function parsePointDekstopStyle(domStyle) {
		const style = new Style({});

		style.zoomMin = parseFloat(domStyle.getElementsByTagName('zoomMax').item(0)?.textContent);
		style.zoomMax = parseFloat(domStyle.getElementsByTagName('zoomMin').item(0)?.textContent);

		const iconStyle = domStyle.getElementsByTagName('IconStyle').item(0);
		if (iconStyle) {
			const imageSize = iconStyle.getElementsByTagName('size').item(0)?.textContent || 16;
			let href = iconStyle.getElementsByTagName('href').item(0)?.textContent;
			if (!href) {
				const color = convertColorToHEX(
					iconStyle.getElementsByTagName('color').item(0)?.textContent || generateColor()
				);
				const form =
					iconStyle.getElementsByTagName('form').item(0)?.textContent || 'circle';
				const fill = new Fill({ color: color });
				const outline = parseInt(
					iconStyle.getElementsByTagName('outline').item(0)?.textContent
				);
				let stroke;
				if (outline) {
					const lineStyle = domStyle.getElementsByTagName('LineStyle').item(0);
					if (lineStyle) {
						const lineColor = convertColorToHEX(
							lineStyle.getElementsByTagName('color').item(0)?.textContent ||
							'#000000'
						);
						const width =
							parseInt(
								lineStyle.getElementsByTagName('width').item(0)?.textContent
							) || 1;
						stroke = new Stroke({
							color: lineColor,
							width: width,
						});
					}
				}
				const image = createImageStyleByForm(form, fill, imageSize, stroke);
				style.setImage(image);
			} else {
				// let imageSize = iconStyle.getElementsByTagName('size').item(0)?.textContent || 16;
				// href = href.replace('Public', '');
				// const icon = await new Promise((resolve, reject) => {
				// 	window.resolveLocalFileSystemURL(
				// 		cordova.file.applicationDirectory + 'www/resources/images/' + href,
				// 		fileEntry => {
				// 			const img = new Image();
				// 			img.onload = function () {
				// 				const scaleX = imageSize / this.width;
				// 				const scaleY = imageSize / this.height;
				// 				const scale = scaleX < scaleY ? scaleX : scaleY;
				// 				resolve(
				// 					new Icon({
				// 						src: fileEntry.toInternalURL(),
				// 						scale: scale,
				// 					})
				// 				);
				// 			};
				// 			img.src = fileEntry.toInternalURL();
				// 		},
				// 		e => {
				// 			console.log('Error while opening: ', href);
				// 			resolve(null);
				// 		}
				// 	);
				// });
				// if (!icon) return null;
				// style.setImage(icon);
			}
		} else {
			const defaultImage = new Circle({
				fill: new Fill({ color: generateColor() }),
				radius: 3,
			});
			style.setImage(defaultImage);
		}

		const labelStyle = labelStyleParse(domStyle);
		style.setText(labelStyle);

		return style;
	}

	function parsePointStyleOld(dom) {
		const fill = new Fill({
			color: dom
				.getElementsByTagName('Fill')
				.item(0)
				.getElementsByTagName('CssParameter')
				.item(0).textContent,
		});
		const xmlStroke = dom.getElementsByTagName('Stroke').item(0);
		const stroke = new Stroke({
			color: xmlStroke.getElementsByTagName('CssParameter').item(0).textContent,
			width: parseInt(xmlStroke.getElementsByTagName('CssParameter').item(1).textContent),
		});
		const size = parseInt(dom.getElementsByTagName('Size').item(0).textContent);
		const rotation = parseInt(dom.getElementsByTagName('Rotation').item(0).textContent);
		const style = new Style({});
		const form = dom.getElementsByTagName('WellKnownName').item(0).textContent;
		const image = createImageStyleByForm(form, fill, size, stroke, rotation);
		style.setImage(image);
		const labelStyle = labelStyleParse(dom);
		style.setText(labelStyle);
		return style;
	}
}

export function createImageStyleByForm(form, fill, size, stroke = new Stroke({}), rotation = 0) {
	switch (form) {
		case 'square':
			return new RegularShape({
				fill: fill,
				stroke: stroke,
				points: 4,
				radius: size,
				rotation: rotation,
				angle: Math.PI / 4,
			});
		case 'triangle':
			return new RegularShape({
				fill: fill,
				stroke: stroke,
				points: 3,
				radius: size,
				rotation: rotation,
				angle: 0,
			});
		default:
			return new Circle({
				fill: fill,
				stroke: stroke,
				radius: size,
				rotation: rotation,
			});
	}
}

export function polygonStyleParse(dom) {
	const styles = {};

	const geometryStyle = dom.getElementsByTagName('geometryStyle').item(0);
	if (geometryStyle) {
		styles['default_old'] = parseLPolygonStyleOld(geometryStyle);
	}

	const domStylesContainer = dom.getElementsByTagName('styles').item(0);
	if (!domStylesContainer) return styles;

	const domStyles = domStylesContainer.getElementsByTagName('Style');

	for (let i = 0; i < domStyles.length; i++) {
		const domStyle = domStyles.item(i);
		const value = domStyle.getElementsByTagName('value').item(0)?.textContent || 'default';
		styles[value] = parsePolygonDekstopStyle(domStyle);
	}

	return styles;

	function parsePolygonDekstopStyle(domStyle) {
		const style = new Style({});

		style.zoomMin = parseFloat(domStyle.getElementsByTagName('zoomMax').item(0)?.textContent);
		style.zoomMax = parseFloat(domStyle.getElementsByTagName('zoomMin').item(0)?.textContent);

		const polyStyle = domStyle.getElementsByTagName('PolyStyle').item(0);
		const color = polyStyle.getElementsByTagName('color').item(0)?.textContent || '#000000';
		const fill = polyStyle.getElementsByTagName('fill').item(0)?.textContent || '0';
		const outline = polyStyle.getElementsByTagName('outline').item(0)?.textContent || '0';

		if (parseInt(outline)) {
			const lineStyle = domStyle.getElementsByTagName('LineStyle').item(0);
			if (lineStyle) {
				const lineColor =
					lineStyle.getElementsByTagName('color').item(0)?.textContent || '#000000';
				const width = lineStyle.getElementsByTagName('width').item(0)?.textContent || 1;
				style.setStroke(
					new Stroke({
						color: convertColorToHEX(lineColor),
						width: width,
					})
				);
			}
		}

		if (parseInt(fill)) {
			style.setFill(new Fill({ color: convertColorToHEX(color) }));
		}

		const labelStyle = labelStyleParse(domStyle);
		style.setText(labelStyle);

		return style;
	}

	function parseLPolygonStyleOld(dom) {
		const style = new Style({
			fill: new Fill({
				color: dom.getElementsByTagName('CssParameter').item(0).textContent,
			}),
			stroke: new Stroke({
				color: dom.getElementsByTagName('CssParameter').item(1).textContent,
				width: parseInt(dom.getElementsByTagName('CssParameter').item(2).textContent),
			}),
		});

		const labelStyle = labelStyleParse(dom);
		style.setText(labelStyle);

		return style;
	}
}

export function lineStyleParse(dom) {
	const styles = {};

	const geometryStyle = dom.getElementsByTagName('geometryStyle').item(0);
	if (geometryStyle) {
		styles['default_old'] = parseLineStyleOld(geometryStyle);
	}

	const domStylesContainer = dom.getElementsByTagName('styles').item(0);
	if (!domStylesContainer) return styles;

	const domStyles = domStylesContainer.getElementsByTagName('Style');

	for (let i = 0; i < domStyles.length; i++) {
		const domStyle = domStyles.item(i);
		const value = domStyle.getElementsByTagName('value').item(0)?.textContent || 'default';
		styles[value] = parseLineDekstopStyle(domStyle);
	}

	return styles;

	function parseLineDekstopStyle(domStyle) {
		const style = new Style({});

		style.zoomMin = parseFloat(domStyle.getElementsByTagName('zoomMax').item(0)?.textContent);
		style.zoomMax = parseFloat(domStyle.getElementsByTagName('zoomMin').item(0)?.textContent);

		const lineStyle = domStyle.getElementsByTagName('LineStyle').item(0);
		const color = lineStyle.getElementsByTagName('color').item(0).textContent;
		const width = lineStyle.getElementsByTagName('width').item(0).textContent;

		style.setStroke(
			new Stroke({
				color: convertColorToHEX(color),
				width: width,
			})
		);

		const labelStyle = labelStyleParse(domStyle, 'line');
		style.setText(labelStyle);

		return style;
	}

	function parseLineStyleOld(dom) {
		const style = new Style({
			stroke: new Stroke({
				color: dom.getElementsByTagName('CssParameter').item(0).textContent,
				width: parseInt(dom.getElementsByTagName('CssParameter').item(1).textContent),
			}),
		});

		const labelStyle = labelStyleParse(dom, 'line');
		style.setText(labelStyle);

		return style;
	}
}

export function parseZoomLevel(dom) {
	let zoomMax = parseFloat(dom.getElementsByTagName('zoomMin').item(0)?.textContent);
	zoomMax = getZoomFromMeters(zoomMax, map);
	if (isNaN(zoomMax)) zoomMax = Infinity;
	let zoomMin = parseFloat(dom.getElementsByTagName('zoomMax').item(0)?.textContent);
	zoomMin = getZoomFromMeters(zoomMin, map);
	if (isNaN(zoomMin)) zoomMin = 0;
	return [zoomMin, zoomMax];
}

function labelStyleParse(dom, placement = 'point') {
	const defaultStyle = new Text({
		fill: new Fill({ color: '#000000' }),
		offsetY: placement === 'line' ? -3 : -12,
		stroke: new Stroke({
			color: '#ffffff',
			width: 3,
		}),
		placement: placement,
		overflow: true,
		maxAngle: 360,
	});
	const labelStyleDom = dom.getElementsByTagName('LabelStyle')?.item(0);
	if (!labelStyleDom) return defaultStyle;
	const color = labelStyleDom.getElementsByTagName('color')?.item(0)?.textContent || '#000000';
	const fontSize = labelStyleDom.getElementsByTagName('fontSize')?.item(0)?.textContent || '10';
	const bold = labelStyleDom.getElementsByTagName('bold')?.item(0)?.textContent === '1';
	const italic = labelStyleDom.getElementsByTagName('italic')?.item(0)?.textContent === '1';
	const fontFamily = 'sans-serif';
	const strokeWidth = 3;
	const strokeColor = '#ffffff';
	const repeat = 600;

	const font = (bold ? 'bold ' : '') + (italic ? 'italic ' : '') + fontSize + 'px ' + fontFamily;
	const labelStyle = new Text({
		fill: new Fill({ color: convertColorToHEX(color) }),
		font: font,
		offsetY: -12,
		stroke: new Stroke({
			color: strokeColor,
			width: strokeWidth,
		}),
		placement: placement,
		repeat: repeat,
		overflow: true,
	});

	labelStyle.zoomMin = parseFloat(
		labelStyleDom.getElementsByTagName('zoomMax').item(0)?.textContent
	);
	labelStyle.zoomMax = parseFloat(
		labelStyleDom.getElementsByTagName('zoomMin').item(0)?.textContent
	);

	return labelStyle;
}

function parseEnum(options_string) {
	let options_array = options_string.split('|');
	let options = {};
	for (let option_string of options_array) {
		if (option_string === '') continue;
		let key, value;
		if (option_string.search(/[^#]#[^#]/) != -1) {
			let found = option_string.split('#');
			key = found[0];
			value = found[1];
		} else {
			key = option_string;
			value = option_string;
		}
		options[key] = value;
	}
	return options;
}

function parseBaseRasterLayers(jsonArray) {
	return jsonArray
		.sort((a, b) => b.order - a.order)
		.map((json, id) => {
			let source;

			if (json.projection === 'EPSG:3857') {
				source = new XYZ({
					projection: json.projection,
					url: json.useLocalTiles ? main_directory + json.local_path : json.remote_url,
					tileGrid: createXYZ({
						extent: [
							-20037508.342789244, -20037508.342789244, 20037508.342789244,
							20037508.342789244,
						],
						maxZoom: 19,
					}),
					tileSize: json.tileSize || 256,
					cacheSize: 40,
					crossOrigin: 'anonymous',
				});
			} else if (json.projection === 'EPSG:3395') {
				source = new XYZ({
					projection: json.projection,
					url: json.useLocalTiles ? main_directory + json.local_path : json.remote_url,
					tileGrid: createXYZ({
						extent: [
							-20037508.342789244, -20037508.342789244, 20037508.342789244,
							20037508.342789244,
						],
					}),
					tileSize: json.tileSize,
					cacheSize: 40,
				});
			} else {
				source = new XYZ({
					projection: json.projection,
					url: json.useLocalTiles ? main_directory + json.local_path : json.remote_url,
					tileSize: json.tileSize,
					cacheSize: 40,
				});
			}
			if (json.useLocalTiles) {
				source.setTileLoadFunction(tileLoadFunctionLocal);
			}
			if (json.id === 'Rosreestr') {
				rosreestr_url = json.remote_url;
				source.setTileUrlFunction(rosreetrUrlFunction);
			}
			return new TileLayer({
				id: json.id,
				descr: json.descr,
				visible: json.visible,
				zIndex: parseInt(json.order) || id,
				icon: json.icon,
				maxZoom: 24,
				useLocalTiles: json.useLocalTiles,
				local_path: json.local_path,
				remote_url: json.remote_url,
				source: source,
			});
		});
}
