import { readFileSync } from 'node:fs';
import path from 'node:path';

export function readRasterConfig(projectPath) {
	const configPath = path.join(projectPath, 'rasterLayers.json');
	try {
		const configs = JSON.parse(readFileSync(configPath, 'utf8'));
		if (!Array.isArray(configs)) throw new Error('Ожидается массив растровых слоёв');
		return configs;
	} catch (error) {
		// Keep the application available so the user can correct the external file.
		console.error('Не удалось прочитать настройки растровых слоёв:', configPath, error);
		return [];
	}
}
