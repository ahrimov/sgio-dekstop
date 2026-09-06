import TileLayer from 'ol/layer/Tile.js';
import { get as getProjection } from 'ol/proj.js';
import XYZ from 'ol/source/XYZ.js';
import TileState from 'ol/TileState.js';
import { warnTileCacheLimit } from './tileCacheWarning.js';

const LOCAL_TILE_ORIGIN = 'sgio-tile://tiles';
const SUPPORTED_PROJECTIONS = new Set(['EPSG:3857', 'EPSG:3395']);
const SUPPORTED_KINDS = new Set(['base', 'overlay']);
const SUPPORTED_MODES = new Set(['offline', 'online']);
const LOCAL_URL_TEMPLATE_PATTERN = /^\{z\}\/\{x\}\/\{(?:-?y)\}\.(?:png|jpg)$/;
const MIN_ZOOM_TOLERANCE = 1e-9;

export function createRasterLayers(configs, options = {}) {
	const onError = options.onError || defaultErrorHandler;
	const mode = options.mode || 'offline';

	if (!SUPPORTED_MODES.has(mode)) {
		onError(`Режим растровых слоёв «${mode}» не поддерживается`);
		return [];
	}

	if (!Array.isArray(configs)) {
		onError('Конфигурация растровых слоёв должна быть массивом');
		return [];
	}

	return [...configs]
		.sort((left, right) => right.order - left.order)
		.flatMap((config, index) => {
			try {
				const layerMode = config.remoteUrl ? mode : 'offline';
				validateRasterLayerConfig(config, layerMode);
				return [createRasterLayer(config, index, layerMode)];
			} catch (error) {
				onError(`Растровый слой «${config?.id || 'без id'}» пропущен: ${error.message}`);
				return [];
			}
		});
}

export function validateRasterLayerConfig(config, mode = 'offline') {
	if (!config || typeof config !== 'object' || Array.isArray(config)) {
		throw new Error('описание слоя должно быть объектом');
	}

	assertNonEmptyString(config.id, 'id');
	assertNonEmptyString(config.descr, 'descr');
	assertNonEmptyString(config.icon, 'icon');
	assertNonEmptyString(config.group, 'group');

	if (typeof config.visible !== 'boolean') {
		throw new Error('visible должен быть boolean');
	}

	if (!Number.isFinite(config.order)) {
		throw new Error('order должен быть числом');
	}

	if (!SUPPORTED_KINDS.has(config.kind)) {
		throw new Error('kind должен быть base или overlay');
	}

	if (!SUPPORTED_PROJECTIONS.has(config.projection)) {
		throw new Error(`проекция ${config.projection} не поддерживается`);
	}

	if (
		!Array.isArray(config.tileSize) ||
		config.tileSize.length !== 2 ||
		config.tileSize.some(size => !Number.isInteger(size) || size <= 0)
	) {
		throw new Error('tileSize должен содержать два положительных целых числа');
	}

	if (mode === 'offline') {
		if (!/^[A-Za-z0-9_-]+$/.test(config.tree || '')) {
			throw new Error('tree содержит недопустимые символы');
		}

		if (!LOCAL_URL_TEMPLATE_PATTERN.test(config.urlTemplate || '')) {
			throw new Error('urlTemplate должен иметь вид {z}/{x}/{y}.png или {z}/{x}/{-y}.png');
		}

		validateZoomRange(config.minZoom, config.maxZoom);
	} else {
		validateRemoteUrl(config.remoteUrl);
		validateZoomRange(config.remoteMinZoom, config.remoteMaxZoom);
	}

	if (config.parentId !== undefined) {
		assertNonEmptyString(config.parentId, 'parentId');
	}
}

