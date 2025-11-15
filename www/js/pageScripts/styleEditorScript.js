function styleEditor(layer, callback) {
    const geometryType = layer.geometryType;
    const styleSettings = layer.styleSettings;

    const previewFeature = createPreviewFeature(geometryType);

    layer.getSource().addFeature(previewFeature);

    const layerVisibility = layer.getVisible();
    layer.setVisible(true);

    const previewMap = new ol.Map({
        target: 'style-preview-map',
        controls: [],
        interactions: [],
        layers: [layer],
    });

    const navigator = document.querySelector('#myNavigator');

    navigator.addEventListener('postpop', () => {
        layer.setVisible(layerVisibility);
    }, { once: true });

    previewMap.getView().fit(previewFeature.getGeometry().getExtent(), { padding: [1, 10, 30, 10] });
    if (geometryType === 'Polygon') {
        const currentZoom = previewMap.getView().getZoom();
        previewMap.getView().setZoom(currentZoom - 1);
    }

    const defaultStyle = getDefaultStyleFromLayer(layer);

    const stylePointUpdater = (() => {
        let currentStyle = defaultStyle;
        previewFeature.setStyle(currentStyle);
        let currentImage = defaultStyle.getImage();
        currentStyle.setImage(currentImage);
        let currentShape = styleSettings?.shape || 'circle';
        let currentBorderColor = '#000000';

        return {
            updateShape(shape) {
                if (shape === 'circle' && currentImage instanceof ol.style.Circle) return;

                if (shape === 'circle') {
                    currentImage = new ol.style.Circle({
                        radius: currentImage.getRadius(),
                        fill: currentImage.getFill(),
                        stroke: currentImage.getStroke()
                    });
                } else if (shape === 'square') {
                    currentImage = new ol.style.RegularShape({
                        points: 4,
                        radius: currentImage.getRadius(),
                        angle: Math.PI / 4,
                        fill: currentImage.getFill(),
                        stroke: currentImage.getStroke()
                    });
                } else if (shape === 'triangle') {
                    currentImage = new ol.style.RegularShape({
                        points: 3,
                        radius: currentImage.getRadius(),
                        angle: 0,
                        fill: currentImage.getFill(),
                        stroke: currentImage.getStroke()
                    });
                }

                currentStyle.setImage(currentImage);
                previewFeature.setStyle(currentStyle);
                currentShape = shape;
            },

            updateSize(size) {
                if (currentShape === 'circle') {
                    currentImage.setRadius(size);
                } else {
                    if (currentShape === 'square') {
                        currentImage = new ol.style.RegularShape({
                            points: 4,
                            radius: size,
                            angle: Math.PI / 4,
                            fill: currentImage.getFill(),
                            stroke: currentImage.getStroke()
                        });
                    } else if (currentShape === 'triangle') {
                        currentImage = new ol.style.RegularShape({
                            points: 3,
                            radius: size,
                            angle: 0,
                            fill: currentImage.getFill(),
                            stroke: currentImage.getStroke()
                        });
                    }
                    currentStyle.setImage(currentImage);
                }
                previewFeature.setStyle(currentStyle);
            },

            updateColor(color) {
                currentImage.getFill().setColor(color);
                previewFeature.setStyle(currentStyle);
            },

            updateBorderColor(color) {
                let stroke = currentImage.getStroke();
                if (stroke) {
                    stroke.setColor(color);
                    currentImage.setStroke(stroke);
                }
                currentBorderColor = color;
                currentStyle.setImage(currentImage);
                previewFeature.setStyle(currentStyle);
            },

            updateBorderSize(width) {
                let stroke = currentImage.getStroke();
                if (stroke) {
                    stroke.setWidth(width);
                } else {
                    stroke = new ol.style.Stroke({ width, color: currentBorderColor });
                }
                if (width) {
                    currentImage.setStroke(stroke);
                } else {
                    currentImage.setStroke(null);
                }
                currentStyle.setImage(currentImage);
                previewFeature.setStyle(currentStyle);
            }
        };
    })();

    const styleLineUpdater = (() => {
        const currentStyle = defaultStyle;
        previewFeature.setStyle(currentStyle);
        const DASH_RATIO = 3;

        return {
            updatePattern(pattern) {
                const stroke = currentStyle.getStroke();
                const width = stroke.getWidth();
                if (pattern === 'dotted') {
                    const dashLength = Math.max(2, width * DASH_RATIO);
                    stroke.setLineDash([dashLength, dashLength]);
                } else {
                    stroke.setLineDash(null);
                }
                currentStyle.setStroke(stroke);
                previewFeature.setStyle(currentStyle);
            },

            updateSize(size) {
                const stroke = currentStyle.getStroke();

                if (stroke.getLineDash()) {
                    const dashLength = Math.max(2, size * DASH_RATIO);
                    stroke.setLineDash([dashLength, dashLength]);
                }

                stroke.setWidth(size);
                currentStyle.setStroke(stroke);
                previewFeature.setStyle(currentStyle);
            },

            updateColor(color) {
                const stroke = currentStyle.getStroke();
                stroke.setColor(color);
                currentStyle.setStroke(stroke);
                previewFeature.setStyle(currentStyle);
            }
        }
    })();

    const stylePolygonUpdater = (() => {
        const currentStyle = defaultStyle;
        previewFeature.setStyle(currentStyle);
        let lastBorderColor = '#000000';
        let lastBorderPattern = 'solid';
        const DASH_RATIO = 3;

        return {
            updateColor(color) {
                const fill = currentStyle.getFill();
                fill.setColor(color);
                currentStyle.setFill(fill);
                previewFeature.setStyle(currentStyle);
            },

            updatePattern(pattern) {
                const stroke = currentStyle.getStroke();
                lastBorderPattern = pattern;
                
                if (stroke.getWidth() === 0) return;
                
                if (pattern === 'dotted') {
                    const dashLength = Math.max(2, stroke.getWidth() * DASH_RATIO);
                    stroke.setLineDash([dashLength, dashLength]);
                } else {
                    stroke.setLineDash(null);
                }
                
                currentStyle.setStroke(stroke);
                previewFeature.setStyle(currentStyle);
            },

            updateBorderSize(size) {
                const stroke = currentStyle.getStroke();
                const newSize = parseInt(size) || 0;
                
                if (newSize === 0) {
                    // При размере 0 просто отключаем границу
                    stroke.setWidth(0);
                    currentStyle.setStroke(null);
                } else {
                    // Восстанавливаем предыдущие значения при включении
                    stroke.setWidth(newSize);
                    stroke.setColor(lastBorderColor);
                    
                    if (lastBorderPattern === 'dotted') {
                        const dashLength = Math.max(2, newSize * DASH_RATIO);
                        stroke.setLineDash([dashLength, dashLength]);
                    } else {
                        stroke.setLineDash(null);
                    }

                    currentStyle.setStroke(stroke);
                }
            
                previewFeature.setStyle(currentStyle);
            },

            updateBorderColor(color) {
                const stroke = currentStyle.getStroke();
                lastBorderColor = color;
                
                // Обновляем цвет только если граница включена
                if (stroke.getWidth() > 0) {
                    stroke.setColor(color);
                    currentStyle.setStroke(stroke);
                    previewFeature.setStyle(currentStyle);
                }
            },
        }
    })();


    switch (geometryType) {
        case 'Point':
         case 'MultiPoint':
            createPointEditor();
            break;
        case 'LineString':
          case 'MultiLineString':
            createLineStringEditor();
            break;
        case 'Polygon':
        case 'Multipolygon':
            createPolygonEditor();
            break;
        default:
            break;
    }

    setTimeout(() => {

        switch (geometryType) {
            case 'Point':
            case 'MultiPoint':
                initPointStyleEditor();
                break;
            case 'LineString':
            case 'MultiLineString':
                initLineStyleEditor()
                break;
            case 'Polygon':
            case 'MultiPolygon':
                initPolygonStyleEditor();
                break;
            default: break;
        }

        const saveButton = document.getElementById('saveLayerStyle');
        saveButton.addEventListener('click', () => saveStyle(layer, geometryType, callback));

        const cancelButton = document.getElementById('backButtonStyleEditor');
        cancelButton.addEventListener('click', () => closeStylePage(callback));
    
        const backButton = document.getElementById('style-editor-back-button');
        backButton.addEventListener('click', () => closeStylePage(callback));
    }, 0);

    function initPointStyleEditor () {
        applyDefaultPointStyleValues(defaultStyle);

        const selectElement = document.getElementById('style-select-shape');
        const event = new Event('change', { bubbles: true });
        selectElement.dispatchEvent(event);

        document.getElementById('style-select-shape')?.addEventListener('change', (e) => {
            stylePointUpdater.updateShape(e.target.value);
        });

        document.getElementById('style-input-size')?.addEventListener('change', (e) => {
            stylePointUpdater.updateSize(parseInt(e.target.value) ?? 10);
        });

        document.getElementById('color-input')?.addEventListener('change', (e) => {
            stylePointUpdater.updateColor(e.target.value);
        });

        document.getElementById('style-input-border')?.addEventListener('change', (e) => {
            stylePointUpdater.updateBorderSize(parseInt(e.target.value) ?? 0);
        });

        document.getElementById('border-color-input')?.addEventListener('change', (e) => {
            stylePointUpdater.updateBorderColor(e.target.value);
        });
    }

    function initLineStyleEditor() {
        applyDefaultLineStyleValues(defaultStyle);

        const selectElement = document.getElementById('style-select-pattern');
        const event = new Event('change', { bubbles: true });
        selectElement.dispatchEvent(event);

        document.getElementById('style-select-pattern')?.addEventListener('change', (e) => {
            styleLineUpdater.updatePattern(e.target.value);
        });

        document.getElementById('style-input-size')?.addEventListener('change', (e) => {
            styleLineUpdater.updateSize(parseInt(e.target.value) ?? 1);
        });

        document.getElementById('color-input')?.addEventListener('change', (e) => {
            styleLineUpdater.updateColor(e.target.value);
        });
    }

    function initPolygonStyleEditor() {
        applyDefaultPolygonStyleValues(defaultStyle);

        const selectElement = document.getElementById('style-select-pattern');
        const event = new Event('change', { bubbles: true });
        selectElement.dispatchEvent(event);

        document.getElementById('color-input')?.addEventListener('change', (e) => {
            stylePolygonUpdater.updateColor(e.target.value);
        });

        document.getElementById('style-select-pattern')?.addEventListener('change', (e) => {
            stylePolygonUpdater.updatePattern(e.target.value);
        });

        document.getElementById('style-input-border')?.addEventListener('change', (e) => {
            stylePolygonUpdater.updateBorderSize(parseInt(e.target.value) || 1);
        });

        document.getElementById('border-color-input')?.addEventListener('change', (e) => {
            stylePolygonUpdater.updateBorderColor(e.target.value);
        });
    }


    function saveStyle(layer, geometryType, callback) {
        const style = previewFeature.getStyle();
        let styleSettings;
        switch (geometryType) {
            case 'Point':
            case 'MultiPoint':
                styleSettings = getPointStyleSettings();
                break;
            case 'LineString':
            case 'MultiLineString':
                styleSettings = getLineStyleSettings();
                break;
            case 'Polygon':
            case 'MultiPolygon':
                styleSettings = getPolygonStyleSettings();
                break;
            default: break;
        }

        const features = layer.getSource().getFeatures();
        if (features.length > 0) {
            features.forEach(feature => {
                feature.setStyle(style);
            });
        }

        layer.setStyle(style);

        layer.styleSettings = styleSettings;
        
        layer.getSource().changed();

        handleStyleUpdate(layer);

        closeStylePage(callback);
    }

    function closeStylePage(callback) {
        layer.getSource().removeFeature(previewFeature);
        previewMap.removeLayer(layer);
        previewMap.renderSync();

        const navigator = document.querySelector('#myNavigator');
        navigator.popPage({ times: 1 });
        callback?.();
    }
}

