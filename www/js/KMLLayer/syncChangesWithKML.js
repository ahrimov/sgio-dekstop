// Функция для синхронизации изменений в KML
function syncChangesWithKML(layerId, succes, onError) {
    const layer = findLayer(layerId);
    const fileUri = layer.get('fileUri');
    const features = layer.getSource().getFeatures();
    globalReadlFile(fileUri, (originalKMLContent) => {
            // 1. Парсим исходный KML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(originalKMLContent, "application/xml");

        if (features.length) {
            ensureGeometryTypeInSchema(xmlDoc, features[0].getGeometry().getType());
        }

        // 2. Создаем словарь для быстрого поиска <Placemark> по ID
        const placemarks = {};
        const placemarkNodes = xmlDoc.querySelectorAll('Placemark');
        placemarkNodes.forEach(placemark => {
            const id = placemark.querySelector('SimpleData[name="ID"]')?.textContent;
            if (id) {
                placemarks[id] = placemark;
            }
        });

        // 3. Обновляем данные в XML на основе измененных features
        features.forEach(feature => {
            const featureId = feature.get('ID'); // Предполагается, что ID есть у каждого feature
            const placemark = placemarks[featureId];

            if (placemark) {
                // Обновляем атрибуты
                const properties = feature.getProperties();
                Object.entries(properties).forEach(([key, value]) => {
                    if (key === 'geometry') return; // Пропускаем геометрию

                    // Ищем существующий тег SimpleData
                    const simpleData = placemark.querySelector(`SimpleData[name="${key}"]`);

                    if (simpleData) {
                        // Если тег существует, обновляем его значение
                        simpleData.textContent = String(value);
                    } else {
                        // Если тега нет, создаем новый
                        const newSimpleData = xmlDoc.createElement('SimpleData');
                        newSimpleData.setAttribute('name', key);
                        newSimpleData.textContent = String(value);

                        // Находим SchemaData и добавляем новый тег SimpleData
                        const schemaData = placemark.querySelector('SchemaData');
                        if (schemaData) {
                            schemaData.appendChild(newSimpleData);
                        } else {
                            console.warn(`Не найден тег SchemaData для Placemark с ID ${featureId}.`);
                        }
                    }
                });

                // Обновляем геометрию
                const geometry = feature.getGeometry();
                if (geometry) {
                    const geometryType = geometry.getType();

                    // Удаляем старую геометрию
                    const oldGeometryNode = placemark.querySelector('Point, LineString, Polygon');
                    if (oldGeometryNode) {
                        oldGeometryNode.parentNode.removeChild(oldGeometryNode);
                    }

                    // Добавляем новую геометрию
                    let newGeometryNode;
                    if (geometryType === 'Point') {
                        newGeometryNode = createPointGeometry(geometry, xmlDoc);
                    } else if (geometryType === 'LineString') {
                        newGeometryNode = createLineStringGeometry(geometry, xmlDoc);
                    } else if (geometryType === 'Polygon') {
                        newGeometryNode = createPolygonGeometry(geometry, xmlDoc);
                    }

                    if (newGeometryNode) {
                        placemark.appendChild(newGeometryNode);
                    }
                }
            }
        });

        // 4. Удаляем Placemarks, которые были удалены
        features.forEach(feature => {
            const featureId = feature.get('ID');
            if (!featureId) return;

            const placemark = placemarks[featureId];
            if (placemark && feature.deleted) {
                placemark.parentNode.removeChild(placemark);
                layer.getSource().removeFeature(feature);
            }
        });

        // 5. Добавляем новые Placemarks
        features.forEach(feature => {
            if (feature.isNew) {
                const newPlacemark = createPlacemarkFromFeature(layerId, feature, xmlDoc);
                const folder = xmlDoc.querySelector('Folder');
                if (folder) {
                    folder.appendChild(newPlacemark);
                    feature.isNew = false;
                }
            }
        });

        // 6. Возвращаем обновленный KML
        const serializer = new XMLSerializer();
        const newKMLContent = serializer.serializeToString(xmlDoc);

        const path = pathToKMLStorage + '/';
        const fileName = layerId;
        saveFile(path, fileName, newKMLContent, () => {
            console.log('Успешное сохранение данных в файл: ' + fileName);
            if (succes) succes();
        }, (error) => {
            ons.notification.alert({
                title:'Внимание',
                message:'Произошла ошибка при сохранение данных.',
            });
            if (onError) onError(error);
        });
    });
}

