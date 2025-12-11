import { configParser } from "./XMLParser";
import { openFile, checkIfFileExists, saveFile } from "./FileManage";
import { app_device_directory, root_directory, pathToImageStorage, pathToKMLStorage } from './initial.js';
import { versionFileName, appVersion } from "./consts.js";
import  proj4 from 'proj4';
import { register } from 'ol/proj/proj4';

export let updateAppMode = false;

export function initial() {
    setTimeout(() => {
        const pathToVersionFile = `${app_device_directory}/${versionFileName}`;
        checkIfFileExists(pathToVersionFile, (fileEntry) => {
            openFile(pathToVersionFile, function(data, fileName) {
                if (data === appVersion) {
                    updateAppMode = false;
                    continueInitial();
                } else {
                    updateAppMode = true;
                    writeFileText(fileEntry, appVersion, continueInitial, () => {
                        console.log('Aborting');
                    });
                }
            });
        }, () => {
            updateAppMode = true;
            saveFile(app_device_directory, versionFileName, appVersion, continueInitial);
        });
    }, 100);
}

async function continueInitial() {
    const pathToConfig = `${root_directory}/config.xml`;
    await createMediaDirectory();
    checkIfFileExists(pathToConfig, fileExist, warning);

    async function createMediaDirectory(){
        try {
            const rootExists = await electronAPI.exists(root_directory);
            const kmlExists = await electronAPI.exists(pathToKMLStorage);
            const imagesExists = await electronAPI.exists(pathToImageStorage);
            
            console.log('Root exists:', rootExists);
            console.log('KML exists:', kmlExists);
            console.log('Images exists:', imagesExists);
            
            if (!rootExists) {
                await electronAPI.mkdir(root_directory);
            }
            if (!kmlExists) {
                await electronAPI.mkdir(pathToKMLStorage);
            }
            if (!imagesExists) {
                await electronAPI.mkdir(pathToImageStorage);
            }
            
            console.log('Media directories ready');
        } catch (error) {
            console.error('Error checking media directories:', error);
        }
    }

    function fileExist(file){
        console.log('Config file exist!');
        if (updateAppMode){
            updateConfigFile(file, () => {
                openFile(pathToConfig, configParser);
            });
        } else {
            openFile(pathToConfig, configParser);
        }
    }

    async function updateConfigFile(file, callback){
        const path_resources_config = './resources/Project/config.xml';
        checkIfFileExists(path_resources_config, async function(resourceConfig) {
            try {
                await electronAPI.copyFile(path_resources_config, pathToConfig);
                console.log('Config file updated successfully');
                callback();
            } catch (err) {
                console.error('Error copying config:', err);
                if (typeof ons !== 'undefined' && ons.notification) {
                    ons.notification.alert({
                        title: "Внимание", 
                        message: `Критическая ошибка. Не удалось обновить конфигурационный файл.`
                    });
                } else {
                    alert('Критическая ошибка. Не удалось обновить конфигурационный файл.');
                }
                callback();
            }
        }, function(){
            if (typeof ons !== 'undefined' && ons.notification) {
                ons.notification.alert({
                    title: "Внимание", 
                    message: `Не удалось обновить конфигурационный файл.`
                });
            } else {
                alert('Не удалось обновить конфигурационный файл.');
            }
            callback();
        });
    }
    
    async function warning(){ 
        try {
            if (typeof electronAPI === 'undefined' || !electronAPI.getResourcePath) {
                console.log('electronAPI not available, creating default config');
                await createDefaultConfig();
                return;
            }

            const sourcePath = await electronAPI.getSourcePath();
            
            let projectSourcePath = `${sourcePath}/resources/Project`;
            
            const projectTargetPath = root_directory;
            
            if (projectSourcePath) {
                console.log('Using project source:', projectSourcePath);
                await copyProjectResources(projectSourcePath, projectTargetPath);
                console.log('Project setup completed');
                
                const configPath = `${projectTargetPath}/config.xml`;
                openFile(configPath, configParser);
            } else {
                console.log('Project not found, creating default config');
                await createDefaultConfig();
            }
        } catch (error) {
            console.error('Error setting up project:', error);
            await createDefaultConfig();
        }
    }

    addCustomProjections();
}

function addCustomProjections(){
    if (typeof proj4 !== 'undefined') {
        proj4.defs('EPSG:3395', '+title=Yandex +proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs');
        register(proj4);
    }
}

export function completeLoad() {
    if (typeof completeLoad.counter === 'undefined') {
        completeLoad.counter = 0;
        completeLoad.navigationCalled = false;
    }

    if (typeof completeLoad.finishCounter === 'undefined') {
        completeLoad.finishCounter = 0;
    }
    
    completeLoad.counter++;
    const finishCounter = completeLoad.finishCounter;
    
    if (completeLoad.counter >= finishCounter && !completeLoad.navigationCalled) {
        completeLoad.navigationCalled = true;
        
        setTimeout(() => {
            try {
                loadLayersVisibility();
                initLayerOrder();
                loadMapPosition();
                
                if (window.legacyApp) {
                    window.legacyApp.onInitialized?.();
                }
                
            } catch (error) {
                console.error('Error in completeLoad:', error);
                completeLoad.navigationCalled = false;
            }
        }, 1000);
    }
}

async function copyProjectResources(source, target) {
    try {
        await electronAPI.mkdir(target);
        await copyRecursive(source, target);
        return true;
    } catch (error) {
        console.error('Error copying project resources:', error);
        throw error;
    }
}

async function copyRecursive(source, target) {
    try {
        const items = await electronAPI.readdir(source);
        
        for (const item of items) {
            const sourcePath = `${source}/${item}`;
            const targetPath = `${target}/${item}`;
        
            const hasExtension = item.includes('.');
            if (!hasExtension) {
                await electronAPI.mkdir(targetPath);
                await copyRecursive(sourcePath, targetPath);
            } else {
                try {
                    await electronAPI.copyFile(sourcePath, targetPath);
                    console.log(`${item} copied`);
                } catch (copyError) {
                    console.log(`Failed to copy ${item}:`, copyError.message);
                    console.log(`Trying to copy ${item} as directory`);
                    await electronAPI.mkdir(targetPath);
                    await copyRecursive(sourcePath, targetPath);
                }
            }
        }
    } catch (error) {
        console.error(`Error in copyRecursive for ${source}:`, error);
        throw error;
    }
}
