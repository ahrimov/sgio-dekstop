import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { createTileCacheWriter } from './tileCacheWriter.js';
import { resolveTilePath, createTileRules } from './tilePathResolver.js';

export function createOnlineTileLoader({ resourcesPath, configs, fetchTile, cacheLimitBytes }) {
	const pending = new Map();
	const saveTile = createTileCacheWriter(path.join(resourcesPath, 'tiletrees'), cacheLimitBytes);
	const tileRules = createTileRules(configs);
	return async (tree, requestUrl) => {
		const config = configs.find(item => item?.tree === tree && item.remoteUrl);
		if (!config) throw new Error('Онлайн-источник тайлов не разрешён');
		const url = new URL(requestUrl);
		if (url.protocol !== 'https:') throw new Error('Источник должен использовать HTTPS');
		const coordinates = matchTileCoordinates(config.remoteUrl, url.href);
		const { z, x, y } = coordinates;
		if (
			z < config.remoteMinZoom ||
			z > config.remoteMaxZoom ||
			![z, x, y].every(Number.isSafeInteger) ||
			x >= 2 ** z ||
			y >= 2 ** z
		)
			throw new Error('Координаты тайла выходят за пределы уровня');
		const expectedUrl = config.remoteUrl.replace(/\{([zxy])\}/g, (_, key) => coordinates[key]);
		if (url.href !== new URL(expectedUrl).href) throw new Error('Адрес источника не разрешён');
		const localPath = config.urlTemplate
			.replace('{z}', z)
			.replace('{x}', x)
			.replace('{-y}', 2 ** z - 1 - y)
			.replace('{y}', y);
		const tile = resolveTilePath(
			resourcesPath,
			`sgio-tile://tiles/${tree}/${localPath}`,
			tileRules
		);
		if (!pending.has(tile.filePath)) {
			pending.set(
				tile.filePath,
				loadTile(tile, expectedUrl).finally(() => pending.delete(tile.filePath))
			);
		}
		return pending.get(tile.filePath);
	};

	async function loadTile(tile, url) {
		let data;
		try {
			const response = await fetchTile(url, { signal: AbortSignal.timeout(15000) });
			if (!response.ok) throw new Error(`Ошибка загрузки тайла: HTTP ${response.status}`);
			data = Buffer.from(await response.arrayBuffer());
			const valid =
				tile.contentType === 'image/png'
					? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
					: data.length > 3 && data[0] === 255 && data[1] === 216 && data[2] === 255;
			if (!valid) throw new Error('Источник вернул неверный формат изображения');
		} catch (error) {
			try {
				return {
					data: await readFile(tile.filePath),
					contentType: tile.contentType,
					origin: 'device',
					networkError: error.message,
				};
			} catch {
				throw error;
			}
		}
		let cacheLimit = null;
		try {
			cacheLimit = await saveTile(tile.filePath, data);
		} catch (error) {
			console.error('Не удалось сохранить онлайн-тайл:', tile.filePath, error);
		}
		return { data, contentType: tile.contentType, origin: 'network', cacheLimit };
	}
}

function matchTileCoordinates(template, requestUrl) {
	const keys = [];
	const pattern = template
		.split(/(\{[zxy]\})/g)
		.map(part => {
			if (/^\{[zxy]\}$/.test(part)) {
				keys.push(part[1]);
				return '(\\d+)';
			}
			return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		})
		.join('');
	const match = new RegExp(`^${pattern}$`).exec(requestUrl);
	if (!match || !['z', 'x', 'y'].every(key => keys.includes(key))) {
		throw new Error('Адрес источника не разрешён');
	}
	const coordinates = {};
	keys.forEach((key, index) => {
		const value = Number(match[index + 1]);
		if (coordinates[key] !== undefined && coordinates[key] !== value) {
			throw new Error('Координаты тайла не согласованы');
		}
		coordinates[key] = value;
	});
	return coordinates;
}
