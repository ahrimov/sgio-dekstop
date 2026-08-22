import fs from 'fs';
import { getAppDataPath, getResourcesPath } from './ipc/pathHandlers.js';
import path from 'path';

export async function ensureProjectResources() {
	const appProjectPath = path.join(getAppDataPath(), 'Project');
	const sourceProjectPath = path.join(getResourcesPath(), 'Project');
	const infoFile = path.join(appProjectPath, '.resourceinfo');
	const appTiletreesPath = path.join(appProjectPath, 'tiletrees');
	const sourceTiletreesPath = path.join(getResourcesPath(), 'tiletrees');

	if (!fs.existsSync(sourceProjectPath)) {
		console.log('Source project resources not found:', sourceProjectPath);
		return;
	}

	const sourceInfo = getResourceInfo(sourceProjectPath);

	let needCopy = !fs.existsSync(appProjectPath);

	let savedInfo = null;

	const existInfoFile = fs.existsSync(infoFile);

	if (!needCopy && existInfoFile) {
		try {
			savedInfo = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
			needCopy =
				!savedInfo ||
				savedInfo.latestModTime < sourceInfo.latestModTime ||
				savedInfo.fileCount !== sourceInfo.fileCount;
			console.log(savedInfo);
		} catch {
			needCopy = true;
		}
	}

	if (needCopy || !existInfoFile) {
		console.log('Project resources need update');

		if (fs.existsSync(appProjectPath)) {
			clearDirectoryExcept(appProjectPath, new Set(['tiletrees']));
		}

		await copyRecursiveAsync(sourceProjectPath, appProjectPath);

		fs.writeFileSync(infoFile, JSON.stringify(sourceInfo, null, 2), 'utf8');
		console.log(
			`Project resources updated. Files: ${sourceInfo.fileCount}, Size: ${(sourceInfo.totalSize / 1024 / 1024).toFixed(2)} MB`
		);
	} else {
		console.log('Project resources are up to date');
	}

	await ensureTileResources(sourceTiletreesPath, appTiletreesPath);
}

async function ensureTileResources(sourcePath, targetPath) {
	if (!fs.existsSync(sourcePath)) {
		console.log('Source tile resources not found:', sourcePath);
		return;
	}

	const infoFile = path.join(targetPath, '.resourceinfo');
	const sourceInfo = getResourceInfo(sourcePath);
	let savedInfo = null;

	if (fs.existsSync(infoFile)) {
		try {
			savedInfo = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
		} catch {
			// A missing or damaged marker triggers a safe merge from bundled tiles.
		}
	}

	if (
		savedInfo?.latestModTime === sourceInfo.latestModTime &&
		savedInfo?.fileCount === sourceInfo.fileCount &&
		savedInfo?.totalSize === sourceInfo.totalSize
	) {
		console.log('Tile resources are up to date');
		return;
	}

	console.log('Tile resources need update');
	await copyRecursiveAsync(sourcePath, targetPath);
	fs.writeFileSync(infoFile, JSON.stringify(sourceInfo, null, 2), 'utf8');
	console.log(
		`Tile resources updated. Files: ${sourceInfo.fileCount}, Size: ${(sourceInfo.totalSize / 1024 / 1024).toFixed(2)} MB`
	);
}

function clearDirectoryExcept(dirPath, preservedNames) {
	for (const name of fs.readdirSync(dirPath)) {
		if (!preservedNames.has(name)) {
			fs.rmSync(path.join(dirPath, name), { recursive: true, force: true });
		}
	}
}

function getResourceInfo(dirPath) {
	if (!fs.existsSync(dirPath)) return null;

	let latestModTime = 0;
	let totalSize = 0;
	let fileCount = 0;

	function scanDir(dir, rootDir) {
		const items = fs.readdirSync(dir);

		for (const item of items) {
			const itemPath = path.join(dir, item);
			const stat = fs.statSync(itemPath);

			if (stat.isDirectory()) {
				// Mirror the same exclusion used in copyRecursiveAsync so that
				// fileCount stays consistent with what is actually copied.
				if (dir === rootDir && EXCLUDED_PROJECT_DIRS.has(item)) {
					continue;
				}
				scanDir(itemPath, rootDir);
			} else {
				fileCount++;
				totalSize += stat.size;
				if (stat.mtimeMs > latestModTime) {
					latestModTime = stat.mtimeMs;
				}
			}
		}
	}

	scanDir(dirPath, dirPath);
	return { latestModTime, totalSize, fileCount };
}

// Directories inside Project/ that must NOT be copied to sgio-data/Project/.
// The 'db' folder contains only the seed default.db which is read directly
// from the app bundle by initialDB() — copying it would create an unused
// duplicate at sgio-data/Project/db/default.db.
const EXCLUDED_PROJECT_DIRS = new Set(['db']);

async function copyRecursiveAsync(src, dest, rootSrc = null) {
	if (!fs.existsSync(dest)) {
		fs.mkdirSync(dest, { recursive: true });
	}

	// Track the root source so we can apply top-level exclusions only.
	if (rootSrc === null) rootSrc = src;

	const files = fs.readdirSync(src);

	for (const file of files) {
		const srcPath = path.join(src, file);
		const destPath = path.join(dest, file);

		const stat = fs.statSync(srcPath);

		if (stat.isDirectory()) {
			// Skip excluded top-level subdirectories of the Project folder.
			if (src === rootSrc && EXCLUDED_PROJECT_DIRS.has(file)) {
				console.log(`Skipping excluded project directory: ${file}`);
				continue;
			}
			await copyRecursiveAsync(srcPath, destPath, rootSrc);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}
