function loadKMLLayerStyle(layer, kmlContent, geometryType = 'Point') {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlContent, "application/xml");
    
    const style = parseLayerStyleFromKML(layer, xmlDoc) ?? getDefaultKMLStyle(geometryType);
    if (style) {
        layer.setStyle(style);

        const features = layer.getSource().getFeatures();
        features.forEach((feature) => {
            feature.setStyle(style);
        });
    } 
}

function getDefaultKMLStyle(geometryType) {
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

    return style;
}

function parseLayerStyleFromKML(layer, xmlDoc) {
    const geometryType = layer.geometryType;
    const styleId = layer.get('id') + '_style';
    const styleNode = xmlDoc.querySelector(`Style[id="${styleId}"]`);

    if (!styleNode) {
        return null; // Стиль не найден
    }

    const extendedData = styleNode.querySelector('ExtendedData');
    if (!extendedData) {
        return null; // Нет данных о стиле
    }

    // Функция для получения значения параметра стиля
    const getStyleValue = (name) => {
        const data = extendedData.querySelector(`Data[name="${name}"]`);
        return data ? data.querySelector('value')?.textContent : null;
    };

    switch (geometryType) {
        case 'Point':
        case 'MultiPoint':
            return parsePointStyle();
        case 'LineString':
        case 'MultiLineString':
            return parseLineStyle();
        case 'Polygon':
        case 'MultiPolygon':
            return parsePolygonStyle();
        default: return;
    }

    function parsePointStyle() {
        const shape = getStyleValue('ol_style_shape') || 'circle';
        const radius = parseInt(getStyleValue('ol_style_radius')) || 10;
        const fillColor = getStyleValue('ol_style_fill_color') || '#000000';
        const strokeColor = getStyleValue('ol_style_stroke_color') || '#000000';
        const strokeWidth = parseInt(getStyleValue('ol_style_stroke_width')) || 1;

        // Вспомогательные параметры по умолчанию
        let points = 0;
        let radius2 = undefined;
        let angle = 0;

        // Определяем параметры в зависимости от типа фигуры
        switch (shape) {
            case 'circle':
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: radius,
                        fill: new ol.style.Fill({ color: fillColor }),
                        stroke: new ol.style.Stroke({
                            color: strokeColor,
                            width: strokeWidth
                        })
                    })
                });

            case 'square':
                points = 4;
                angle = Math.PI / 4; // квадрат без поворота
                break;

            case 'triangle':
                points = 3;
                angle = 0; // небольшой поворот для правильного отображения
                break;

            case 'star':
                points = 5;
                radius2 = radius / 2; // внутренний радиус звезды
                angle = Math.PI / 2; // центральная точка звезды
                break;

            default:
                // если неизвестная фигура — по умолчанию квадрат
                points = 4;
                angle = 0;
                break;
        }

        // Для всех фигур кроме circle создаём RegularShape
        return new ol.style.Style({
            image: new ol.style.RegularShape({
                points: points,
                radius: radius,
                radius2: radius2, // только для звезды
                angle: angle,
                fill: new ol.style.Fill({ color: fillColor }),
                stroke: new ol.style.Stroke({
                    color: strokeColor,
                    width: strokeWidth
                })
            })
        });
    }

    function parseLineStyle() {
        const pattern = getStyleValue('ol_style_pattern') || 'solid';
        const color = getStyleValue('ol_style_color') || '#000000';
        const width = parseInt(getStyleValue('ol_style_width')) || 1;

        // Создаем массив для lineDash в зависимости от типа линии
        let lineDash = null;
        if (pattern === 'dotted') {
            const dashLength = Math.max(2, width * 3);
            lineDash = [dashLength, dashLength];
        } 
        // Для 'solid' lineDash остается null

        return new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: color,
                width: width,
                lineDash: lineDash
            })
        });
    }

    function parsePolygonStyle() {
        const pattern = getStyleValue('ol_style_pattern') || 'solid';
        const fillColor = getStyleValue('ol_style_color') || '#000000';
        const strokeColor = getStyleValue('ol_style_stroke_color') || '#000000';
        const strokeWidth = parseInt(getStyleValue('ol_style_stroke_width')) || 1;

        // Создаем массив для lineDash в зависимости от типа линии
        let lineDash = null;
        if (pattern === 'dotted') {
            const dashLength = Math.max(2, strokeWidth * 3);
            lineDash = [dashLength, dashLength];
        }
        // Для 'solid' lineDash остается null

        return new ol.style.Style({
            fill: new ol.style.Fill({
                color: fillColor
            }),
            stroke: new ol.style.Stroke({
                color: strokeColor,
                width: strokeWidth,
                lineDash: lineDash
            })
        });
    }
}

/**
 * Конвертирует строку цвета в формат, понятный OpenLayers
 */
function parseColor(colorStr) {
    if (!colorStr) return '#3399CC';
    
    // Если цвет уже в HEX формате
    if (/^#[0-9A-F]{6}$/i.test(colorStr)) {
        return colorStr;
    }
    
    // Если цвет в формате rgba(r,g,b,a)
    const rgbaMatch = colorStr.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d*))?\)$/);
    if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1]);
        const g = parseInt(rgbaMatch[2]);
        const b = parseInt(rgbaMatch[3]);
        const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
        return [r, g, b, a];
    }
    
    return '#3399CC'; // Значение по умолчанию
}