function exportKML(layerID){
    let layer = findLayer(layerID);
    let format = new ol.format.KML({
        showPointNames: true,
        writeStyles: true,
    });
    let features = layer.getSource().getFeatures();
    const exportedFeatures = [];
    const query = `SELECT * FROM ${layer.id}`;
    requestToDB(query, async function(data){

        if(data.rows.length === 0){
            const userAnswer = await ons.notification.confirm({
                title: 'Экспорт в KML',
                message: 'Экспортируемый слой не содержит объектов(узлов). Все равно сформировать KML-файл?',
                buttonLabels: ["Да", "Нет"],
            });
            if(userAnswer) return;
        }

        // Сбор данных для экспорта
        for(let i = 0; i < data.rows.length; i++){
            const props = {};
            for(let atrib of layer.atribs){
                const value = data.rows.item(i)[atrib.name];
                if(atrib.type === 'DATE' && typeof value !== 'undefined' && value !== "Invalid Date"){
                    const match = value.match(/(\d*)-(\d*)-(\d*)/);
                    const exportDateString = `${match[3]}.${match[2]}.${match[1]}`;
                    prop[atrib.name] = exportDateString;
                }
                else if(typeof value === 'undefined')
                    props[atrib.name] = '';
                else
                    props[atrib.name] = value;
            }
            const dataId = data.rows.item(i)[layer.atribs[0].name];
            const feature = findFeatureByID(layer, dataId);
            if(feature){
                const clonedFeature = feature.clone();
                clonedFeature.setProperties(props);
                clonedFeature.getGeometry().transform('EPSG:3857', 'EPSG:4326');
                exportedFeatures.push(clonedFeature);
            }
            else {
                const feature = new ol.Feature();
                feature.setProperties(props);
                exportedFeatures.push(feature);
            }
        }

        let kml = format.writeFeatures(exportedFeatures, {
            dataProjection: 'EPSG:4236',
            featureProjection: 'EPSG:3857'
        });

        kml = kml.replace(/,0/g, ",nan");
        kml = kml.replace(/<\/\w*>/g, '$&\n');
        kml = kml.replace(/\/>/g, '$&\n');
        kml = kml.replace(/\\\\/g, '\\');

        const fileName = layer.id + '.kml';

        cordova.plugins.safMediastore.saveFile({ 
            data: toBase64(kml),
            filename: fileName,
            folder: 'Documents',
        }).then(newFileUri => {
            ons.notification.alert({ 
                title:"Внимание", 
                messageHTML:'<p class="notification-alert">Файл успешно сохранён: ' + newFileUri + '</p>',
            });
        }).catch(e => {
            ons.notification.alert({ 
                title: 'Внимание',
                message: 'Не удалось сохранить слой: ' + layerId,
            });
        });
    });
}

