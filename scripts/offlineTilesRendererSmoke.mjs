import assert from 'node:assert/strict';
import console from 'node:console';
import process from 'node:process';
import { setTimeout } from 'node:timers/promises';

/* global WebSocket, fetch */

const port = process.argv[2] || '9222';
const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
const rendererTarget = targets.find(
	target => target.type === 'page' && target.url.startsWith('file:')
);

assert.ok(rendererTarget, 'Renderer target не найден');

const socket = new WebSocket(rendererTarget.webSocketDebuggerUrl);
const pendingCommands = new Map();
const requestedUrls = [];
let commandId = 0;

socket.addEventListener('message', event => {
	const message = JSON.parse(event.data);

	if (message.id) {
		const pendingCommand = pendingCommands.get(message.id);
		if (!pendingCommand) return;

		pendingCommands.delete(message.id);
		if (message.error) {
			pendingCommand.reject(new Error(message.error.message));
		} else {
			pendingCommand.resolve(message.result);
		}
		return;
	}

	if (message.method === 'Network.requestWillBeSent') {
		requestedUrls.push(message.params.request.url);
	}
});

await new Promise((resolve, reject) => {
	socket.addEventListener('open', resolve, { once: true });
	socket.addEventListener('error', reject, { once: true });
});

function sendCommand(method, params = {}) {
	const id = ++commandId;

	return new Promise((resolve, reject) => {
		pendingCommands.set(id, { resolve, reject });
		socket.send(JSON.stringify({ id, method, params }));
	});
}

async function evaluate(expression) {
	const result = await sendCommand('Runtime.evaluate', {
		expression,
		returnByValue: true,
		awaitPromise: true,
	});

	if (result.exceptionDetails) {
		const exceptionMessage =
			result.exceptionDetails.exception?.description || result.exceptionDetails.text;
		throw new Error(exceptionMessage);
	}

	return result.result.value;
}

await sendCommand('Network.enable');

const deadline = Date.now() + 45_000;
let state;

while (Date.now() < deadline) {
	state = await evaluate(`(() => {
		const map = window.map;
		const mapElement = document.querySelector('.map-container');
		const rasterLayers = map
			? map.getLayers().getArray().filter(layer => layer.get('sourceType') === 'localXYZ')
			: [];

		return {
			mapReady: Boolean(map),
			mapSize: map?.getSize() || null,
			canvasCount: mapElement?.querySelectorAll('canvas').length || 0,
			bodyText: document.body?.innerText || '',
			rasterLayers: rasterLayers.map(layer => ({
				id: layer.get('id'),
				kind: layer.get('kind'),
				visible: layer.getVisible(),
				urls: layer.getSource().getUrls(),
			})),
		};
	})()`);

	if (
		state.mapReady &&
		state.rasterLayers.length === 3 &&
		state.bodyText.includes('Яндекс.Карта')
	) {
		break;
	}

	await setTimeout(500);
}

assert.equal(state?.mapReady, true, 'Карта не инициализирована');
assert.deepEqual(state.mapSize?.length, 2, 'OpenLayers не сообщил размер карты');
assert.ok(
	state.mapSize.every(size => size > 0),
	'Размер карты должен быть положительным'
);
assert.equal(state.rasterLayers.length, 3, 'Ожидалось три локальных растровых слоя');

const layerById = new Map(state.rasterLayers.map(layer => [layer.id, layer]));
assert.equal(layerById.get('yandex-map-offline')?.visible, true);
assert.equal(layerById.get('yandex-satellite-offline')?.visible, false);
assert.equal(layerById.get('rosreestr-wms-offline')?.visible, false);
assert.ok(
	state.rasterLayers.every(layer =>
		layer.urls.every(url => url.startsWith('sgio-tile://tiles/'))
	),
	'Найден нелокальный URL источника'
);

const tileResponse = await evaluate(`fetch(
	'sgio-tile://tiles/yand_map/9/338/359.png'
).then(async response => ({
	ok: response.ok,
	status: response.status,
	contentType: response.headers.get('content-type'),
	byteLength: (await response.arrayBuffer()).byteLength,
}))`);

assert.equal(tileResponse.ok, true, 'Renderer не смог загрузить существующий локальный тайл');
assert.equal(tileResponse.status, 200);
assert.equal(tileResponse.contentType, 'image/png');
assert.ok(tileResponse.byteLength > 0, 'Локальный тайл оказался пустым');

const localTileRequests = requestedUrls.filter(url => url.startsWith('sgio-tile://'));
const remoteTileRequests = requestedUrls.filter(url =>
	/(tile\.openstreetmap\.org|maps\.yandex\.net)/.test(url)
);

assert.deepEqual(remoteTileRequests, [], 'Renderer выполнил сетевой запрос тайла');

console.log(
	JSON.stringify(
		{
			mapSize: state.mapSize,
			canvasCount: state.canvasCount,
			rasterLayerIds: state.rasterLayers.map(layer => layer.id),
			localTileRequestCount: localTileRequests.length,
			remoteTileRequestCount: remoteTileRequests.length,
			tileResponse,
		},
		null,
		2
	)
);

socket.close();