function getDefaultStyleFromLayer(layer, geometryType) {
    const features = layer.getSource().getFeatures();
    if (features.length > 0) {
        const feature = features[0];
        const featureStyle = feature.getStyle()?.clone() || layer.getStyle()?.clone();
        if (!featureStyle) {
            switch (geometryType) {
                case 'Point': return createDefaultPointStyle();
                case 'LineString': return createDefaultLineStyle();
                case 'Polygon': return createDefaultPolygonStyle();
                default: return null;
            }
        }
        return feature.getStyle().clone() || layer.getStyle().clone();
    }
    switch (geometryType) {
        case 'Point': return createDefaultPointStyle();
        case 'LineString': return createDefaultLineStyle();
        case 'Polygon': return createDefaultPolygonStyle();
        default: return null;
    };
}

function createDefaultPointStyle() {
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 10,
            fill: new ol.style.Fill({
                color: '#3399CC'
            }),
            stroke: new ol.style.Stroke({
                color: '#FFFFFF',
                width: 2
            })
        })
    });
}

function createDefaultLineStyle() {
    return new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#000000',
            width: 1,
        })
    })
}

function createDefaultPolygonStyle() {
    return new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#000000',
            width: 1,
        }),
        fill: new ol.style.Fill({
            color: '#000000',
        })
    })
}

