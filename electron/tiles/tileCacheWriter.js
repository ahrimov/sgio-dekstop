import { mkdir, readdir, lstat, rename, rm, writeFile, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

export const DEFAULT_TILE_CACHE_LIMIT_BYTES = 10 * 1024 ** 3;

export async function readTileCacheLimit(projectPath) {
	try {
		const xml = await readFile(path.join(projectPath, 'config.xml'), 'utf8');
		const value = new XMLParser().parse(xml)?.template?.layers?.RasterLayers
			?.OnlineTileCacheLimitGb;
		const gb = Number(value);
		if (Number.isFinite(gb) && gb >= 0 && Number.isSafeInteger(Math.floor(gb * 1024 ** 3))) {
			return Math.floor(gb * 1024 ** 3);
		}
	} catch (error) {
		console.warn('Не удалось прочитать лимит тайлов, используется 10 ГиБ:', error.message);
	}
	return DEFAULT_TILE_CACHE_LIMIT_BYTES;
}

export function createTileCacheWriter(tileRoot, limitBytes = DEFAULT_TILE_CACHE_LIMIT_BYTES) {
	let queue = Promise.resolve();
	let usedBytes;
	let limitReached = false;
	return (filePath, data) => {
		// Serialize reservations and writes so concurrent downloads cannot exceed the limit.
		const task = queue.then(async () => {
			if (usedBytes === undefined) usedBytes = await directorySize(tileRoot);
			const relative = path.relative(path.resolve(tileRoot), path.resolve(filePath));
			if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
				throw new Error('Путь тайла выходит за пределы каталога');
			}
			let oldSize = 0;
			try {
				const info = await lstat(filePath);
				if (!info.isFile()) throw new Error('Путь тайла не является обычным файлом');
				oldSize = info.size;
			} catch (error) {
				if (error.code !== 'ENOENT') throw error;
			}
			if (
				limitReached ||
				usedBytes >= limitBytes ||
				usedBytes - oldSize + data.length > limitBytes
			) {
				limitReached = true;
				return { limitBytes };
			}
			const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
			try {
				await mkdir(path.dirname(filePath), { recursive: true });
				await writeFile(temporaryPath, data, { flag: 'wx' });
				await rename(temporaryPath, filePath);
				usedBytes += data.length - oldSize;
			} finally {
				await rm(temporaryPath, { force: true }).catch(() => {});
			}
			return null;
		});
		queue = task.catch(() => {});
		return task;
	};
}

async function directorySize(directory) {
	let entries;
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch (error) {
		if (error.code === 'ENOENT') return 0;
		throw error;
	}
	let size = 0;
	for (const entry of entries) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) size += await directorySize(entryPath);
		else if (entry.isFile() && /\.(png|jpg)$/i.test(entry.name)) {
			try {
				size += (await lstat(entryPath)).size;
			} catch (error) {
				if (error.code !== 'ENOENT') throw error;
			}
		}
	}
	return size;
}
