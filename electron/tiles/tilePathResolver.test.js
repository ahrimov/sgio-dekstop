import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { getEmptyTilePath, resolveTilePath, TilePathError } from './tilePathResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resourcesPath = path.resolve(__dirname, '../../src/assets/resources');

test('разрешает подтверждённые локальные источники', () => {
	assert.deepEqual(resolveTilePath(resourcesPath, 'sgio-tile://tiles/yand_map/10/666/708.png'), {
		filePath: path.join(resourcesPath, 'tiletrees/yand_map/10/666/708.png'),
		contentType: 'image/png',
	});

	assert.equal(
		resolveTilePath(resourcesPath, 'sgio-tile://tiles/Yandex/10/666/708.jpg').contentType,
		'image/jpeg'
	);
	assert.equal(
		resolveTilePath(resourcesPath, 'sgio-tile://tiles/RosReestrWms/10/666/315.png').contentType,
		'image/png'
	);
});

test('запрещает неподтверждённые деревья, форматы и уровни', () => {
	assert.throws(
		() => resolveTilePath(resourcesPath, 'sgio-tile://tiles/zouit/10/666/315.png'),
		error => error instanceof TilePathError && error.status === 403
	);
	assert.throws(
		() => resolveTilePath(resourcesPath, 'sgio-tile://tiles/Yandex/14/9695/4883.png'),
		error => error instanceof TilePathError && error.status === 403
	);
	assert.throws(
		() => resolveTilePath(resourcesPath, 'sgio-tile://tiles/Yandex/8/166/177.png'),
		error => error instanceof TilePathError && error.status === 403
	);
	assert.throws(
		() => resolveTilePath(resourcesPath, 'sgio-tile://tiles/yand_map/10/666/708.jpg'),
		error => error instanceof TilePathError && error.status === 403
	);
});

test('не допускает обход корня ресурсов', () => {
	for (const url of [
		'sgio-tile://tiles/../images/empty_tile.png',
		'sgio-tile://tiles/yand_map/10/666/../../empty_tile.png',
		'sgio-tile://other/yand_map/10/666/708.png',
	]) {
		assert.throws(() => resolveTilePath(resourcesPath, url), TilePathError);
	}
});

test('возвращает путь прозрачного fallback-тайла', () => {
	assert.equal(
		getEmptyTilePath(resourcesPath),
		path.join(resourcesPath, 'images/empty_tile.png')
	);
});