function applyDefaultPointStyleValues(style) {
    if (!style) return;

    const image = style.getImage();
    if (!image) return;

    let shapeType = 'circle';
    if (image instanceof ol.style.RegularShape) {
        if (image.getPoints() === 3) shapeType = 'triangle';
        else if (image.getPoints() === 4) shapeType = 'square';
    }

    const shapeSelect = document.getElementById('style-select-shape');
    if (shapeSelect) shapeSelect.value = shapeType;

    const sizeInput = document.getElementById('style-input-size');
    if (sizeInput) {
        sizeInput.value = image.getRadius() || 10;
        const event = new Event('change', { bubbles: true });
        sizeInput.dispatchEvent(event);
    }

    const colorInput = document.getElementById('color-input');
    if (colorInput && image.getFill()) {
        const fillColor = olColorToHex(image.getFill().getColor());
        colorInput.value = fillColor;
    }

    const borderSizeInput = document.getElementById('style-input-border');
    if (borderSizeInput && image.getStroke()) {
        borderSizeInput.value = image.getStroke().getWidth() || 2;
    }
    if (borderSizeInput) {
        const event = new Event('change', { bubbles: true });
        borderSizeInput.dispatchEvent(event);
    }

    const borderColorInput = document.getElementById('border-color-input');
    if (borderColorInput && image.getStroke()) {
        const strokeColor = olColorToHex(image.getStroke().getColor()) || '#000000';
        borderColorInput.value = strokeColor;
    } else if (borderColorInput) {
        borderColorInput.value = '#000000';
    }

    const preview = document.getElementById('point-color-preview');
    if (preview && image.getFill()) {
        preview.setAttribute('fill', image.getFill().getColor() || '#000000');
    }

    const previewBorder = document.getElementById('point-border-color-preview');
    if (previewBorder && image.getStroke()) {
        previewBorder.setAttribute('fill', image.getStroke().getColor() || '#000000');
    }
}

