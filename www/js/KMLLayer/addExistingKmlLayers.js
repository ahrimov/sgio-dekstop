async function addExistingKMLLayers() {
    try {
        const folderPath = pathToKMLStorage + '/';
        const files = await getKmlLayerFiles();
        if (!files?.length) {
            completeLoad();
            return;
        }

        const mapProjection = map.getView().getProjection().getCode();
        const format = new ol.format.KML();
        
        if (!completeLoad.finishCounter) completeLoad.finishCounter = 0;
        completeLoad.finishCounter += files.filter(file => file.endsWith('.kml')).length;

        for (const file of files) {
            if (!file.endsWith('.kml')) continue;
            
            try {
                if (file.endsWith('.kml')) { // Фильтруем только KML-файлы
                    const innerLayerId = file;
                    let descrLayerId = file;

                    const kmlContent = await readFileContent(folderPath + file);
                    if (!kmlContent) continue;
                    const features = format.readFeatures(kmlContent, 
                        { dataProjection: 'EPSG:4326', featureProjection: mapProjection }
                    );

                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(kmlContent, "application/xml");

                    const schemaElement = xmlDoc.querySelector("kml > Document > Schema");
                    if (schemaElement) {
                        const schemaId = schemaElement.getAttribute("name");
                        descrLayerId = schemaId;
                    }

                    const layerAtribs = [];

                    const schemaElements = xmlDoc.getElementsByTagName('Schema');
                            
                    if (schemaElements.length > 0) {
                        const simpleFields = schemaElements[0].getElementsByTagName('SimpleField');
                        for (let i = 0; i < simpleFields.length; i++) {
                            const name = simpleFields[i].getAttribute('name');
                            if (name) {
                                layerAtribs.push({ name, label: name, visible: true, type: 'STRING' });
                            }
                        }
                    }

                    const regex = new RegExp(`^${descrLayerId}(_\\d)?`);
                    const similarLayers = layers.filter(layer => regex.test(layer.label));
                    if (similarLayers?.length) descrLayerId += ('_' + similarLayers.length);

                    features.forEach(feature => {
                        feature.id = feature.get('ID');
                        feature.layerID = innerLayerId;
                        feature.type = 'default';
                    });
                    const newLayer = new ol.layer.Vector({
                        id: innerLayerId, 
                        descr: descrLayerId,
                        source: new ol.source.Vector( { features }),
                        zIndex: minZIndexForVectorLayers,
                        style: styleFunction,
                    });
                    newLayer.id = innerLayerId;
                    newLayer.label = descrLayerId;

                                
                    let geometryType = null;
                    const geometryTypeField = xmlDoc.querySelector('SimpleField[name="geometryType"]');
                    if (geometryTypeField) {
                        geometryType = geometryTypeField.getAttribute('actualType');
                    }

                    if (!geometryType && features[0].getGeometry()) {
                        geometryType = features[0].getGeometry().getType();
                    }

                    newLayer.geometryType = geometryType;

                    loadKMLLayerStyle(newLayer, kmlContent, geometryType);

                    newLayer.set('fileUri', pathToKMLStorage + '/' + innerLayerId);
                    newLayer.visible = true;
                    newLayer.set('kmlType', true);
                    newLayer.atribs = layerAtribs;
                    newLayer.enabled = true;

                    layers.push(newLayer);
                    map.addLayer(newLayer);

                    loadLayersVisibility();

                    completeLoad();
                } 
            } catch (error) {
                console.error(`Error processing file ${file}:`, error);
                completeLoad(); // Учитываем и ошибки в подсчёте
            }
        }
    } catch (e) {
        console.error('Error in addExistingKMLLayers:', e);
    }
}


// Функция для получения списка файлов в папке
async function listFilesInFolder(folderPath) {
    try {
        const files = await electronAPI.readdir(folderPath);
        return files;
    } catch (error) {
        console.error('Error listing files in folder:', error);
        return [];
    }
}

// Функция для чтения содержимого файла
async function readFileContent(filePath) {
    try {
        const content = await electronAPI.readFile(filePath);
        return content;
    } catch (error) {
        console.error('Error reading file content:', error);
        return null;
    }
}

function styleFunction (feature) {
    const geometryType = feature.getGeometry().getType();
    switch (geometryType) {
        case 'Point': 
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 8,
                    fill: new ol.style.Fill({ color: '#2375fa' }),
                    stroke: new ol.style.Stroke({
                        color: 'white',
                        width: 3,
                    }),
                }),
            });

        case 'LineString': 
            return new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#2375fa',
                    width: 3,
                }),
            });

        case 'Polygon': 
            return new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(35, 117, 250, 0.5)',
                }),
                stroke: new ol.style.Stroke({
                    color: '#2375fa',
                    width: 2,
                }),
            });

        default:
            return new ol.style.Style(); 
    }
}


async function getKmlLayerFiles() {
    const pathToConfig = root_directory + "config.xml";
    const data = await readFileContent(pathToConfig);
    
    if (!data) {
        console.log('Config file not found or empty');
        return [];
    }
    
    // Парсинг XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, 'application/xml');

    // Поиск тега <KMLFiles>
    const kmlFilesNode = xmlDoc.querySelector('storage KML KMLFiles');
    if (!kmlFilesNode || !kmlFilesNode.textContent.trim()) {
        console.log('Тег <KMLFiles> не найден или пуст.');
        return [];
    }

    // Получение списка файлов из <KMLFiles>
    const kmlFiles = kmlFilesNode.textContent.split('|').filter(file => file.trim() !== '');
    console.log(`Найдены KML файлы в конфиге: ${kmlFiles.join(', ')}`);
    return kmlFiles;
}