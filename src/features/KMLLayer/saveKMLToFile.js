import KML from "ol/format/KML";
import { layers } from "../../legacy/globals";

export async function saveKMLToFile(layerId) {
    const layer = layers.find(layer => layer.id === layerId);

    if (layer.getSource().getFeatures().length === 0) {
        const { response } = await electronAPI.showMessageBox({
            type: 'question',
            buttons: ['Да', 'Нет'],
            title: 'Сохранение KML-слоя',
            message: 'Экспортируемый слой не содержит объектов(узлов). Все равно сформировать KML-файл?',
            defaultId: 0,
            cancelId: 1
        });

        if (response !== 0) return;
    }

    const kmlType = layer.get('kmlType');

    const { filePath, canceled } = await electronAPI.showSaveDialog({
        title: 'Сохранить слой как KML',
        defaultPath: `${layerId}.kml`,
        filters: [{ name: "KML Files", extensions: ["kml"] }]
    });

    if (canceled || !filePath) return;

    try {
        let kmlContent = '';

        if (kmlType) {
            const fileUri = layer.get('fileUri');
            kmlContent = await electronAPI.readFile(fileUri, 'utf-8');
        } else {
            const format = new KML();
            kmlContent = format.writeFeatures(layer.getSource().getFeatures());
        }

        await electronAPI.writeFile(filePath, kmlContent);
        await electronAPI.showMessageBox({
            type: 'info',
            title: 'Успех',
            message: `Файл успешно сохранен: ${filePath}`
        });
    } catch (e) {
        await electronAPI.showMessageBox({
            type: 'error',
            title: 'Ошибка',
            message: `Не удалось сохранить слой: ${layerId}\n${String(e)}`
        });
    }
}
