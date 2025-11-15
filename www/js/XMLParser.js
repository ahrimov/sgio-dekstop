function configParser(data, title){
    var parser = new DOMParser();
    var dom = parser.parseFromString(data, "application/xml");
    var pathToLayers = dom.getElementsByTagName("PathToLayers").item(0).textContent;
    var layersName = dom.getElementsByTagName("LayersName").item(0).textContent.split("|").filter(el => Boolean(el));

    if (!completeLoad.finishCounter) completeLoad.finishCounter = 0;
    completeLoad.finishCounter += layersName.length;

    if (updateAppMode) {
        updateVectorLayers(pathToLayers, function(){
            for(let layerName of layersName){
                console.log(root_directory + pathToLayers + layerName);
                openFile(root_directory + pathToLayers + layerName, layerParser);
            }
        });
    }
    else {
        for(let layerName of layersName){
            openFile(root_directory + pathToLayers + layerName, layerParser);
        }
    }

    var nameDB = dom.getElementsByTagName("NameDB").item(0).textContent;
    var filenameDB = dom.getElementsByTagName("FilenameDB").item(0).textContent;
    var pathToDB = dom.getElementsByTagName("PathToDB").item(0).textContent;
    initialDB(root_directory + pathToDB, filenameDB, nameDB);
    const centerLong = parseFloat(dom.getElementsByTagName("longitude").item(0).textContent);
    const centerLat = parseFloat(dom.getElementsByTagName("latitude").item(0).textContent);
    const minZoom = parseInt(dom.getElementsByTagName("MinZoom").item(0).textContent);
    const maxZoom = parseInt(dom.getElementsByTagName("MaxZoom").item(0).textContent);
    const zoom = parseInt(dom.getElementsByTagName("zoom").item(0).textContent);
    currentMapView = new ol.View({
        center: ol.proj.fromLonLat([centerLong, centerLat]),
        zoom: zoom,
        minZoom: minZoom,
        maxZoom: maxZoom,
        projectin: `EPSG:4326`
    });

    const pathToBaseRasterLayers = dom.getElementsByTagName("PathToBaseRasterLayers")?.item(0)?.textContent;
    if(typeof pathToBaseRasterLayers !== "undefined"){
        openFile(root_directory + pathToBaseRasterLayers, function(text){
            try{
                const jsonArray = JSON.parse(text);
                baseRasterLayers = parseBaseRasterLayers(jsonArray);
            } catch(e){
                ons.notification.alert({
                    title:"Внимание", 
                    messageHTML:`<p class="notification-alert">Некорректный json-файл: ${pathToBaseRasterLayers} </p>`
                });
            }
        }, true);
    }

    pathToImageStorage = dom.getElementsByTagName("PathToImageStorage").item(0).textContent
    pathToKMLStorage = dom.getElementsByTagName("PathToKMLStorage").item(0).textContent
    if(typeof dom.getElementsByTagName("NumberNodesOnMap").item(0).textContent != "undefined"){
        numberNodesOnMap = dom.getElementsByTagName("NumberNodesOnMap").item(0).textContent;
    } 

    addExistingKMLLayers();

    async function layerParser(data,title){
        if(typeof layerParser.counter == 'undefined'){
            layerParser.counter = 0
        }

        const parser = new DOMParser();
        const dom = parser.parseFromString(data, "application/xml");;
        if (dom.getElementsByTagName('parsererror').item(0)) {
            const errorMessage = dom.querySelector('parsererror div').textContent;
            console.log(errorMessage);
            ons.notification.alert({
                title: 'Внимание',
                 messageHTML:`<p class="notification-alert">Некорректный xml-файл: ${title}. Ошибка: ${errorMessage} </p>`,
            });
            layerParser.counter++;
            return;
        }
        
        const geometryType = dom.getElementsByTagName("geometry").item(0).textContent;
        let styles = {};
        switch(geometryType){
            case "MULTIPOINT":
                try{
                    styles = await pointStyleParse(dom);
                } catch(e) {
                    styles = { 
                        'default': new ol.style.Style({
                            image: new ol.style.Circle({
                                fill: new ol.style.Fill({color: generateColor()}),
                                radius: 3
                            }),
                            text: new ol.style.Text({
                                fill: new ol.style.Fill({color: '#000000'})
                            })
                        })
                    };
                }
                break;
            case "MULTIPOLYGON":
                try{
                    styles = polygonStyleParse(dom);
                }
                catch(e){
                    styles = {
                        'default': new ol.style.Style({
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
                        })
                    };
                }
                break;
            case "MULTILINESTRING":
                try{
                    styles = lineStyleParse(dom);
                } catch(e){
                    styles = {
                        'default': new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: generateColor(),
                                width: 2
                            }),
                            text: new ol.style.Text({
                                fill: new ol.style.Fill({color: '#000000'})
                            })
                        })
                    };
                }
                break;
            default:
                styles = {
                    'default': new ol.style.Style({
                        image: new ol.style.Circle({
                            fill: new ol.style.Fill({color: generateColor()}),
                            radius: 3
                        }),
                        text: new ol.style.Text({
                            fill: new ol.style.Fill({color: '#000000'})
                        })
                    })
                };
        }

        if(styles['UNKNOWN']) styles['default'] = styles['UNKNOWN'];

        const layer = new ol.layer.Vector({
            renderMode: 'image',
            declutter: true,
        }); 

        layer.setStyle(function(feature){

            let featureStyle;
            const atribs = layer.atribs;
            const type = feature.type || 'default';
            if(type !== 'UNKNOWN' && styles[type] !== void 0 && styles[type]){
                featureStyle = styles[type];
            }
            else {
                if(styles['default'] === void 0)
                    featureStyle = styles['default_old'];
                else
                    featureStyle = styles['default'];
            }
            const mapZoom = map.getView().getZoom();
            if(!map.localMap && ((!map.draw && !map.modify) || (map.draw?.currentFeature !== feature && map.modify?.modifyFeature !== feature))){
                let zoomMin = getZoomFromMeters(featureStyle.zoomMin, map);
                if(isNaN(zoomMin)) zoomMin = 0;
                let zoomMax = getZoomFromMeters(featureStyle.zoomMax, map);
                if(isNaN(zoomMax)) zoomMax = Infinity;
                if(mapZoom < zoomMin || mapZoom > zoomMax){
                    return new ol.style.Style({});
                }
            }
            featureStyle = featureStyle.clone();
            const geometryType = feature.getGeometry().getType();
            if(feature.label && 
                !((geometryType === 'MultiLineString' || geometryType === 'LineString') && mapZoom >= 19)
                ){
                const featureLabelStyle = featureStyle.getText();
                featureLabelStyle.setText(feature.label);
                featureStyle.setText(featureLabelStyle);
            }
            return featureStyle;
        });

        layer.set("id", dom.getElementsByTagName("id").item(0).textContent);
        layer.set("descr", dom.getElementsByTagName("label").item(0).textContent);
        layer.id = dom.getElementsByTagName("id").item(0).textContent;
        layer.label = dom.getElementsByTagName("label").item(0).textContent;
        layer.geometryType = geometryType;

        let layerZoomMin = parseFloat(dom.getElementsByTagName('zoomMax').item(0)?.textContent);
        let layerZoomMax = parseFloat(dom.getElementsByTagName('zoomMin').item(0)?.textContent);
        layerZoomMin = getZoomFromMeters(layerZoomMin, map);
        layerZoomMax = getZoomFromMeters(layerZoomMax, map);
        if(isNaN(layerZoomMin)) layerZoomMin = 0;
        if(isNaN(layerZoomMax)) layerZoomMax = Infinity;
        layer.setMinZoom(layerZoomMin);
        layer.setMaxZoom(layerZoomMax);

        layer.atribs = [];
        var atribs = dom.getElementsByTagName("attribute");
        for(atrib of atribs){
                let atribName = atrib.getElementsByTagName('id').item(0).textContent;
                let label = atrib.getElementsByTagName('label').item(0).textContent;
                const tagVisible = atrib.getElementsByTagName('visible').item(0);
                const visible = tagVisible ? (tagVisible.textContent === 'true') : true;
                let type = atrib.getAttribute('type');
                if(type == 'ENUM'){
                    let options = parseEnum(atrib.getElementsByTagName('options').item(0).textContent);
                    layer.atribs.push(new LayerAtribs(atribName, label, type, visible, options));
                }
                else
                    layer.atribs.push(new LayerAtribs(atribName, label, type, visible));
        }

        const styleTypeColumn = dom.getElementsByTagName('StyleTypeColumn').item(0)?.textContent || 'type_cl';
        const labelColumn = dom.getElementsByTagName('LabelColumn').item(0)?.textContent || 'none';
        layer.styleTypeColumn = styleTypeColumn;
        layer.labelColumn = labelColumn;

        layer.minZoom = parseFloat(dom.getElementsByTagName('zoomMax').item(0)?.textContent);
        layer.maxZoom = parseFloat(dom.getElementsByTagName('zoomMin').item(0)?.textContent);

        let enabled = true;
        if(typeof dom.getElementsByTagName("layerDb").item(0) != "undefined"){
            let enabled_string = dom.getElementsByTagName("layerDb").item(0).getAttribute('enabled');
            if(enabled_string === "false"){
                enabled = false;
            }
        }
        layer.enabled = enabled;
        
        layerParser.counter++;

        for(let i in layersName){
            if(layersName[i] === title){
                layer.setZIndex(minZIndexForVectorLayers + layersName.length - i);
            }
        }

        layers.push(layer);
        getDataLayerFromBD(layer);
        layer.visible = true;
    }
}