function createRasterLayer(config, fallbackZIndex, mode) {
	if (!getProjection(config.projection)) {
		throw new Error(`проекция ${config.projection} не зарегистрирована`);
	}
	const isOffline = mode === 'offline';
	const sourceType = isOffline ? 'localXYZ' : 'remoteXYZ';
	const minZoom = isOffline ? config.minZoom : config.remoteMinZoom;
	const maxZoom = isOffline ? config.maxZoom : config.remoteMaxZoom;
	const url = isOffline
		? `${LOCAL_TILE_ORIGIN}/${config.tree}/${config.urlTemplate}`
		: config.remoteUrl;

	let layer;
	const source = new XYZ({
		projection: config.projection,
		url,
		minZoom,
		maxZoom,
		tileSize: config.tileSize,
		crossOrigin: isOffline ? 'anonymous' : undefined,
		wrapX: !isOffline,
		...(!isOffline && {
			tileLoadFunction: createOnlineTileLoader(config.tree, available =>
				layer.set('onlineAvailable', available)
			),
		}),
	});

	layer = new TileLayer({
		rasterConfig: { ...config },
		// null means the online source has not been checked yet.
		onlineAvailable: isOffline ? false : null,
		id: config.id,
		descr: config.descr,
		visible: config.visible,
		zIndex: Number.isFinite(config.order) ? config.order : fallbackZIndex,
		icon: config.icon,
		// OpenLayers treats layer minZoom as exclusive, while the project config is inclusive.
		minZoom: minZoom - MIN_ZOOM_TOLERANCE,
		maxZoom,
		kind: config.kind,
		group: config.group,
		parentId: config.parentId,
		sourceType,
		rasterMode: mode,
		tree: config.tree,
		urlTemplate: config.urlTemplate,
		remoteUrl: config.remoteUrl,
		useLocalTiles: isOffline,
		cacheSize: 128,
		source,
	});
	return layer;
}

function validateZoomRange(minZoom, maxZoom) {
	if (
		!Number.isInteger(minZoom) ||
		!Number.isInteger(maxZoom) ||
		minZoom < 0 ||
		maxZoom > 42 ||
		minZoom > maxZoom
	) {
		throw new Error('задан некорректный диапазон zoom');
	}
}

function validateRemoteUrl(remoteUrl) {
	assertNonEmptyString(remoteUrl, 'remoteUrl');

	if (!['{z}', '{x}', '{y}'].every(marker => remoteUrl.includes(marker))) {
		throw new Error('remoteUrl должен содержать {z}, {x} и {y}');
	}

	let parsedUrl;
	try {
		parsedUrl = new URL(remoteUrl.replaceAll(/\{[zxy]\}/g, '0'));
	} catch {
		throw new Error('remoteUrl должен быть корректным URL');
	}

	if (parsedUrl.protocol !== 'https:') {
		throw new Error('remoteUrl должен использовать HTTPS');
	}
}

function assertNonEmptyString(value, fieldName) {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`${fieldName} должен быть непустой строкой`);
	}
}

function defaultErrorHandler(message) {
	console.error(message);
}

export function createOnlineTileLoader(tree, onAvailability = () => {}) {
	let lastFailure;
	const reportAvailability = (available, reason) => {
		onAvailability(available);
		if (!available && reason !== lastFailure) {
			console.warn('Онлайн-тайлы недоступны:', tree, reason);
		}
		lastFailure = available ? undefined : reason;
	};
	return async (tile, url) => {
		try {
			const { data, contentType, origin, networkError, cacheLimit } =
				await window.electronAPI.loadOnlineTile(tree, url);
			if (cacheLimit) warnTileCacheLimit(cacheLimit.limitBytes);
			const objectUrl = URL.createObjectURL(new Blob([data], { type: contentType }));
			const image = tile.getImage();
			const cleanup = event => {
				const available = event.type === 'load' && origin === 'network';
				reportAvailability(
					available,
					event.type === 'error'
						? 'Не удалось декодировать изображение тайла'
						: origin === 'device'
							? `Использован файл с устройства: ${networkError || 'сетевая загрузка не удалась'}`
							: origin !== 'network'
								? 'IPC не вернул источник тайла. Полностью перезапустите Electron после обновления кода.'
								: undefined
				);
				URL.revokeObjectURL(objectUrl);
				image.removeEventListener('load', cleanup);
				image.removeEventListener('error', cleanup);
			};
			image.addEventListener('load', cleanup);
			image.addEventListener('error', cleanup);
			image.src = objectUrl;
		} catch (error) {
			reportAvailability(false, error.message);
			console.error('Не удалось загрузить тайл:', error);
			tile.setState(TileState.ERROR);
		}
	};
}
