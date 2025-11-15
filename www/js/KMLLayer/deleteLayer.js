function deleteLayer(layerID) {
    const layer = findLayer(layerID);
    const fileUri = layer.get('fileUri');
    const fileName = fileUri.split('/').pop();

    Promise.all([
        deleteFile(fileUri),
        updateConfigFile(fileName)
    ]).then(() => {
        map.removeLayer(layer);

        layers = layers.filter(layer => layer.id !== layerID);

        updatingVectorList();
    }).catch(error => {
        console.log('Не удалось удалить файл: ' + layerID + ' ошибка: ' + error);
        ons.notification.alert({ title: 'Внимание', message: 'Не удалось удалить файл: ' + layerID });
    })
}

function deleteFile(filePath) {
    return new Promise((resolve, reject) => {
        window.resolveLocalFileSystemURL(filePath, (fileEntry) => {
            fileEntry.remove(
                () => resolve(), 
                (error) => reject(error) 
            );
        }, (error) => {
            reject(`Файл не найден: ${error.message}`);
        });
    });
}

// Вспомогательная функция для обновления конфига
function updateConfigFile(fileName) {
    const pathToConfig = root_directory + "config.xml";
    
    return readConfigFile(pathToConfig).then(data => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, 'application/xml');
        
        const storageNode = xmlDoc.querySelector('storage KML');
        if (!storageNode) {
            console.error('Тег <KML> не найден в конфигурационном файле.');
            return;
        }

        let kmlFilesNode = storageNode.querySelector('KMLFiles');
        if (!kmlFilesNode) return; // Если нет узла KMLFiles, ничего не делаем

        // Удаляем файл из списка
        const existingFiles = kmlFilesNode.textContent.split('|')
            .filter(file => file.trim() !== '' && file !== fileName);
        
        kmlFilesNode.textContent = existingFiles.join('|');

        // Сериализуем и сохраняем
        const serializer = new XMLSerializer();
        const updatedXml = serializer.serializeToString(xmlDoc);
        
        return writeConfigFile(pathToConfig, updatedXml);
    }).catch(error => {
        console.error('Ошибка при обновлении конфига:', error);
        throw error;
    });
}