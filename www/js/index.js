const appVersion = '2.0.3';

let updateAppMode = false;

const versionFileName = 'version.txt';

// Заменяем cordova deviceready на DOMContentLoaded для Electron
document.addEventListener('DOMContentLoaded', onElectronReady, false);

var layers = []
var features = []

let db, dbMetaData, currentMapView;

// Объявляем глобальные переменные путей
let app_device_directory;
let root_directory;
let pathToImageStorage;
let pathToKMLStorage;

var gps_position;

let navigationMode = NAVIGATION_MODE.DISABLED;

let needsCancelNavigator = false;

let hasGeolocationPermission = false;

let hasExternalStoragePermissions = false;


let map = new ol.Map();

let numberNodesOnMap = defaultNumberNodesOnMap;

// Растровая подложка
let baseRasterLayers = [];

async function initializePaths() {
    try {
        // Простая проверка вместо isElectronAPIReady
        if (typeof electronAPI !== 'undefined' && electronAPI.getAppDataPath) {
            console.log('Using electronAPI for adaptive paths');
            
            // Получаем адаптивные пути
            const appDataPath = await electronAPI.getAppDataPath();
            const resourcePath = await electronAPI.getResourcePath();
            const sourcePath = await electronAPI.getSourcePath();
            
            app_device_directory = appDataPath;
            root_directory = appDataPath;
            pathToImageStorage = `${appDataPath}/images`;
            pathToKMLStorage = `${appDataPath}/KML`;
            
            console.log('Adaptive paths initialized:');
            console.log('  App data:', appDataPath);
            console.log('  Resources:', resourcePath);
            console.log('  Source:', sourcePath);
            
            // Создаем основные директории
            try {
                await electronAPI.mkdir(appDataPath);
                await electronAPI.mkdir(pathToImageStorage);
                await electronAPI.mkdir(pathToKMLStorage);
                await electronAPI.mkdir(`${appDataPath}/Project`);
                console.log('App directories created successfully');
            } catch (mkdirError) {
                console.log('App directories already exist');
            }
        } else {
            // Fallback для разработки
            console.log('electronAPI not available, using fallback paths');
            app_device_directory = '../sgio-data';
            root_directory = '../sgio-data';
            pathToImageStorage = '../sgio-data/images';
            pathToKMLStorage = '../sgio-data/KML';
        }
    } catch (error) {
        console.error('Error in initializePaths:', error);
        // Fallback
        app_device_directory = '../sgio-data';
        root_directory = '../sgio-data';
        pathToImageStorage = '../sgio-data/images';
        pathToKMLStorage = '../sgio-data/KML';
    } finally {
      root_directory += '/Project/'
    }
}

async function onElectronReady() {
    console.log('Electron app ready');
    console.log('electronAPI available:', typeof electronAPI !== 'undefined');
    
    await initializePaths();
    initial();
}

window.fn = {};
        
window.fn.openMenu = function() {
  var menu = document.getElementById('menu');
  menu.open();
};

window.fn.load = function(page) {
  document.querySelector('#myNavigator').pushPage(page)
  var menu = document.getElementById('menu');
  menu.close()
};

window.addEventListener("orientationchange", transformUIToOrientation);