async function pointStyleParse(dom){
    const styles = {};

    const geometryStyle = dom.getElementsByTagName('geometryStyle').item(0);
    if(geometryStyle){
        styles['default_old'] = parsePointStyleOld(geometryStyle);
    }

    const domStylesContainer = dom.getElementsByTagName('styles').item(0);
    if(!domStylesContainer)
        return styles;

    const domStyles = domStylesContainer.getElementsByTagName('Style');

    for(let i = 0; i < domStyles.length; i++){
        const domStyle = domStyles.item(i);
        const value = domStyle.getElementsByTagName('value').item(0)?.textContent || 'default';
        styles[value] = await parsePointDekstopStyle(domStyle);
    }

    return styles;

    async function parsePointDekstopStyle(domStyle){
        
        const style = new ol.style.Style({});

        style.zoomMin = parseFloat(domStyle.getElementsByTagName('zoomMax').item(0)?.textContent);
        style.zoomMax = parseFloat(domStyle.getElementsByTagName('zoomMin').item(0)?.textContent);

        const iconStyle = domStyle.getElementsByTagName('IconStyle').item(0);
        if(iconStyle){
            const imageSize = iconStyle.getElementsByTagName('size').item(0)?.textContent || 16;
            let href = iconStyle.getElementsByTagName('href').item(0)?.textContent;
            if(!href){
                const color = convertColorToHEX(iconStyle.getElementsByTagName('color').item(0)?.textContent || generateColor());
                const form = iconStyle.getElementsByTagName('form').item(0)?.textContent || 'circle';
                const fill = new ol.style.Fill({color: color});
                const outline = parseInt(iconStyle.getElementsByTagName('outline').item(0)?.textContent);
                let stroke;
                if(outline){
                    const lineStyle = domStyle.getElementsByTagName('LineStyle').item(0);
                    if(lineStyle){
                        const lineColor = convertColorToHEX(lineStyle.getElementsByTagName('color').item(0)?.textContent|| '#000000');
                        const width = parseInt(lineStyle.getElementsByTagName('width').item(0)?.textContent) || 1;
                        stroke = new ol.style.Stroke({
                            color: lineColor,
                            width: width,
                        });
                    }
                }
                const image = createImageStyleByForm(form, fill, imageSize, stroke);
                style.setImage(image);
            }
            else {
                let imageSize = iconStyle.getElementsByTagName('size').item(0)?.textContent || 16;
                href = href.replace('Public', '');
                const icon = await new Promise((resolve, reject) => {
                    window.resolveLocalFileSystemURL(cordova.file.applicationDirectory + "www/resources/images/" + href, (fileEntry) => {
                        const img = new Image();
                        img.onload = function() {
                            const scaleX = imageSize / this.width;
                            const scaleY = imageSize / this.height;
                            const scale = scaleX < scaleY ? scaleX : scaleY;
                            resolve(new ol.style.Icon({
                                    src: fileEntry.toInternalURL(),
                                    scale: scale,
                                })
                            );
                        };
                        img.src = fileEntry.toInternalURL();
                    }, (e) => {
                        console.log('Error while opening: ', href);
                        resolve(null);
                    });
                });
                if(!icon) return null;
                style.setImage(icon);
            }
        } else {
            // parse point style
            const defaultImage = new ol.style.Circle({
                fill: new ol.style.Fill({color: generateColor()}),
                radius: 3
            });
            style.setImage(defaultImage);
        }

        const labelStyle = labelStyleParse(domStyle);
        style.setText(labelStyle);

        return style;
    }

    function parsePointStyleOld(dom) {
        const fill = new ol.style.Fill({color: dom.getElementsByTagName("Fill").item(0).getElementsByTagName("CssParameter").item(0).textContent});
        const xmlStroke = dom.getElementsByTagName("Stroke").item(0);
        const stroke = new ol.style.Stroke({color:xmlStroke.getElementsByTagName("CssParameter").item(0).textContent, width:parseInt(xmlStroke.getElementsByTagName("CssParameter").item(1).textContent)});
        const size = parseInt(dom.getElementsByTagName("Size").item(0).textContent);
        const rotation = parseInt(dom.getElementsByTagName("Rotation").item(0).textContent);
        const style = new ol.style.Style({});
        const form = dom.getElementsByTagName("WellKnownName").item(0).textContent;
        const image = createImageStyleByForm(form, fill, size, stroke, rotation);
        style.setImage(image);
        const labelStyle = labelStyleParse(dom);
        style.setText(labelStyle);
        return style;
    } 
}