function applyDefaultLineStyleValues(style) {
    if (!style) return;

    const stroke = style.getStroke();
    if (!stroke) return;

    const lineDash = stroke.getLineDash();
    let patternType = 'solid';
    if (lineDash && lineDash.length > 0) {
        patternType = 'dotted';
    }

    const patternSelect = document.getElementById('style-select-pattern');
    if (patternSelect) patternSelect.value = patternType;

    const sizeInput = document.getElementById('style-input-size');
    if (sizeInput) {
        sizeInput.value = stroke.getWidth() || 1;
        const event = new Event('change', { bubbles: true });
        sizeInput.dispatchEvent(event);
    }

    const colorInput = document.getElementById('color-input');
    if (colorInput) {
        const strokeColor = olColorToHex(stroke.getColor());
        colorInput.value = strokeColor || '#000000';
        
        const preview = document.getElementById('point-color-preview');
        if (preview) {
            preview.setAttribute('fill', stroke.getColor() || '#000000');
        }
    }
}

function applyDefaultPolygonStyleValues(style) {
    if (!style) return;

    // Получаем стили заливки и обводки
    const fill = style.getFill();
    const stroke = style.getStroke();

    // Устанавливаем цвет заливки
    const colorInput = document.getElementById('color-input');
    if (colorInput && fill) {
        const fillColor = olColorToHex(fill.getColor()) || '#000000';
        colorInput.value = fillColor;
        
        // Обновляем превью цвета
        const preview = document.getElementById('point-color-preview');
        if (preview) {
            preview.setAttribute('fill', fillColor);
        }
    }

    // Устанавливаем тип штриховки (solid/dotted)
    const patternSelect = document.getElementById('style-select-pattern');
    if (patternSelect && stroke) {
        const lineDash = stroke.getLineDash();
        const patternType = (lineDash && lineDash.length > 0) ? 'dotted' : 'solid';
        patternSelect.value = patternType;
    }

    // Устанавливаем толщину обводки
    const borderSizeInput = document.getElementById('style-input-border');
    if (borderSizeInput && stroke) {
        borderSizeInput.value = stroke.getWidth() || 1;
        const event = new Event('change', { bubbles: true });
        borderSizeInput.dispatchEvent(event);
    }

    // Устанавливаем цвет обводки
    const borderColorInput = document.getElementById('border-color-input');
    if (borderColorInput && stroke) {
        const strokeColor = olColorToHex(stroke.getColor()) || '#000000';
        borderColorInput.value = strokeColor;
        
        // Обновляем превью цвета обводки
        const previewBorder = document.getElementById('point-border-color-preview');
        if (previewBorder) {
            previewBorder.setAttribute('fill', strokeColor);
        }
    } else if (borderColorInput) {
        borderColorInput.value = '#000000';
    }
}

