import KML from "ol/format/KML";
import { layers, map } from "../../legacy/globals";
import { Feature } from "ol";
import { requestToDBPromise } from "../../legacy/DBManage";
import { showAlert, showConfirm } from "../../store/modalDialog";

export async function exportKMLFromDB(layerId) {
    const layer = layers.find(l => l.id === layerId);
    
    if (!layer) {
        showAlert('Ошибка', `Слой не найден: ${layerId}`);
        return;
    }

    const format = new KML({
        showPointNames: true,
        writeStyles: true,
        extractStyles: true,
    });

    const whereClause = layer.whereClause ? ` WHERE ${layer.whereClause}` : '';
    const query = `SELECT * FROM ${layer.table}${whereClause}`;

    try {
        const data = await requestToDBPromise(query);

        if (!data.rows || data.rows.length === 0) {
            const response = await showConfirm('Экспорт в KML', 'Экспортируемый слой не содержит объектов(узлов). Все равно сформировать KML-файл?', 'Да', 'Нет');

            if (!response) return;
        }

        const exportedFeatures = [];
        
        for (let i = 0; i < data.rows.length; i++) {
            const row = data.rows.item(i);
            const props = {};
            
            for (let atrib of layer.atribs || []) {
                const value = row[atrib.name];
                
                if (atrib.type === 'DATE' && value && value !== "Invalid Date") {
                    const match = value.match(/(\d*)-(\d*)-(\d*)/);
                    if (match) {
                        const exportDateString = `${match[3]}.${match[2]}.${match[1]}`;
                        props[atrib.name] = exportDateString;
                    } else {
                        props[atrib.name] = value;
                    }
                } else if (typeof value === 'undefined') {
                    props[atrib.name] = '';
                } else {
                    props[atrib.name] = value;
                }
            }
            
            const dataId = layer.atribs && layer.atribs[0] ? row[layer.atribs[0].name] : row.ID;
            
            const feature = findFeatureByID(layer, dataId);
            
            if (feature) {
                const clonedFeature = feature.clone();
                
                for (const [key, value] of Object.entries(props)) {
                    clonedFeature.set(key, value);
                }
                
                const geometry = clonedFeature.getGeometry();
                if (geometry) {
                    geometry.transform(map.getView().getProjection(), 'EPSG:4326');
                }
                
                exportedFeatures.push(clonedFeature);
            } else {
                const emptyFeature = new Feature();
                emptyFeature.setProperties(props);
                exportedFeatures.push(emptyFeature);
            }
        }

        let kml = format.writeFeatures(exportedFeatures, {
            dataProjection: 'EPSG:4326',
        });

        kml = kml.replace(/,0/g, ",nan");
        kml = kml.replace(/<\/\w*>/g, '$&\n');
        kml = kml.replace(/\/>/g, '$&\n');
        kml = kml.replace(/\\\\/g, '\\');

        const fileName = layer.id + '.kml';

        const { filePath, canceled } = await electronAPI.showSaveDialog({
            title: 'Сохранить слой как KML',
            defaultPath: fileName,
            filters: [{ name: "KML Files", extensions: ["kml"] }]
        });

        if (canceled || !filePath) return;

        await electronAPI.writeFile(filePath, kml);

        showAlert('Успех', `Файл успешно сохранён: ${filePath}`);
    } catch (e) {
        console.error('Export error:', e);
        showAlert('Ошибка', `Не удалось сохранить слой: ${layerId}\n${String(e)}`);
    }
}

function findFeatureByID(layer, id) {
    const features = layer.getSource().getFeatures();
    return features.find(feature => {
        const featureId = feature.get('ID') || feature.id;
        return featureId == id;
    });
}