function handleStyleUpdate(layer) {
    const fileUri = layer.get('fileUri');
    globalReadlFile(fileUri, (originalKMLContent) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(originalKMLContent, "application/xml");

        updateLayerStyleInKML(layer, xmlDoc);
        
        const serializer = new XMLSerializer();
        const updatedKML = serializer.serializeToString(xmlDoc);

        const path = pathToKMLStorage + '/';
        const fileName = layer.get('id');
        saveFile(path, fileName, updatedKML, () => {
            console.log('Успешное сохранение стиля в файл: ' + fileName);
        }, (error) => {
            ons.notification.alert({
                title:'Внимание',
                message:'Произошла ошибка при сохранение стиля.',
            });
        });
    });
}

function updateLayerStyleInKML(layer, xmlDoc) {
    const styleSettings = layer.styleSettings;
    const geometryType = layer.geometryType;
    if (!styleSettings) return;

    const styleId = layer.get('id') + '_style';
    
    // Удаляем старый стиль, если он существует
    const oldStyle = xmlDoc.querySelector(`Style[id="${styleId}"]`);
    if (oldStyle) {
        oldStyle.parentNode.removeChild(oldStyle);
    }
    
    // Создаем новый узел стиля
    const styleNode = xmlDoc.createElement('Style');
    styleNode.setAttribute('id', styleId);
    
    // Создаем ExtendedData для хранения параметров стиля
    const extendedData = xmlDoc.createElement('ExtendedData');
    
    // Добавляем параметры стиля
    const addStyleData = (name, value) => {
        const data = xmlDoc.createElement('Data');
        data.setAttribute('name', name);
        const valueNode = xmlDoc.createElement('value');
        valueNode.textContent = value;
        data.appendChild(valueNode);
        extendedData.appendChild(data);
    };

    switch (geometryType) {
        case 'Point':
        case 'MultiPoint':
            addStyleData('ol_style_shape', styleSettings.shape || 'circle');
            addStyleData('ol_style_radius', parseInt(styleSettings.size) || 10);
            addStyleData('ol_style_fill_color', styleSettings.color || '#000000');

            if (styleSettings.borderSize || styleSettings.borderColor) {
                addStyleData('ol_style_stroke_color', styleSettings.borderColor || '#000000');
                addStyleData('ol_style_stroke_width', parseInt(styleSettings.borderSize) || 1);
            } 
            break;
        
        case 'LineString':
        case 'MultiLineString':
            addStyleData('ol_style_pattern', styleSettings.pattern || 'solid');
            addStyleData('ol_style_color', styleSettings.color || '#000000');
            addStyleData('ol_style_width', parseInt(styleSettings.size) || 1);
            break;
        case 'Polygon':
        case 'MultiPolygon':
            addStyleData('ol_style_pattern', styleSettings.pattern || 'solid');
            addStyleData('ol_style_color', styleSettings.color || '#000000');
            addStyleData('ol_style_stroke_color', styleSettings.borderColor || '#000000');
            addStyleData('ol_style_stroke_width', parseInt(styleSettings.borderSize) || 1);
            break;
        default: break;

    }

    styleNode.appendChild(extendedData);

    // Добавляем стиль в документ
    const documentNode = xmlDoc.querySelector('Document') || xmlDoc.documentElement;
    documentNode.appendChild(styleNode);
    
    // Обновляем ссылки на стиль во всех Placemark
    updateStyleReferences(layer, xmlDoc, styleId);
}

/**
 * Обновляет ссылки на стиль во всех фичах слоя
 */
function updateStyleReferences(layer, xmlDoc, styleId) {
    const features = layer.getSource().getFeatures();
    
    features.forEach(feature => {
        const placemark = findPlacemarkForFeature(xmlDoc, feature);
        if (!placemark) return;
        
        // Удаляем старый styleUrl если есть
        const oldStyleUrl = placemark.querySelector('styleUrl');
        if (oldStyleUrl) {
            placemark.removeChild(oldStyleUrl);
        }
        
        // Добавляем новый styleUrl
        const styleUrl = xmlDoc.createElement('styleUrl');
        styleUrl.textContent = '#' + styleId;
        placemark.insertBefore(styleUrl, placemark.firstChild);
    });
}

function findPlacemarkForFeature(xmlDoc, feature) {
    const featureId = feature.get('ID');
    if (!featureId) return null;
    
    const placemarks = xmlDoc.querySelectorAll('Placemark');
    for (let i = 0; i < placemarks.length; i++) {
        const idNode = placemarks[i].querySelector('SimpleData[name="ID"]');
        if (idNode && idNode.textContent === featureId) {
            return placemarks[i];
        }
    }
    return null;
}