function handleClickStyleShape(_) {
    const dict = { 'circle': 'Круг', 'square': 'Квадрат', 'triangle': 'Треугольник' };
    const selected = document.getElementById('style-select-shape').value;
    createModalSelect(dict, 'style-select-shape', selected, false);
}

function handleClickStylePattern(_) {
    const dict = { 'solid': 'Сплошная', 'dotted': 'Пунктирная', };
    const selected = document.getElementById('style-select-pattern').value;
    createModalSelect(dict, 'style-select-pattern', selected, false);
}

function handleEditStyleShape(event) {
    const shapes = {
        triangle: '<polygon points="100,20 180,180 20,180" fill="#000000"/>',
        circle: '<circle cx="100" cy="100" r="80" fill="#000000"/>',
        square: '<rect x="30" y="30" width="140" height="140" fill="#000000"/>'
    };

    const value = event.target.value;
    const icon = document.getElementById('style-select-icon');

    icon.innerHTML = shapes[value];
}

function handleEditStylePattern(event) {
    const patterns = {
        solid: '<line x1="20" y1="100" x2="180" y2="100" stroke="#000000" stroke-width="8"/>',
        dotted: '<line x1="20" y1="100" x2="180" y2="100" stroke="#000000" stroke-width="6" stroke-dasharray="12,6"/>'
    };

    const value = event.target.value;
    const icon = document.getElementById('style-select-icon');

    icon.innerHTML = patterns[value];
}

function createPreviewFeature(geometryType) {
    switch (geometryType) {
        case 'Point':
        case 'MultiPoint':
            return new ol.Feature({
                geometry: new ol.geom.Point([0, 0]),
            });
        case 'LineString':
        case 'MultiLineString':
            return new ol.Feature({
                geometry: new ol.geom.LineString([[-1, 0], [1, 0]]),
            });
        case 'Polygon':
        case 'MultiPolygon':
            return new ol.Feature({
                geometry: new ol.geom.Polygon([[
                    [-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]
                ]]),
            });
    }
}

function createPointEditor() {
    const template = document.querySelector('#point-editor');
    const cloneNode = template.content.cloneNode(true);
    document.querySelector('#style-editor-content').appendChild(cloneNode);
}

function createLineStringEditor() {
    const template = document.querySelector('#line-editor');
    const cloneNode = template.content.cloneNode(true);
    document.querySelector('#style-editor-content').appendChild(cloneNode); 
}