function createImageStyleByForm(form, fill, size, stroke = new ol.style.Stroke({}), rotation = 0){
    switch(form){
        case "square":
            return new ol.style.RegularShape({
                fill: fill,
                stroke: stroke,
                points: 4,
                radius: size,
                rotation: rotation,
                angle: Math.PI / 4,
            });
        case "triangle":
            return  new ol.style.RegularShape({
                fill: fill,
                stroke: stroke,
                points: 3,
                radius: size,
                rotation: rotation,
                angle: 0,
            });
        default:
            return new ol.style.Circle({
                fill: fill,
                stroke: stroke,
                radius: size,
                rotation: rotation,
            });
    }
}

function polygonStyleParse(dom){
    const styles = {};

    const geometryStyle = dom.getElementsByTagName('geometryStyle').item(0);
    if(geometryStyle){
        styles['default_old'] = parseLPolygonStyleOld(geometryStyle);
    }

    const domStylesContainer = dom.getElementsByTagName('styles').item(0);
    if(!domStylesContainer)
        return styles;

    const domStyles = domStylesContainer.getElementsByTagName('Style');

    for(let i = 0; i < domStyles.length; i++){
        const domStyle = domStyles.item(i);
        const value = domStyle.getElementsByTagName('value').item(0)?.textContent || 'default';
        styles[value] = parsePolygonDekstopStyle(domStyle);
    }    

    return styles;

    function parsePolygonDekstopStyle(domStyle){
        const style = new ol.style.Style({});

        style.zoomMin = parseFloat(domStyle.getElementsByTagName('zoomMax').item(0)?.textContent);
        style.zoomMax = parseFloat(domStyle.getElementsByTagName('zoomMin').item(0)?.textContent);

        const polyStyle = domStyle.getElementsByTagName('PolyStyle').item(0);
        const color = polyStyle.getElementsByTagName('color').item(0)?.textContent || '#000000';
        const fill = polyStyle.getElementsByTagName('fill').item(0)?.textContent || '0';
        const outline = polyStyle.getElementsByTagName('outline').item(0)?.textContent || '0';

        if(parseInt(outline)){
            const lineStyle = domStyle.getElementsByTagName('LineStyle').item(0);
            if(lineStyle){
                const lineColor = lineStyle.getElementsByTagName('color').item(0)?.textContent || '#000000';
                const width = lineStyle.getElementsByTagName('width').item(0)?.textContent || 1;
                style.setStroke(new ol.style.Stroke({
                    color: convertColorToHEX(lineColor),
                    width: width,
                }));
            }
        }

        if(parseInt(fill)){
            style.setFill(new ol.style.Fill({color: convertColorToHEX(color)}));
        }

        const labelStyle = labelStyleParse(domStyle);
        style.setText(labelStyle);

        return style;
    }

    function parseLPolygonStyleOld(dom){
        const style = new ol.style.Style({
            fill: new ol.style.Fill({
                color: dom.getElementsByTagName("CssParameter").item(0).textContent
            }),
            stroke: new ol.style.Stroke({
                color: dom.getElementsByTagName("CssParameter").item(1).textContent,
                width: parseInt(dom.getElementsByTagName("CssParameter").item(2).textContent)
            })
        });

        const labelStyle = labelStyleParse(dom);
        style.setText(labelStyle);

        return style;
    }
}

