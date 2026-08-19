import path from 'path';

export const TILE_SCHEME = 'sgio-tile';
export const TILE_HOST = 'tiles';

const TILE_RULES = {
	yand_map: [{ extension: 'png', minZoom: 1, maxZoom: 14 }],
	Yandex: [{ extension: 'jpg', minZoom: 1, maxZoom: 10 }],
	RosReestrWms: [{ extension: 'png', minZoom: 1, maxZoom: 11 }],
};

export class TilePathError extends Error {
	constructor(message, status = 400) {
		super(message);
		this.name = 'TilePathError';
		this.status = status;
	}
}

export function resolveTilePath(resourcesPath, requestUrl) {
	let url;

	try {
		url = new URL(requestUrl);
	} catch {
		throw new TilePathError('Некорректный URL тайла');
	}

	if (url.protocol !== `${TILE_SCHEME}:` || url.hostname !== TILE_HOST) {
		throw new TilePathError('Недопустимый адрес тайла');
	}

	let segments;

	try {
		segments = url.pathname
			.split('/')
			.filter(Boolean)
			.map(segment => decodeURIComponent(segment));
	} catch {
		throw new TilePathError('Некорректная кодировка пути тайла');
	}

	if (segments.length !== 4) {
		throw new TilePathError('Некорректная структура пути тайла');
	}

	const [tree, zoomText, xText, fileName] = segments;
	const fileMatch = /^(\d+)\.(png|jpg)$/.exec(fileName);

	if (!/^\d+$/.test(zoomText) || !/^\d+$/.test(xText) || !fileMatch) {
		throw new TilePathError('Координаты тайла должны быть целыми неотрицательными числами');
	}

	const rules = TILE_RULES[tree];

	if (!rules) {
		throw new TilePathError('Дерево тайлов не разрешено', 403);
	}

	const zoom = Number(zoomText);
	const extension = fileMatch[2];
	const matchingRule = rules.find(
		rule => rule.extension === extension && zoom >= rule.minZoom && zoom <= rule.maxZoom
	);

	if (!matchingRule) {
		throw new TilePathError('Формат или уровень тайла не разрешён', 403);
	}

	const tileRoot = path.resolve(resourcesPath, 'tiletrees');
	const filePath = path.resolve(tileRoot, tree, zoomText, xText, fileName);
	const relativePath = path.relative(tileRoot, filePath);

	if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
		throw new TilePathError('Путь тайла выходит за пределы каталога ресурсов', 403);
	}

	return {
		filePath,
		contentType: extension === 'png' ? 'image/png' : 'image/jpeg',
	};
}

export function getEmptyTilePath(resourcesPath) {
	return path.resolve(resourcesPath, 'images', 'empty_tile.png');
}