function createPolygonEditor() {
    const template = document.querySelector('#polygon-editor');
    const cloneNode = template.content.cloneNode(true);
    document.querySelector('#style-editor-content').appendChild(cloneNode);
}

function decrementInput(inputId, min = 0) {
    const input = document.getElementById(inputId);
    const value = parseInt(input.value);
    if (value > min) {
        input.value = value - 1;
        const event = new Event('change', { 'bubbles': true });
        input.dispatchEvent(event);
    }
}

function incrementInput(inputId, max = 100) {
    const input = document.getElementById(inputId);
    const value = parseInt(input.value);
    if (value < max) {
        input.value = value + 1;
        const event = new Event('change', { 'bubbles': true });
        input.dispatchEvent(event);
    }
}

function handleCustomInput(event, inputId, incrementControlId, decrementControlId, min = 0, max = 100) {
    const value = parseInt(event.target.value);

    if (value < min) {
        const input = document.getElementById(inputId);
        input.value = min;
    }

    if (value > max) {
        const input = document.getElementById(inputId);
        input.value = max;
    }

    const incrementControl = document.getElementById(incrementControlId);
    const decrementControl = document.getElementById(decrementControlId);

    if (value <= min) {
        decrementControl.classList.add('disabled');
    } else if (decrementControl.classList.contains('disabled')) {
        decrementControl.classList.remove('disabled');
    }

    if (value >= max) {
        incrementControl.classList.add('disabled');
    } else if (incrementControl.classList.contains('disabled')) {
        incrementControl.classList.remove('disabled');
    }
}

function handleColorInput(event, colorInputId, previewId) {
    event.preventDefault();
    const input = document.getElementById(colorInputId);
    const color = input.value || '#000000';

    cordova.plugins.colorPicker.showDialog({ 
        color,
    }, (result) => {
        input.value = result.color;
        const preview = document.getElementById(previewId);
        preview.setAttribute('fill', result.color);

        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
    }, (error) => {
        console.log(`Something went wrong: ${error}`);
    });
}

function getPointStyleSettings() {
    const shape = document.getElementById('style-select-shape')?.value;
    const size = document.getElementById('style-input-size')?.value;
    const color = document.getElementById('color-input')?.value;
    const borderSize = document.getElementById('style-input-border')?.value;
    const borderColor = document.getElementById('border-color-input')?.value;

    return { shape, size, color, borderSize, borderColor };
}

function getLineStyleSettings() {
    const pattern = document.getElementById('style-select-pattern')?.value;
    const size = document.getElementById('style-input-size')?.value;
    const color = document.getElementById('color-input')?.value;

    return { pattern, size, color };
}

function getPolygonStyleSettings() {
    const color = document.getElementById('color-input')?.value;
    const pattern = document.getElementById('style-select-pattern')?.value;
    const borderSize = document.getElementById('style-input-border')?.value;
    const borderColor = document.getElementById('border-color-input')?.value;

    return { color, pattern, borderSize, borderColor };
}

function olColorToHex(color) {
    if (!color) return '#000000';
    
    // Если цвет уже в HEX-формате
    if (typeof color === 'string' && color.startsWith('#')) {
        return color.length === 7 ? color : '#000000';
    }
    
    // Если цвет в формате rgba(r, g, b, a)
    if (typeof color === 'string' && color.startsWith('rgba(')) {
        const parts = color.match(/[\d.]+/g);
        if (parts && parts.length >= 3) {
            return rgbToHex(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
        }
    }
    
    // Если цвет как массив [r, g, b, a]
    if (Array.isArray(color)) {
        return rgbToHex(color[0], color[1], color[2]);
    }
    
    return '#000000';
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function showColorPicker(inputId, previewId) {
    const input = document.getElementById(inputId);
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = input.value || '#000000';
    
    colorInput.addEventListener('change', () => {
        input.value = colorInput.value;
        const preview = document.getElementById(previewId);
        if (preview) preview.setAttribute('fill', colorInput.value);
        
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
    });
    
    colorInput.click();
}