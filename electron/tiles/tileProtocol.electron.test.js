import assert from 'node:assert/strict';

import { app, net, protocol } from 'electron';

import { registerTileProtocol, registerTileSchemePrivileges } from './tileProtocol.js';
import { TILE_SCHEME } from './tilePathResolver.js';

registerTileSchemePrivileges();

app.whenReady().then(async () => {
	try {
		registerTileProtocol();

		const tileResponse = await net.fetch('sgio-tile://tiles/yand_map/10/666/708.png');
		assert.equal(tileResponse.status, 200);
		assert.equal(tileResponse.headers.get('Content-Type'), 'image/png');
		assert.ok((await tileResponse.arrayBuffer()).byteLength > 334);

		const missingTileResponse = await net.fetch('sgio-tile://tiles/yand_map/10/666/999.png');
		assert.equal(missingTileResponse.status, 200);
		assert.equal(missingTileResponse.headers.get('Content-Type'), 'image/png');

		const forbiddenResponse = await net.fetch('sgio-tile://tiles/Yandex/14/9695/4883.png');
		assert.equal(forbiddenResponse.status, 403);

		console.log('Electron tile protocol smoke test passed.');
		protocol.unhandle(TILE_SCHEME);
		app.quit();
	} catch (error) {
		console.error(error);
		app.exit(1);
	}
});
