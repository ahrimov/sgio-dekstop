import { ipcMain, net } from 'electron';
import path from 'node:path';

import { getAppDataPath } from './pathHandlers.js';
import { readTileCacheLimit } from '../tiles/tileCacheWriter.js';
import { readRasterConfig } from '../tiles/rasterConfig.js';
import { createOnlineTileLoader } from '../tiles/onlineTileLoader.js';

export async function registerOnlineTileIpc() {
	const projectPath = path.join(getAppDataPath(), 'Project');
	const configs = readRasterConfig(projectPath);
	const loadTile = createOnlineTileLoader({
		resourcesPath: projectPath,
		configs,
		cacheLimitBytes: await readTileCacheLimit(projectPath),
		fetchTile: (url, options) => net.fetch(url, options),
	});
	ipcMain.handle('tiles-load-online', (_event, tree, url) => loadTile(tree, url));
}