async function importKML(layerID, dict, features){
    let layer = findLayer(layerID);

    const sourceNumberOfFeatures = features.length;

    features = features.filter(feature => {
        try{
            return typeof feature.getGeometry() !== 'undefined' &&
             feature.getGeometry() && feature.getGeometry().getCoordinates();
        }
        catch(e){
            return false;
        }
    });

    let acceptedNumberOfFeatures = 0;

    let textFinishingLoading = 'Импорт KML завершён.';

    function completeLoading(){
        if(sourceNumberOfFeatures !== acceptedNumberOfFeatures){
            textFinishingLoading += `Не все объекты были загружены.\
             Загружено объектов ${acceptedNumberOfFeatures} из ${sourceNumberOfFeatures}.`
        }
        ons.notification.alert({title: 'Окончание импорта KML', message: textFinishingLoading});
    }

    let loading = new LoadScreen(features.length, textFinishingLoading, completeLoading);
    loading.startLoad()

    let featureMaxID;

    let permissionToUpdateFeatures = -1;
   
    for(let i = 0; i < features.length; i++){
        let feature = features[i];
        if(compareGeometryTypes(layer.geometryType, feature.getGeometry().getType()) == 0){
            convertFeatureToLayerGeometry(feature, layer);
        }

        let props;
        props = filterProperties(feature.getProperties(), dict, layer)

        let feature_id = props[dict[layer.atribs[0].name]]

        if(typeof feature_id == 'undefined'){
            if(typeof featureMaxID == 'undefined'){
                featureMaxID = await autonumericID(layer.atribs[0].name, layer)
                feature_id = featureMaxID
            }
            else{
                featureMaxID++;
                feature_id = featureMaxID
            }
            props['id'] = feature_id
            dict['id'] = 'id'
        }

        let query = `SELECT COUNT(1) as bool FROM ${layer.id} WHERE ${layer.atribs[0].name} = ${feature_id};`
        const intersection = await new Promise((resolve, reject) => { 
            requestToDB(query, (data) => {
                resolve(data.rows.item(0).bool);
            }, (er) => {
                reject(er);
                ons.notification.alert({title:"Ошибка", message: 'Нет доступа к базе данных.'});
            });
        });

        if(intersection == 1){
            if(permissionToUpdateFeatures === -1){
                const userAnswer = await ons.notification.confirm({
                    title: 'Обновление объектов',
                    message: permissionToUpdateFeaturesMessage,
                    buttonLabels: ["Нет", "Да"]
                });
                if(userAnswer){
                    permissionToUpdateFeatures = 1;
                    updateFeaturesFromKML();
                } else {
                    permissionToUpdateFeatures = 0;
                    loading.elementLoaded();
                    continue;  
                }
            } else if(permissionToUpdateFeatures) {
                updateFeaturesFromKML();
            } else {
                loading.elementLoaded();
                continue; 
            }

            function updateFeaturesFromKML(){
                let updates = [];
                const atribNames = [];
                const values = [];
                for(let key in dict){
                    if(typeof dict[key] == 'undefined' ||
                        dict[key] == '' || typeof props[dict[key]] == 'undefined' ||
                        key == 'ID')
                        continue;
                    updates.push(`${key} = '${props[dict[key]]}'`);
                    atribNames.push(key);
                    values.push(props[dict[key]]);
                }

                let geom = feature.getGeometry()
                geom.transform('EPSG:4326', 'EPSG:3857')

                const format = new ol.format.WKT()
                let feautureString = format.writeFeature(feature)
                feautureString = convertToGeometryType(feautureString, layer.geometryType)
                updates.push(`Geometry = GeomFromText('${feautureString}', 3857)`)
                query = `UPDATE ${layer.id } SET ${updates.join(', ')} WHERE ${layer.atribs[0].name} = ${feature_id} `;
                requestToDB(query, function(res){
                    for(let old_feature of layer.getSource().getFeatures()){
                        if(old_feature.id == feature_id){
                            old_feature.setGeometry(feature.getGeometry());
                            saveDB();

                            const typeIndex = atribNames.indexOf(layer.styleTypeColumn);
                            if(typeIndex >= 0)
                                old_feature.type = values[typeIndex];
                            
                            const labelIndex = atribNames.indexOf(layer.labelColumn);
                            if(labelIndex >= 0)
                                old_feature.label = values[labelIndex];

                            acceptedNumberOfFeatures += 1;
                            loading.elementLoaded();
                            break;
                        }
                    }
                })
            }
        }
        else{
            let atribNames = []
            let atribValues = []
            const values = []
            for(let key in dict){
                if(typeof dict[key] == 'undefined' || dict[key] === '' ||
                    typeof props[dict[key]] == 'undefined')
                    continue;
                atribNames.push(key)
                atribValues.push(`'${props[dict[key]]}'`)
                values.push(props[dict[key]]);
            }

            let geom = feature.getGeometry()
            geom.transform('EPSG:4326', 'EPSG:3857')
            const format = new ol.format.WKT()
            let feautureString = format.writeFeature(feature)
            feautureString = convertToGeometryType(feautureString, layer.geometryType)
            let query = `
                INSERT INTO ${layer.id} (${atribNames.join(', ')}, Geometry)
                VALUES (${atribValues.join(',')}, GeomFromText('${feautureString}', 3857));
            ;`
            requestToDB(query, function(res){
                feature.id = feature_id;
                feature.layerID = layer.id;

                const typeIndex = atribNames.indexOf(layer.styleTypeColumn);
                if(typeIndex >= 0)
                    feature.type = values[typeIndex];
                else 
                    feature.type = 'default';
                const labelIndex = atribNames.indexOf(layer.labelColumn);
                if(labelIndex >= 0)
                    feature.label = values[labelIndex];

                feature.setStyle(layer.getStyle());
                layer.getSource().addFeature(feature);
                saveDB();
                acceptedNumberOfFeatures += 1;
                loading.elementLoaded();
              })       
        }
    }

    function convertToGeometryType(inp_string, type){
        let l_brackets = '((';
        let r_brackets = '))';
        if(type === "MULTIPOLYGON"){
            l_brackets = '(((';
            r_brackets = ')))';
        }
        inp_string = inp_string.replace(/\(+/g, l_brackets)
        inp_string = inp_string.replace(/\)+/g, r_brackets)
        if(inp_string.search('MULTI') == -1)
            return insert(inp_string, 'MULTI')
        return inp_string
    }

}


