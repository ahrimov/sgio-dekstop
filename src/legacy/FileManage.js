import React from 'react';
import { Modal } from 'antd';

export async function openFile(filePath, post_processing) {
	try {
		const data = await electronAPI.readFile(filePath);
		const fileName = filePath.split('/').pop() || filePath.split('\\').pop();
		post_processing(data, fileName);
	} catch (err) {
		console.log('Error while open file:', filePath, ' error:', err);
		Modal.info({
			title: 'Внимание',
			content: (
				<div>
					<p className="notification-alert">Ошибка при открытии файла: {filePath}</p>
				</div>
			),
			okText: 'OK',
		});
	}
}

export async function getFileEntry(filePath, success, fail) {
	try {
		const exists = await electronAPI.exists(filePath);
		if (exists) {
			success({ path: filePath });
		} else {
			fail(new Error('File not found'));
		}
	} catch (err) {
		fail(err);
	}
}

export async function writeFileText(fileEntry, text, success, fail) {
	try {
		await electronAPI.writeFile(fileEntry.path, text);
		if (success) success();
	} catch (err) {
		console.log('Failed file write: ' + err.toString());
		if (fail) fail();
	}
}

export async function getFolder(dirName, callback) {
	try {
		await electronAPI.mkdir(dirName);
		callback({ path: dirName });
	} catch (err) {
		console.log('Error creating directory:', err);
		callback({ path: dirName });
	}
}

export async function checkIfFileExists(filePath, fileExists, fileDoesNotExist) {
	try {
		const exists = await electronAPI.exists(filePath);
		if (exists) {
			fileExists({ path: filePath });
		} else {
			fileDoesNotExist(new Error('File not found'));
		}
	} catch (err) {
		fileDoesNotExist(err);
	}
}

export async function saveFile(pathDir, fileName, fileData, success, onError) {
	const innerOnError = error => {
		Modal.error({
			title: 'Внимание',
			content: `Невозможно создать файл. Ошибка: ${error}`,
			okText: 'OK',
		});
	};
	const onError_ = onError ?? innerOnError;

	const fullPath = `${pathDir}/${fileName}`;

	try {
		await electronAPI.writeFile(fullPath, fileData);
		if (success) success();
	} catch (err) {
		onError_(err);
	}
}

export function showAllFilesAtDir(pathToDir, success) {
	electronAPI.readdir(pathToDir, function (err, files) {
		if (err) {
			console.log('Unable to read directory');
			return;
		}
		const fileEntries = files.map(file => ({ name: file, path: `${pathToDir}/file` }));
		success(fileEntries);
	});
}

export async function openFileFromProject(relativePath, callback) {
	try {
		const data = await electronAPI.readFile(relativePath);
		const fileName = relativePath.split('/').pop() || relativePath.split('\\').pop();
		callback(data, fileName);
	} catch (err) {
		console.log('Error while open file:', relativePath);
		Modal.error({
			title: 'Внимание',
			content: (
				<div>
					<p className="notification-alert">Ошибка при открытии файла: {relativePath}</p>
					<p>Error {err}</p>
				</div>
			),
			okText: 'OK',
		});
	}
}

export async function globalReadlFile(fileUri, callback) {
	try {
		const data = await electronAPI.readFile(fileUri);
		callback(data);
	} catch (err) {
		console.error('Ошибка чтения файла:', err);
	}
}
