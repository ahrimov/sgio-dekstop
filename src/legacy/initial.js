import { initial, completeLoad } from './initialLoad.js';

export let app_device_directory;
export let root_directory;
export let pathToImageStorage;
export let pathToKMLStorage;
export let pathToTempKMlStorage;

async function initializePaths() {
	try {
		if (typeof electronAPI !== 'undefined' && electronAPI.getAppDataPath) {
			console.log('Using electronAPI for adaptive paths');

			const appDataPath = await electronAPI.getAppDataPath();

			app_device_directory = appDataPath;
			root_directory = appDataPath;
			pathToImageStorage = `${appDataPath}/images`;
			pathToKMLStorage = `${appDataPath}/KML`;
			pathToTempKMlStorage = `${appDataPath}/temp_KML`;

			try {
				await electronAPI.mkdir(appDataPath);
				await electronAPI.mkdir(pathToImageStorage);
				await electronAPI.mkdir(pathToKMLStorage);
				await electronAPI.mkdir(`${appDataPath}/Project`);
				await electronAPI.mkdir(pathToTempKMlStorage);
				console.log('App directories created successfully');
			} catch (mkdirError) {
				console.log('App directories already exist:', mkdirError);
			}
		} else {
			console.log('electronAPI not available, using fallback paths');
			app_device_directory = '../sgio-data';
			root_directory = '../sgio-data';
			pathToImageStorage = '../sgio-data/images';
			pathToKMLStorage = '../sgio-data/KML';
			pathToTempKMlStorage = '../sgio-data/temp_KML';
		}
	} catch (error) {
		console.error('Error in initializePaths:', error);
		app_device_directory = '../sgio-data';
		root_directory = '../sgio-data';
		pathToImageStorage = '../sgio-data/images';
		pathToKMLStorage = '../sgio-data/KML';
		pathToTempKMlStorage = '../sgio-data/temp_KML';
	} finally {
		root_directory += '/Project/';
	}
}

async function onElectronReady() {
	console.log('electronAPI available:', typeof electronAPI !== 'undefined');

	await initializePaths();

	if (typeof initial === 'function') {
		initial();
	} else {
		console.log('initial function not found, skipping');
	}
}

window.fn = {};

window.fn.openMenu = function () {
	var menu = document.getElementById('menu');
	if (menu && menu.open) {
		menu.open();
	}
};

window.fn.load = function (page) {
	var navigator = document.querySelector('#myNavigator');
	if (navigator && navigator.pushPage) {
		navigator.pushPage(page);
	}
	var menu = document.getElementById('menu');
	if (menu && menu.close) {
		menu.close();
	}
};

window.legacyApp = {
	initialize: onElectronReady,
	initializePaths: initializePaths,
	completeLoad: completeLoad,
};