function compareGeometryTypes(first, second){
    first = first.toLowerCase()
    second = second.toLowerCase()
    first = first.replace('multi', '')
    second = second.replace('multi', '')
    if(first == second)
        return 1
    return 0
}

function convertFeatureToLayerGeometry(feature, layer){
    let new_geom;
    switch(layer.geometryType){
        case "MULTIPOINT":
            new_geom = new ol.geom.Point(feature.getGeometry().getFirstCoordinate())
            break;
        case "MULTIPOLYGON":
            if(feature.getGeometry().getType().search('Point') > -1){
                new_geom = ol.geom.Polygon.circular(feature.getGeometry().getFirstCoordinate(), 1)
            }
            else{
                let geom = feature.getGeometry();
                let first_coord = geom.getFirstCoordinate();
                geom.appendCoordinate(first_coord);
                let string_coords = geom.getCoordinates().toString().split(',');
                let int_coords = string_coords.map((v) => {return parseFloat(v)});
                let main_array = [];
                let outer_contour = [];
                const number_of_points = int_coords.length / 3;
                for(let i = 0; i < number_of_points; i++){
                    let point = [];
                    for(let j = 0; j < 3; j++)
                        point.push(int_coords[i*3 + j]);
                    outer_contour.push(point);
                }
                main_array.push(outer_contour);
                new_geom = new ol.geom.Polygon(main_array);
            }
            break;
        case "MULTILINESTRING":
            console.log(feature.getGeometry().getType());
            if(feature.getGeometry().getType().search('Point') > -1){
                let first = feature.getGeometry().getFirstCoordinate()
                let second = feature.getGeometry().getFirstCoordinate()
                ol.coordinate.add(second, [0.000001, 0.000001])
                new_geom = new ol.geom.LineString([first, second])
            }
            else{
                const linearRing = feature.getGeometry().getLinearRing();
                console.log(linearRing.getCoordinates())
                new_geom = new ol.geom.LineString(linearRing.getCoordinates()) //feature.getGeometry().getCoordinates())
            }
            break;
    }
    feature.setGeometry(new_geom)
}

function filterProperties(values, dict, layer){
    let result = {};
    let is_error_in_kml = false;
    let error_message = {};
    for(let key in values){
        if(typeof values[key] === 'undefined') continue;
        result[key.toLowerCase()] = values[key].toString();
    }
    for(let key in dict){
        if(dict[key] === '' || typeof result[dict[key]] === 'undefined') continue;
        let atrib = getAtribByName(layer.atribs, key)
        if(atrib.type == 'DOUBLE'){
            result[dict[key]] = result[dict[key]].replace(/[^-0-9.]/g, '')
        }
        if(atrib.type == 'DATE'){
            let date_string = result[dict[key]];
            let date;
            let pattern = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/;
            if(date_string.search(pattern) === 0){
                date = date_string.replace(pattern,'$3-$2-$1');
            }
            else{
                date = new Date(date_string);
            }
            if(!date instanceof Date && !isNaN(date.valueOf())){
                date  = '';
                error_message[dict[key]] = "Некорректная дата";
                is_error_in_kml = true;
            }
            if(date.toString() === 'Invalid Date'){
                date = '';
            }
            result[dict[key]] = date;
        }
        /*if(atrib.type == 'ENUM'){
            if(Object.keys(atrib.options).indexOf(result[dict[key]]) === -1){
                result[dict[key]]  = '';
                is_error_in_kml = true;
            }
        }*/
        if(atrib.type == 'BOOLEAN'){
            if(['true', 'false'].indexOf(result[dict[key]]) == -1){
                error_message[dict[key]] = "Неккоректное значение";
                is_error_in_kml = true;
            }
        }
    }
    if(is_error_in_kml){
        ons.notification.alert({title:"Внимание", message:`Ошибка в импортируемом KML.
                 Возможно неккоректное отображение данных`});
    }
    return result;
}