// Функция для создания нового <Placemark> из Feature
function createPlacemarkFromFeature(layerId, feature, xmlDoc) {
    const placemark = xmlDoc.createElement('Placemark');

    // Добавляем имя и описание
    const name = xmlDoc.createElement('name');
    name.textContent = feature.get('name') || '';
    placemark.appendChild(name);

    const description = xmlDoc.createElement('description');
    description.textContent = feature.get('description') || '';
    placemark.appendChild(description);

    // Добавляем ExtendedData
    const extendedData = xmlDoc.createElement('ExtendedData');
    const schemaData = xmlDoc.createElement('SchemaData');
    schemaData.setAttribute('schemaUrl', layerId);

    const properties = feature.getProperties();
    Object.entries(properties).forEach(([key, value]) => {
        if (key === 'geometry') return; // Пропускаем геометрию

        const simpleData = xmlDoc.createElement('SimpleData');
        simpleData.setAttribute('name', key);
        simpleData.textContent = String(value);
        schemaData.appendChild(simpleData);
    });

    extendedData.appendChild(schemaData);
    placemark.appendChild(extendedData);

    // Добавляем геометрию
    const geometry = feature.getGeometry();
    if (geometry) {
        const geometryType = geometry.getType();
        let geometryNode;

        if (geometryType === 'Point') {
            geometryNode = createPointGeometry(geometry, xmlDoc);
        } else if (geometryType === 'LineString') {
            geometryNode = createLineStringGeometry(geometry, xmlDoc);
        } else if (geometryType === 'Polygon') {
            geometryNode = createPolygonGeometry(geometry, xmlDoc);
        }

        if (geometryNode) {
            placemark.appendChild(geometryNode);
        }
    }

    return placemark;
}

// Функция для создания <Point>
function createPointGeometry(geometry, xmlDoc) {
    const point = xmlDoc.createElement('Point');
    const coordinates = xmlDoc.createElement('coordinates');
    const geomCoordinates = geometry.getCoordinates();
    const lonLat = ol.proj.toLonLat(geomCoordinates); // Преобразуем координаты в [lon, lat]
    coordinates.textContent = `${lonLat[0]},${lonLat[1]}`;
    point.appendChild(coordinates);
    return point;
}

// Функция для создания <LineString>
function createLineStringGeometry(geometry, xmlDoc) {
    const lineString = xmlDoc.createElement('LineString');
    const coordinates = xmlDoc.createElement('coordinates');
    const geomCoordinates = geometry.getCoordinates();
    const lonLatCoordinates = geomCoordinates.map(coord => ol.proj.toLonLat(coord));
    coordinates.textContent = lonLatCoordinates.map(coord => `${coord[0]},${coord[1]}`).join(' ');
    lineString.appendChild(coordinates);
    return lineString;
}

// Функция для создания <Polygon>
function createPolygonGeometry(geometry, xmlDoc) {
    const polygon = xmlDoc.createElement('Polygon');
    const outerBoundaryIs = xmlDoc.createElement('outerBoundaryIs');
    const linearRing = xmlDoc.createElement('LinearRing');
    const coordinates = xmlDoc.createElement('coordinates');

    const geomCoordinates = geometry.getCoordinates()[0]; // Берем внешний контур
    const lonLatCoordinates = geomCoordinates.map(coord => ol.proj.toLonLat(coord));
    coordinates.textContent = lonLatCoordinates.map(coord => `${coord[0]},${coord[1]}`).join(' ');

    linearRing.appendChild(coordinates);
    outerBoundaryIs.appendChild(linearRing);
    polygon.appendChild(outerBoundaryIs);
    return polygon;
}

function ensureGeometryTypeInSchema(xmlDoc, geometryType) {
    const schema = xmlDoc.querySelector('Schema');
    if (!schema) return;

    // Проверяем, есть ли уже поле geometryType
    const hasGeometryType = Array.from(schema.querySelectorAll('SimpleField'))
        .some(field => field.getAttribute('name') === 'geometryType');

    if (!hasGeometryType) {
        const geometryTypeField = xmlDoc.createElement('SimpleField');
        geometryTypeField.setAttribute('name', 'geometryType');
        geometryTypeField.setAttribute('type', 'string');

        geometryTypeField.setAttribute('actualType', geometryType);
        schema.appendChild(geometryTypeField);
    }
}