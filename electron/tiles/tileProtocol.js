import { protocol } from 'electron';
import path from 'path';

import { getAppDataPath, getResourcesPath } from '../ipc/pathHandlers.js';
import { readRasterConfig } from './rasterConfig.js';
import { TILE_SCHEME, createTileRules } from './tilePathResolver.js';
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

export function registerTileProtocol(
	tileResourcesPath = path.join(getAppDataPath(), 'Project'),
	fallbackResourcesPath = getResourcesPath()
) {
	protocol.handle(
		TILE_SCHEME,
		createTileProtocolHandler(
			tileResourcesPath,
			fallbackResourcesPath,
			createTileRules(readRasterConfig(tileResourcesPath))
		)
	);
}
