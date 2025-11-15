async function addNewLayer() {
  const answer = await ons.notification.confirm({
      title: 'Добавление kml-слоя', 
      message: 'Если Вы будете вносить изменения в добавляемый слой, то, для получения измененного файла, необходимо использовать функцию "Экспорт kml".', 
      buttonLabels: ["Отмена", "Продолжить"]
  }); 
  if (!answer) return;
    const fileUri = await window.electronAPI.openFileDialog({
      title: 'Выберите KML файл',
      filters: [
        { name: 'KML Files', extensions: ['kml'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!fileUri) return;

    let text = await electronAPI.readFile(fileUri);
    const fileName = getFileNameFromUri(fileUri);

    const mapProjection = map.getView().getProjection().getCode();
    const format = new ol.format.KML();
    const features = format.readFeatures(text, 
      { dataProjection: 'EPSG:4326', featureProjection: mapProjection }
    );
    if (!features || !features.length) {
      ons.notification.alert({title: "Внимание", message:'Не найдено объектов в файле.'});
      return;
    }

    if (!features[0].get('ID')) {
      text = addMissingIdsToKml(text, features);
    }

    let descrLayerId = fileName;
    let schemaName = '';
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");

    const schemaElement = xmlDoc.querySelector("kml > Document > Schema");
    if (schemaElement) {
      schemaName = schemaElement.getAttribute("name");
      if (schemaName) descrLayerId += `_${schemaName}`;
      schemaElement.setAttribute('name', descrLayerId);
      const serializer = new XMLSerializer();
      text = serializer.serializeToString(xmlDoc);
    } 

    const date = new Date();
    const innerLayerId = descrLayerId + formatDate(date) + '.kml';

    const regex = new RegExp(`^${descrLayerId}(_\\d)?`);
    const similarLayers = layers.filter(layer => regex.test(layer.label));
    if (similarLayers?.length) descrLayerId += ('_' + similarLayers.length);

    let innerFeatureId = 1;
    features.forEach(feature => {
      if (feature.get('ID')) {
        feature.id = feature.get('ID');
      } else {
          const id = innerFeatureId;
          feature.set('ID', id);
          feature.id = id;
          innerFeatureId += 1; 
      }
      feature.layerID = innerLayerId;
      feature.type = 'default';
    });
    const newLayer = new ol.layer.Vector({
      id: innerLayerId, 
      descr: descrLayerId,
      source: new ol.source.Vector( { features }),
      zIndex: minZIndexForVectorLayers,
      style: (feature) => {
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
    });
    
    newLayer.id = innerLayerId;
    newLayer.label = descrLayerId;
    const geometryType = features[0].getGeometry().getType();
    newLayer.geometryType = geometryType;
    for(let i = 0; i < features.length; i++) {
      if (features[i]?.getGeometry().getType() !== geometryType) {
        const topology = convertGeomtetryTypeName(geometryType);
        ons.notification.alert({
          title: 'Внимание',
          message: `В загружаемых данных имеются объекты различных типов геометрии (топологии). Для объектов ${topology} топологии стиль будет предложено изменить вручную. Для остальных топологий будут использованы автоматически созданные стили.` 
        });
        break;
      }
    }
    newLayer.visible = true;
    newLayer.set('kmlType', true);
    newLayer.set('fileUri', pathToKMLStorage + '/' + innerLayerId);
    let style = new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: '#fa2375',
        width: 3,
      }),
    });

    switch (geometryType) {
      case 'Point':
          style =  new ol.style.Style({
              image: new ol.style.Circle({
                  fill: new ol.style.Fill({color: generateColor()}),
                  radius: 3
              }),
              text: new ol.style.Text({
                  fill: new ol.style.Fill({color: '#000000'})
              })
          });
          break;
      case 'LineString': 
          style = new ol.style.Style({
              stroke: new ol.style.Stroke({
                  color: generateColor(),
                  width: 2
              }),
              text: new ol.style.Text({
                  fill: new ol.style.Fill({color: '#000000'})
              })
          });
          break;
      case 'Polygon':
          style = new ol.style.Style({
              fill: new ol.style.Fill({
                  color: generateColor()
              }),
              stroke: new ol.style.Stroke({
                  color: 'rgb(0,0,0)',
                  width: 1
              }),
              text: new ol.style.Text({
                  fill: new ol.style.Fill({color: '#000000'})
              })
          });
          break;
    }

    newLayer.setStyle(style);
    features.forEach(feature => {
      feature.setStyle(style);
    });
    const firstFeature = features[0];
    const layerKeys = firstFeature.getKeys()
    const layerAtribs = layerKeys.filter(key => key !== 'geometry' && key !== 'styleUrl').map((key) => { return { name: key, label: key, visible: true, type: 'STRING' } });
    newLayer.atribs = layerAtribs;
    newLayer.enabled = true;

    const kmlContent = text;
    const targetPath = `${pathToKMLStorage}/${innerLayerId}`;

    await electronAPI.writeFile(targetPath, kmlContent);
    
    // Обновляем конфиг
    await addKMLLayerFileToConfig(innerLayerId);

    document.querySelector('#myNavigator').pushPage('./views/styleEditor.html', { 
      data: {
        layer: newLayer,
        callback: () => {
          addLayerWithLoading(newLayer);
        },
      }
    });

    function onError(error) {
      ons.notification.alert({title: "Внимание", message:'Произошла ошибка при чтении файла.'});
    }
}

function getFileNameFromUri(uri) {
    try {
        // Для Electron пути - это обычные строки пути
        const pathParts = uri.split(/[\\/]/);
        let fileName = pathParts[pathParts.length - 1];
        fileName = fileName.split('?')[0];
        fileName = fileName.split('#')[0];
        return fileName;
    } catch (e) {
        console.error("Ошибка при получении имени файла:", e);
        return "unknown.kml"; 
    }
}

async function addKMLLayerFileToConfig(kmlFile) { 
  const pathToConfig = `${root_directory}/Project/config.xml`;
  
  try {
    const data = await electronAPI.readFile(pathToConfig);
    
    // Парсинг XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, 'application/xml');

    // Добавление тега <KMLFiles>
    const storageNode = xmlDoc.querySelector('storage KML');
    if (!storageNode) {
        console.error('Тег <KML> не найден в конфигурационном файле.');
        return;
    }

    let kmlFilesNode = storageNode.querySelector('KMLFiles');
    if (!kmlFilesNode) {
        kmlFilesNode = xmlDoc.createElement('KMLFiles');
        storageNode.appendChild(kmlFilesNode);
    }

    const existingFiles = kmlFilesNode.textContent.split('|').filter(file => file.trim() !== '');
    const updatedFiles = Array.from(new Set([...existingFiles, kmlFile ]));

    // Обновление содержимого <KMLFiles>
    kmlFilesNode.textContent = updatedFiles.join('|');

    // Преобразование обратно в строку
    const serializer = new XMLSerializer();
    const updatedXml = serializer.serializeToString(xmlDoc);

    // Запись обновленного файла через electronAPI
    await electronAPI.writeFile(pathToConfig, updatedXml);
    
  } catch (error) {
    console.error('Error updating config:', error);
  }
}

function addMissingIdsToKml(kmlContent,features) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlContent, "application/xml");

  const schema = xmlDoc.querySelector('Schema');
  if (!schema) {
    const document = xmlDoc.querySelector('Document');
    schema = xmlDoc.createElement('Schema');
    schema.setAttribute('name', 'DefaultSchema');
    schema.setAttribute('id', 'DefaultSchema');
    document.insertBefore(schema, document.firstChild);
  }

  let idField = Array.from(schema.querySelectorAll('SimpleField')).find(field => field.getAttribute('name') === 'ID');

  if (!idField) {
    idField = xmlDoc.createElement('SimpleField');
    idField.setAttribute('name', 'ID');
    idField.setAttribute('type', 'string');
    schema.appendChild(idField);
  }

  const placemarks = xmlDoc.querySelectorAll('Placemark');

  placemarks.forEach((placemark, index) => {
    const schemaData = placemark.querySelector('SchemaData');
    if (!schemaData) return;

    const idData = placemark.querySelector('SimpleData[name="ID"]');
    if (idData) {
      return;
    }

    const newId = `${index}`;
    if (features[index]) {
      features[index].set('ID', newId);
    }

    const newIdData = xmlDoc.createElement('SimpleData');
    newIdData.setAttribute('name', 'ID');
    newIdData.textContent = newId;

    schemaData.appendChild(newIdData);
  });

  const serializer = new XMLSerializer();
  const updatedKml = serializer.serializeToString(xmlDoc);

  return updatedKml;
}


