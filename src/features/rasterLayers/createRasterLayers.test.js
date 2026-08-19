import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { get as getProjection } from 'ol/proj.js';
import { register } from 'ol/proj/proj4.js';
import proj4 from 'proj4';

import { createTileProtocolHandler } from '../../../electron/tiles/tileProtocolHandler.js';
import { createRasterLayers } from './createRasterLayers.js';

proj4.defs(
	'EPSG:3395',
	'+title=Yandex +proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'
);
register(proj4);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseConfig = {
	id: 'yandex-map-offline',
	descr: 'Яндекс.Карта',
	visible: true,
	order: 1,
	kind: 'base',
	group: 'base-map',
	icon: 'YandexMapLogo.png',
	projection: 'EPSG:3395',
	tileSize: [256, 256],
	tree: 'yand_map',
	urlTemplate: '{z}/{x}/{-y}.png',
	minZoom: 1,
	maxZoom: 14,
	remoteUrl:
		'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
	remoteMinZoom: 1,
	remoteMaxZoom: 19,
};

test('создаёт локальный TMS-источник и инвертирует Y', () => {
	const [layer] = createRasterLayers([baseConfig]);
	const source = layer.getSource();
	const url = source.getTileUrlFunction()([10, 666, 315], 1, getProjection('EPSG:3395'));

	assert.equal(url, 'sgio-tile://tiles/yand_map/10/666/708.png');
	assert.equal(source.getTileGrid().getMinZoom(), 1);
	assert.equal(source.getTileGrid().getMaxZoom(), 14);
	assert.equal(layer.get('useLocalTiles'), true);
	assert.equal(layer.get('sourceType'), 'localXYZ');
	assert.equal(layer.get('kind'), 'base');
	assert.equal(layer.getMinZoom(), 1 - 1e-9);
	assert.equal(layer.getMaxZoom(), 14);
});

test('создаёт сетевой XYZ-источник Яндекса в online-режиме', () => {
	const [layer] = createRasterLayers([baseConfig], { mode: 'online' });
	const url = layer.getSource().getTileUrlFunction()(
		[10, 666, 315],
		1,
		getProjection('EPSG:3395')
	);

	assert.equal(
		url,
		'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x=666&y=315&z=10&scale=1&lang=ru_RU'
	);
	assert.equal(layer.get('sourceType'), 'remoteXYZ');
	assert.equal(layer.get('rasterMode'), 'online');
	assert.equal(layer.get('useLocalTiles'), false);
	assert.equal(layer.getSource().getTileGrid().getMaxZoom(), 19);
});

test('оставляет Y без инверсии для XYZ-источника', () => {
	const [layer] = createRasterLayers([
		{
			...baseConfig,
			id: 'rosreestr-wms-offline',
			projection: 'EPSG:3857',
			tree: 'RosReestrWms',
			urlTemplate: '{z}/{x}/{y}.png',
			maxZoom: 11,
			kind: 'overlay',
			group: 'overlays',
		},
	]);
	const url = layer.getSource().getTileUrlFunction()(
		[10, 666, 315],
		1,
		getProjection('EPSG:3857')
	);

	assert.equal(url, 'sgio-tile://tiles/RosReestrWms/10/666/315.png');
});

test('сортирует слои по order и сохраняет метаданные', () => {
	const layers = createRasterLayers([
		baseConfig,
		{
			...baseConfig,
			id: 'overlay',
			order: 20,
			kind: 'overlay',
			group: 'overlays',
		},
	]);

	assert.deepEqual(
		layers.map(layer => layer.get('id')),
		['overlay', 'yandex-map-offline']
	);
	assert.equal(layers[0].get('kind'), 'overlay');
	assert.equal(layers[0].getZIndex(), 20);
});

test('пропускает некорректный слой и сообщает одну диагностическую ошибку', () => {
	const errors = [];
	const layers = createRasterLayers(
		[
			baseConfig,
			{
				...baseConfig,
				id: 'unsafe',
				tree: '../outside',
			},
		],
		{ onError: message => errors.push(message) }
	);

	assert.equal(layers.length, 1);
	assert.equal(errors.length, 1);
	assert.match(errors[0], /unsafe/);
});

test('создаёт все слои из проектного rasterLayers.json без диагностики', async () => {
	const configPath = path.resolve(__dirname, '../../assets/resources/Project/rasterLayers.json');
	const configs = JSON.parse(await readFile(configPath, 'utf8'));
	const errors = [];
	const layers = createRasterLayers(configs, { onError: message => errors.push(message) });

	assert.equal(layers.length, 3);
	assert.deepEqual(errors, []);
	assert.equal(
		layers.filter(layer => layer.get('kind') === 'base' && layer.getVisible()).length,
		1
	);
	assert.ok(
		layers.every(layer =>
			layer
				.getSource()
				.getUrls()
				.every(url => url.startsWith('sgio-tile://tiles/'))
		)
	);
});

test('в online-режиме создаёт только сетевые слои Яндекса', async () => {
	const configPath = path.resolve(__dirname, '../../assets/resources/Project/rasterLayers.json');
	const configs = JSON.parse(await readFile(configPath, 'utf8'));
	const errors = [];
	const layers = createRasterLayers(configs, {
		mode: 'online',
		onError: message => errors.push(message),
	});

	assert.deepEqual(layers.map(layer => layer.get('id')).sort(), [
		'yandex-map-offline',
		'yandex-satellite-offline',
	]);
	assert.deepEqual(errors, []);
	assert.ok(layers.every(layer => layer.get('sourceType') === 'remoteXYZ'));
	assert.ok(
		layers.every(layer =>
			layer
				.getSource()
				.getUrls()
				.every(url => url.startsWith('https://'))
		)
	);
});

test('отклоняет неизвестный режим растровых слоёв', () => {
	const errors = [];
	const layers = createRasterLayers([baseConfig], {
		mode: 'automatic',
		onError: message => errors.push(message),
	});

	assert.deepEqual(layers, []);
	assert.equal(errors.length, 1);
	assert.match(errors[0], /automatic/);
});

test('проводит запрос от проектной конфигурации через OpenLayers к локальному handler', async () => {
	const resourcesPath = path.resolve(__dirname, '../../assets/resources');
	const configs = JSON.parse(
		await readFile(path.join(resourcesPath, 'Project/rasterLayers.json'), 'utf8')
	);
	const layers = createRasterLayers(configs);
	const handleTileRequest = createTileProtocolHandler(resourcesPath);
	const cases = [
		['yandex-map-offline', 'EPSG:3395', 'image/png'],
		['yandex-satellite-offline', 'EPSG:3395', 'image/jpeg'],
		['rosreestr-wms-offline', 'EPSG:3857', 'image/png'],
	];

	for (const [layerId, projectionCode, contentType] of cases) {
		const layer = layers.find(candidate => candidate.get('id') === layerId);
		const url = layer.getSource().getTileUrlFunction()(
			[10, 666, 315],
			1,
			getProjection(projectionCode)
		);
		const response = await handleTileRequest({ url });

		assert.equal(response.status, 200);
		assert.equal(response.headers.get('Content-Type'), contentType);
		assert.ok((await response.arrayBuffer()).byteLength > 334);
	}
});