function lineStyleParse(dom){
    const styles = {};

    const geometryStyle = dom.getElementsByTagName('geometryStyle').item(0);
    if(geometryStyle){
        styles['default_old'] = parseLineStyleOld(geometryStyle);
    }

    const domStylesContainer = dom.getElementsByTagName('styles').item(0);
    if(!domStylesContainer)
        return styles;

    const domStyles = domStylesContainer.getElementsByTagName('Style');

    for(let i = 0; i < domStyles.length; i++){
        const domStyle = domStyles.item(i);
        const value = domStyle.getElementsByTagName('value').item(0)?.textContent || 'default';
        styles[value] = parseLineDekstopStyle(domStyle);
    }

    return styles;

    function parseLineDekstopStyle(domStyle){
        const style = new ol.style.Style({});

        style.zoomMin = parseFloat(domStyle.getElementsByTagName('zoomMax').item(0)?.textContent);
        style.zoomMax = parseFloat(domStyle.getElementsByTagName('zoomMin').item(0)?.textContent);

        const lineStyle = domStyle.getElementsByTagName('LineStyle').item(0);
        const color = lineStyle.getElementsByTagName('color').item(0).textContent;
        const width = lineStyle.getElementsByTagName('width').item(0).textContent;

        style.setStroke(new ol.style.Stroke({
            color: convertColorToHEX(color),
            width: width,
        }));

        const labelStyle = labelStyleParse(domStyle, 'line');
        style.setText(labelStyle);

        return style;
    }

    function parseLineStyleOld(dom){
        const style = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: dom.getElementsByTagName("CssParameter").item(0).textContent,
                width: parseInt(dom.getElementsByTagName("CssParameter").item(1).textContent)
            })
        });

        const labelStyle = labelStyleParse(dom, 'line');
        style.setText(labelStyle);

        return style;
    }
}