// Функция для извлечения имени файла из URI
function getFileNameFromUri(uri) {
    try {
        const decodedUri = decodeURIComponent(uri);
        
        const lastSeparatorIndex = Math.max(
            decodedUri.lastIndexOf('/'),
            decodedUri.lastIndexOf(':')
        );
        
        let fileName = decodedUri.substring(lastSeparatorIndex + 1);
        
        fileName = fileName.split('?')[0];
        fileName = fileName.split('#')[0];
        
        return fileName;
    } catch (e) {
        console.error("Ошибка при получении имени файла:", e);
        return "unknown.kml"; 
    }
}

function convertGeomtetryTypeName(geometryType) {
  switch(geometryType) {
    case 'Point':
    case 'MultiPoint':
      return 'точечной';
    case 'LineString':
    case 'MultiLineString':
      return 'линейной';
    case 'Polygon':
    case 'MultiPolygon':
      return 'площадной';
    default: 
      return geometryType;
  }
}

async function addLayerWithLoading(newLayer) {
    try {
      const loading = new LoadScreen(0, '', () => {
        ons.notification.alert({ 
          title: 'Внимание', 
          message: 'Добавлен новый kml-слой.' 
        });
      });
      loading.startLoad();

      layers.push(newLayer);
      map.addLayer(newLayer);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updatingVectorList();

      loading.finishLoad();
        
    } catch (error) {
        console.error('Ошибка при добавлении слоя:', error);
        ons.notification.alert({ 
            title: 'Ошибка', 
            message: 'Не удалось добавить слой.' 
        });
    }
}

function waitForLayerReady(layer, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        function check() {
            if (layer.getSource().getState() === 'ready') {
                resolve();
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Layer loading timeout'));
            } else {
                setTimeout(check, 100);
            }
        }
        
        check();
    });
}