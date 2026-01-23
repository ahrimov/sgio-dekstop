import fs from 'fs';
import { getAppDataPath, getResourcesPath, getSourcePath } from './ipc/pathHandlers.js';
import path from 'path';

export async function ensureProjectResources() {
	const appProjectPath = path.join(getAppDataPath(), 'Project');
	const sourceProjectPath = path.join(getResourcesPath(), 'Project');
	const infoFile = path.join(appProjectPath, '.resourceinfo');

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
		} catch (e) {
			needCopy = true;
		}
	}

	if (needCopy || !existInfoFile) {
		console.log('Project resources need update');

		if (fs.existsSync(appProjectPath)) {
			fs.rmSync(appProjectPath, { recursive: true, force: true });
		}

		await copyRecursiveAsync(sourceProjectPath, appProjectPath);

		fs.writeFileSync(infoFile, JSON.stringify(sourceInfo, null, 2), 'utf8');
		console.log(
			`Project resources updated. Files: ${sourceInfo.fileCount}, Size: ${(sourceInfo.totalSize / 1024 / 1024).toFixed(2)} MB`
		);
	} else {
		console.log('Project resources are up to date');
	}
}

function getResourceInfo(dirPath) {
	if (!fs.existsSync(dirPath)) return null;

	let latestModTime = 0;
	let totalSize = 0;
	let fileCount = 0;

	function scanDir(dir) {
		const items = fs.readdirSync(dir);

		for (const item of items) {
			const itemPath = path.join(dir, item);
			const stat = fs.statSync(itemPath);

			if (stat.isDirectory()) {
				scanDir(itemPath);
			} else {
				fileCount++;
				totalSize += stat.size;
				if (stat.mtimeMs > latestModTime) {
					latestModTime = stat.mtimeMs;
				}
			}
		}
	}

	scanDir(dirPath);
	return { latestModTime, totalSize, fileCount };
}

async function copyRecursiveAsync(src, dest) {
	if (!fs.existsSync(dest)) {
		fs.mkdirSync(dest, { recursive: true });
	}

	const files = fs.readdirSync(src);

	for (const file of files) {
		const srcPath = path.join(src, file);
		const destPath = path.join(dest, file);

		const stat = fs.statSync(srcPath);

		if (stat.isDirectory()) {
			await copyRecursiveAsync(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}
