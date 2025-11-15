async function saveKMLToFile(layerId) {
    const layer = findLayer(layerId);

    if (layer.getSource().getFeatures().length === 0){
        const userAnswer = await ons.notification.confirm({
            title: 'Сохранение KML-слоя',
            message: 'Экспортируемый слой не содержит объектов(узлов). Все равно сформировать KML-файл?',
            buttonLabels: ["Да", "Нет"],
        });
        if (userAnswer) return;
    }

    const kmlType = layer.get('kmlType');
    if (kmlType) {
        const fileUri = layer.get('fileUri');

        globalReadlFile(fileUri, (KMLContent) => {
            cordova.plugins.safMediastore.saveFile({ 
                data: toBase64(KMLContent),
                filename: layerId,
                folder: 'Documents',
            }).then(newFileUri => {
                console.log('Успешное сохранение файла: ', newFileUri);
            }).catch(e => {
                ons.notification.alert({ 
                    title: 'Внимание',
                    message: 'Не удалось сохранить слой: ' + layerId,
                });
            })
        });
    } else {
        const format = new ol.format.KML();
        const kmlContent = format.writeFeatures(layer.getSource().getFeatures());

        cordova.plugins.safMediastore.saveFile({ 
            data: toBase64(kmlContent),
            filename: layerId,
            folder: 'Documents',
        }).then(newFileUri => {
            console.log('Успешное сохранение файла: ', newFileUri);
        }).catch(e => {
            ons.notification.alert({ 
                title: 'Внимание',
                message: 'Не удалось сохранить слой: ' + layerId,
            });
        })
    }
}