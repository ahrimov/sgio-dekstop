import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createTileProtocolHandler } from './tileProtocolHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resourcesPath = path.resolve(__dirname, '../../src/assets/resources');
const handleTileRequest = createTileProtocolHandler(resourcesPath);

test('возвращает существующий тайл с MIME и cache headers', async () => {
	const response = await handleTileRequest({
		url: 'sgio-tile://tiles/yand_map/10/666/708.png',
	});

	assert.equal(response.status, 200);
	assert.equal(response.headers.get('Content-Type'), 'image/png');
	assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
	assert.match(response.headers.get('Cache-Control'), /immutable/);

	const expected = await readFile(path.join(resourcesPath, 'tiletrees/yand_map/10/666/708.png'));
	assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected);
});

test('возвращает прозрачный fallback для отсутствующего разрешённого тайла', async () => {
	const response = await handleTileRequest({
		url: 'sgio-tile://tiles/yand_map/10/666/999.png',
	});

	assert.equal(response.status, 200);
	assert.equal(response.headers.get('Content-Type'), 'image/png');

	const expected = await readFile(path.join(resourcesPath, 'images/empty_tile.png'));
	assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected);
});

test('не выдаёт файл по запрещённому пути', async () => {
	const response = await handleTileRequest({
		url: 'sgio-tile://tiles/yand_map/10/666/../../empty_tile.png',
	});

	assert.equal(response.status, 400);
	assert.match(response.headers.get('Content-Type'), /^text\/plain/);
});
