import { protocol } from 'electron';

import { getResourcesPath } from '../ipc/pathHandlers.js';
import { TILE_SCHEME } from './tilePathResolver.js';
import { createTileProtocolHandler } from './tileProtocolHandler.js';

export function registerTileSchemePrivileges() {
	protocol.registerSchemesAsPrivileged([
		{
			scheme: TILE_SCHEME,
			privileges: {
				standard: true,
				secure: true,
				supportFetchAPI: true,
				corsEnabled: true,
			},
		},
	]);
}

export function registerTileProtocol() {
	const resourcesPath = getResourcesPath();
	protocol.handle(TILE_SCHEME, createTileProtocolHandler(resourcesPath));
}
