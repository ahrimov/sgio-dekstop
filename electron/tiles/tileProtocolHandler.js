import { readFile } from 'fs/promises';

import { getEmptyTilePath, resolveTilePath, TilePathError } from './tilePathResolver.js';

const IMMUTABLE_CACHE_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Cache-Control': 'public, max-age=31536000, immutable',
};

export function createTileProtocolHandler(
	tileResourcesPath,
	fallbackResourcesPath = tileResourcesPath
) {
	const emptyTilePromise = readFile(getEmptyTilePath(fallbackResourcesPath));

	return async request => {
		let tile;

		try {
			tile = resolveTilePath(tileResourcesPath, request.url);
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
			...IMMUTABLE_CACHE_HEADERS,
			'Content-Type': contentType,
		},
	});
}
