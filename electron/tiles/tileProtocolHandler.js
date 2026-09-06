import { readFile } from 'fs/promises';

import { getEmptyTilePath, resolveTilePath, TilePathError } from './tilePathResolver.js';

const TILE_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Cache-Control': 'no-store',
};

export function createTileProtocolHandler(
	tileResourcesPath,
	fallbackResourcesPath = tileResourcesPath,
	tileRules
) {
	const emptyTilePromise = readFile(getEmptyTilePath(fallbackResourcesPath));

	return async request => {
		let tile;

		try {
			tile = resolveTilePath(tileResourcesPath, request.url, tileRules);
		} catch (error) {
			const status = error instanceof TilePathError ? error.status : 400;
			return new Response(error.message, {
				status,
				headers: { 'Content-Type': 'text/plain; charset=utf-8' },
			});
		}

		try {
			const data = await readFile(tile.filePath);
			return createImageResponse(data, tile.contentType);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				console.error('Не удалось прочитать локальный тайл:', tile.filePath, error);
			}

			try {
				return createImageResponse(await emptyTilePromise, 'image/png');
			} catch (fallbackError) {
				console.error('Не удалось прочитать fallback-тайл:', fallbackError);
				return new Response(null, { status: 404 });
			}
		}
	};
}

function createImageResponse(data, contentType) {
	return new Response(data, {
		status: 200,
		headers: {
			...TILE_HEADERS,
			'Content-Type': contentType,
		},
	});
}