function parseZoomLevel(dom){
    let zoomMax = parseFloat(dom.getElementsByTagName('zoomMin').item(0)?.textContent);
    zoomMax = getZoomFromMeters(zoomMax, map);
    if(isNaN(zoomMax)) 
        zoomMax = Infinity;
    let zoomMin = parseFloat(dom.getElementsByTagName('zoomMax').item(0)?.textContent);
    zoomMin = getZoomFromMeters(zoomMin, map);
    if(isNaN(zoomMin)) 
        zoomMin = 0;
    return [zoomMin, zoomMax];
}

function labelStyleParse(dom, placement = 'point'){
    const defaultStyle = new ol.style.Text({
        fill: new ol.style.Fill({color: '#000000'}),
        offsetY: placement === 'line' ? -3 : -12,
        stroke: new ol.style.Stroke({
            color: '#ffffff',
            width: 3
        }),
        placement: placement,
        overflow: true,
        maxAngle: 360,
    });
    const labelStyleDom = dom.getElementsByTagName('LabelStyle')?.item(0);
    if(!labelStyleDom)
        return defaultStyle; 
    const color = labelStyleDom.getElementsByTagName('color')?.item(0)?.textContent || '#000000';
    const fontSize = labelStyleDom.getElementsByTagName('fontSize')?.item(0)?.textContent || '10';
    const bold = labelStyleDom.getElementsByTagName('bold')?.item(0)?.textContent === '1';
    const italic = labelStyleDom.getElementsByTagName('italic')?.item(0)?.textContent === '1';
    // const underline = labelStyleDom.getElementsByTagName('underline')?.item(0)?.textContent === '1';
    const fontFamily =  'sans-serif'; // labelStyleDom.getElementsByTagName('fontFamily')?.item(0)?.textContent;
    // const strokeStyleDom = labelStyleDom.getElementsByTagName('StrokeStyle')?.item(0);
    const strokeWidth = 3; // strokeStyleDom.getElementsByTagName('Width')?.item(0)?.textContent || 1;
    const strokeColor = '#ffffff'; // strokeStyleDom.getElementsByTagName('Color')?.item(0)?.textContent || '#ffffff';
    // const placement = labelStyleDom.getElementsByTagName('Placement')?.item(0)?.textContent || 'point';
    const repeat = 600;

    const font = (bold ? 'bold ' : '') + (italic ? 'italic ' : '') + fontSize + 'px ' + fontFamily;
    const labelStyle = new ol.style.Text({
        fill: new ol.style.Fill({color: convertColorToHEX(color)}),
        font: font,
        offsetY: -12, // (parseInt(strokeWidth) - 1) * (-50),
        stroke: new ol.style.Stroke({
            color: strokeColor,
            width: strokeWidth
        }),
        placement: placement,
        repeat: repeat,
        overflow: true,
    });

    labelStyle.zoomMin = parseFloat(labelStyleDom.getElementsByTagName('zoomMax').item(0)?.textContent);
    labelStyle.zoomMax = parseFloat(labelStyleDom.getElementsByTagName('zoomMin').item(0)?.textContent);;

    return labelStyle;
}


