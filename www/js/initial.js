function initial() {

    document.addEventListener('prepush', function(e) {
        const navigator = document.querySelector('#myNavigator');
        if (!navigator) return;
        if (navigator._isRunning) {
            e.cancel();
            setTimeout(() => navigator.pushPage(e.promise), 200);
        }
    });

    document.querySelector('#myNavigator').pushPage('./views/loadScreen.html');

    ons.ready(function(){
        ons.setDefaultDeviceBackButtonListener(function(event) {
            ons.notification.confirm({title: 'Потверждение выхода', message: 'Вы уверены, что хотите выйти?', buttonLabels: ["Нет", "Да"]}) 
            .then(function(index) {
                if (index === 1) { 
                    // В Electron используем закрытие окна вместо exitApp
                    window.close();
                }
            });
        });
    })

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
            console.log('Checking media directories...');
            
            // Просто проверяем существование, не создаем заново
            const rootExists = await electronAPI.exists(root_directory);
            const kmlExists = await electronAPI.exists(pathToKMLStorage);
            const imagesExists = await electronAPI.exists(pathToImageStorage);
            
            console.log('Root exists:', rootExists);
            console.log('KML exists:', kmlExists);
            console.log('Images exists:', imagesExists);
            
            // Если какой-то директории нет - создаем
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
                ons.notification.alert({
                    title: "Внимание", 
                    message: `Критическая ошибка. Не удалось обновить конфигурационный файл.`
                });
                callback();
            }
        }, function(){
            ons.notification.alert({
                title: "Внимание", 
                message: `Не удалось обновить конфигурационный файл.`
            });
            callback();
        });
    }
    
    async function warning(){
        console.log('Setting up project resources...');
        
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
                console.log('✅ Project setup completed');
                
                const configPath = `${projectTargetPath}/config.xml`;
                openFile(configPath, configParser);
            } else {
                console.log('❌ Project not found, creating default config');
                await createDefaultConfig();
            }
        } catch (error) {
            console.error('Error setting up project:', error);
            await createDefaultConfig();
        }
    }

    document.addEventListener('resume', function() {
        setTimeout(() => {
            transformUIToOrientation();
        }, 100);
    }) 

    myNavigator.addEventListener('prepop', function(event) {
      if (needsCancelNavigator) {
         event.cancel(); 
      } else {
        if(map.localMap){
            map.localMap = false;
            for(let layer of layers){
                const features  = layer.getSource().getFeatures();
                features.forEach((feature) => {
                    feature.changed();
                })
            }
        }
      }
    });

    addCustomProjections();

    addHTMLToDocument('./views/modals/ManualInputCoordinatesDialog.html');
    addHTMLToDocument('./views/modals/ChooseEditGeometryMode.html');
}

// Вспомогательная функция для копирования директории с использованием electronAPI
async function copyDirectory(source, target) {
    try {
        // Проверяем существование source
        const sourceExists = await electronAPI.exists(source);
        if (!sourceExists) {
            throw new Error('Source directory does not exist: ' + source);
        }
        
        // Создаем target директорию
        await electronAPI.mkdir(target);
        
        // Нужно добавить readdir в electronAPI
        // Пока используем временное решение - копируем только config.xml
        const configSource = `${source}/config.xml`;
        const configTarget = `${target}/config.xml`;
        
        const configExists = await electronAPI.exists(configSource);
        if (configExists) {
            await electronAPI.copyFile(configSource, configTarget);
        }
        
        return true;
    } catch (error) {
        console.error('Error in copyDirectory:', error);
        throw error;
    }
}

// Упрощенная версия copyDirectory если нужна рекурсивная копия
async function copyDirectoryRecursive(source, target) {
    // Для рекурсивного копирования нужно добавить readdir в electronAPI
    // Пока копируем только основные файлы
    const filesToCopy = [
        'config.xml',
        'other-important-file.xml'
    ];
    
    try {
        await electronAPI.mkdir(target);
        
        for (const file of filesToCopy) {
            const sourceFile = `${source}/${file}`;
            const targetFile = `${target}/${file}`;
            
            const exists = await electronAPI.exists(sourceFile);
            if (exists) {
                await electronAPI.copyFile(sourceFile, targetFile);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error copying directory:', error);
        throw error;
    }
}

function addCustomProjections(){
    proj4.defs('EPSG:3395', '+title=Yandex +proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs');
    ol.proj.proj4.register(proj4);    
}

function completeLoad() {
    if (typeof completeLoad.counter === 'undefined') {
        completeLoad.counter = 0;
        completeLoad.navigationCalled = false;
    }

    if (typeof completeLoad.finishCounter === 'undefined') {
        completeLoad.finishCounter = 0;
    }
    
    completeLoad.counter++;
    const finishCounter = completeLoad.finishCounter;
    
    if (document.querySelector('#load_stage') && finishCounter) {
        document.querySelector('#load_stage').textContent = `${completeLoad.counter}/${finishCounter}`;
    }
    
    if (completeLoad.counter >= finishCounter && !completeLoad.navigationCalled) {
        completeLoad.navigationCalled = true;
        
        setTimeout(() => {
            try {
                loadLayersVisibility();
                initLayerOrder();
                loadMapPosition();
                const navigator = document.querySelector('#myNavigator');
                
                if (navigator && navigator.resetToPage) {
                    if (completeLoad.counter >= finishCounter && completeLoad.navigationCalled) {
                        navigator.resetToPage('./views/home.html')
                            .then(() => {
                                console.log('Navigation completed successfully');
                            })
                            .catch(e => {
                                console.error('Navigation error:', e);
                                completeLoad.navigationCalled = false;
                            });
                    }
                }
            } catch (error) {
                console.error('Error in completeLoad:', error);
                completeLoad.navigationCalled = false;
            }
        }, 1000);
    }
}

function addHTMLToDocument(filename){
    fetch(filename)
     .then(response => {
        return response.text();
    })
     .then(data => {
        document.querySelector('#modalWindowTemplates').innerHTML += data;
     });
}

async function copyProjectResources(source, target) {
    try {
        console.log(`Recursively copying from ${source} to ${target}`);
        
        // Создаем целевую директорию
        await electronAPI.mkdir(target);
        
        // Рекурсивно копируем все файлы и папки
        await copyRecursive(source, target);
        
        console.log('✅ Project resources copied successfully');
        return true;
    } catch (error) {
        console.error('Error copying project resources:', error);
        throw error;
    }
}

// Рекурсивная функция копирования
async function copyRecursive(source, target) {
    try {
        // Получаем список всех элементов в source директории
        const items = await electronAPI.readdir(source);
        
        for (const item of items) {
            const sourcePath = `${source}/${item}`;
            const targetPath = `${target}/${item}`;
            
            // Простая проверка: если у элемента нет расширения, скорее всего это директория
            const hasExtension = item.includes('.');
            
            if (!hasExtension) {
                // Вероятно это директория - создаем и копируем рекурсивно
                console.log(`📁 Copying directory: ${item}`);
                await electronAPI.mkdir(targetPath);
                await copyRecursive(sourcePath, targetPath);
            } else {
                // Вероятно это файл - копируем
                console.log(`📄 Copying file: ${item}`);
                try {
                    await electronAPI.copyFile(sourcePath, targetPath);
                    console.log(`✅ ${item} copied`);
                } catch (copyError) {
                    console.log(`❌ Failed to copy ${item}:`, copyError.message);
                    // Если не удалось скопировать как файл, возможно это директория
                    console.log(`🔄 Trying to copy ${item} as directory`);
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