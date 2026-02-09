import { deleteLayerFromList, layers } from "../../legacy/globals";
import { root_directory } from "../../legacy/initial";
import { refreshFeatureTable } from "../../shared/refreshTable";
import { deleteLayerFromMap } from "../../shared/updateMapLayers";

export function deleteLayer(layerID) {
    const layer = layers.find(layer => layer.get('id') === layerID);
    const fileUri = layer.get('fileUri');
    const fileName = fileUri.split('/').pop();

    Promise.all([
        deleteFile(fileUri),
        updateConfigFile(fileName)
    ]).then(() => {
        deleteLayerFromMap(layer);
        deleteLayerFromList(layerID);
        refreshFeatureTable();
    }).catch(error => {
        console.log('Не удалось удалить файл: ' + layerID + ' ошибка: ' + error);
        window.alert('Не удалось удалить файл: ' + layerID);
    })
}

export async function deleteFile(filePath) {
    try {
        await electronAPI.deleteFile(filePath);
        return true;
    } catch (err) {
        throw new Error(`Ошибка удаления файла: ${err.message}`);
    }
}

async function updateConfigFile(fileName) {
    try {
        const pathToConfig = root_directory + "config.xml";
        const data = await electronAPI.readFile(pathToConfig);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, 'application/xml');

        const storageNode = xmlDoc.querySelector('storage KML');
        if (!storageNode) {
            console.error('Тег <KML> не найден в конфигурационном файле.');
            return;
        }

        let kmlFilesNode = storageNode.querySelector('KMLFiles');
        if (!kmlFilesNode) return;

        const existingFiles = kmlFilesNode.textContent.split('|')
            .filter(file => file.trim() !== '' && file !== fileName);

        kmlFilesNode.textContent = existingFiles.join('|');

        const serializer = new XMLSerializer();
        const updatedXml = serializer.serializeToString(xmlDoc);

        await electronAPI.writeFile(pathToConfig, updatedXml);
    } catch (error) {
        console.error('Ошибка при обновлении конфига:', error);
        throw error;
    };
}