function parseEnum(options_string){
    let options_array = options_string.split('|');
    let options = {}
    for(let option_string of options_array){
  	    if(option_string === "") continue;
	    let key, value;
  	    if(option_string.search(/[^#]#[^#]/) != -1){
    	    let found = option_string.split('#');
      	    key = found[0];
      	    value = found[1];
        }
	    else{
    	    key = option_string;
      	    value = option_string;
        }
  	    options[key] = value;
    }
    return options;
}

function updateVectorLayers(pathToLayers, callback){
    let targetDirName = root_directory + pathToLayers;
    window.resolveLocalFileSystemURL(cordova.file.applicationDirectory,
        function(resourcesDir){
            resourcesDir.getDirectory('www/resources/Project/VectorLayers', {create: false}, getDirectoryWin, getDirectoryFail)
        }
    );

    function getDirectoryWin(directory){
        window.resolveLocalFileSystemURL(targetDirName,
            function(targetDir) {
                targetDir.removeRecursively(() => {
                    window.resolveLocalFileSystemURL(root_directory, function(root){
                        directory.copyTo(root, pathToLayers, copyWin, copyFail);
                    }, () => {
                        copyFail();
                    })
                }, () => { copyFail(); });
        }, function(){
            console.log('get vector fail')
            window.resolveLocalFileSystemURL(root_directory, function(root){
                directory.copyTo(root, pathToLayers, copyWin, copyFail);
            }, () => {
                ons.notification.alert({title:"Внимание", message:`Ошибка при обновлении файлов описания слоёв.
                Будут использоваться старые файлы описания.`});
                copyFail();
            })
        });
    }

    function getDirectoryFail(){
        ons.notification.alert({title:"Внимание", message:`Ошибка при обновлении файлов описания слоёв.
         Будут использоваться старые файлы описания.`});
         callback();
    }

    function copyWin(){
        callback();
    }

    function copyFail(){
        console.log('copy fail')    
         callback();
    }
}

function parseBaseRasterLayers(jsonArray){
    return jsonArray.map((json) => {
        let source;
        if(json.projection === 'EPSG:3395'){
            source = new ol.source.XYZ({
                projection: json.projection,
                url: json.useLocalTiles ? main_directory + json.local_path : json.remote_url,
                tileGrid: ol.tilegrid.createXYZ({
                    extent: [-20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244]
                }),
                tileSize: json.tileSize,
                cacheSize: 40,
            });
        }
        else{
            source = new ol.source.XYZ({
                projection: json.projection,
                url: json.useLocalTiles ? main_directory + json.local_path : json.remote_url,
                tileSize: json.tileSize,
                cacheSize: 40,
            });
        }
        if(json.useLocalTiles){
            source.setTileLoadFunction(tileLoadFunctionLocal);
        }
        if(json.id === 'Rosreestr'){
            rosreestr_url = json.remote_url;
            source.setTileUrlFunction(rosreetrUrlFunction);
        }
        return new ol.layer.Tile({
            id: json.id,
            descr: json.descr,
            visible: json.visible,
            zIndex: parseInt(json.order),
            icon: json.icon,
            maxZoom: 24,
            useLocalTiles: json.useLocalTiles,
            local_path: json.local_path,
            remote_url: json.remote_url,
            source: source
        });
    });
}

function readConfigFile(filePath) {
    return new Promise((resolve, reject) => {
        window.resolveLocalFileSystemURL(filePath, function (fileEntry) {
            fileEntry.file(function (file) {
                const reader = new FileReader();
                reader.onloadend = function () {
                    resolve(reader.result);
                };
                reader.onerror = reject;
                reader.readAsText(file);
            }, reject);
        }, reject);
    });
}

  // Функция для записи XML-файла
function writeConfigFile(filePath, content) {
    return new Promise((resolve, reject) => {
        window.resolveLocalFileSystemURL(filePath, function (fileEntry) {
            fileEntry.createWriter(function (fileWriter) {
                fileWriter.onwriteend = resolve;
                fileWriter.onerror = reject;
                const blob = new Blob([content], { type: 'text/xml' });
                fileWriter.write(blob);
            }, reject);
        }, reject);
    });
}