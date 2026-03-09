import KML from "ol/format/KML";
import { map } from "../../legacy/globals";
import { showAlert } from "../../store/modalDialog.js";

export async function exportSelectedFeaturesToKML(layer, featureIds) {
    if (!layer || !featureIds || featureIds.length === 0) {
        await showAlert('Предупреждение', 'Не выбраны объекты для экспорта');
        return;
    }

    const format = new KML({
        showPointNames: true,
        writeStyles: true,
    });

    try {
        const source = layer.getSource();
        const allFeatures = source.getFeatures();
        
        // Находим выбранные объекты
        const selectedFeatures = allFeatures.filter(feature => 
            featureIds.includes(feature.id)
        );

        if (selectedFeatures.length === 0) {
            await showAlert('Предупреждение', 'Выбранные объекты не найдены на карте');
            return;
        }

        const exportedFeatures = [];
        
        for (const feature of selectedFeatures) {
            const clonedFeature = feature.clone();
            
            // Трансформируем геометрию в WGS84 для KML
            const geometry = clonedFeature.getGeometry();
            if (geometry) {
                geometry.transform(map.getView().getProjection(), 'EPSG:4326');
            }
            
            exportedFeatures.push(clonedFeature);
        }

        let kml = format.writeFeatures(exportedFeatures, {
            dataProjection: 'EPSG:4326',
        });

        // Форматирование KML
        kml = kml.replace(/,0/g, ",nan");
        kml = kml.replace(/<\/\w*>/g, '$&\n');
        kml = kml.replace(/\/>/g, '$&\n');
        kml = kml.replace(/\\\\/g, '\\');

        const fileName = `${layer.id}_selected_${selectedFeatures.length}.kml`;

        const { filePath, canceled } = await electronAPI.showSaveDialog({
            title: 'Сохранить выбранные объекты как KML',
            defaultPath: fileName,
            filters: [{ name: "KML Files", extensions: ["kml"] }]
        });

        if (canceled || !filePath) return;

        await electronAPI.writeFile(filePath, kml);
        
        await showAlert(
            'Успех',
            `Экспортировано объектов: ${selectedFeatures.length}\nФайл сохранён: ${filePath}`
        );
        
    } catch (e) {
        console.error('Export error:', e);
        await showAlert('Ошибка', `Не удалось экспортировать объекты\n${String(e)}`);
    }
}