/**
 * Создание диалоговой формы для ручного ввода координат
 * feature - ol.Feature
 * successfulCallback - function
 * */
function createDialogManualEditGeometry(feature, successfulCallback = null){
    const layer = findLayer(feature.layerID);
    const geometry = feature.getGeometry();
    let coordinates = geometry?.getCoordinates() || [];
    let typeOfCoordinates = 'decimal';
    const geometryType = geometry?.getType() || layer.geometryType;
    if(geometryType === 'MultiLineString' || geometryType === 'MultiPolygon' || geometryType === 'Polygon'){
        coordinates = coordinates[0] ?? [];
        if(geometryType === 'MultiPolygon')
            coordinates = coordinates[0] ?? [];
    }
    ons.createElement('manualInputCoordinates', {append: true})
        .then(function(dialog){
            updateTableCoordinates();
            document.querySelector('#manual-edit-geometry-add-coordinate-button').addEventListener('click', () => {
                createDialogEditCoordinate([], typeOfCoordinates, (coordinate) => {
                    const newCoord = ol.proj.fromLonLat(coordinate, map.getView().getProjection());
                    if(isNaN(newCoord[0]) || isNaN(newCoord[1])) {
                        ons.notification.toast('Некорректный ввод. Отмена операции', {timeout: 1000, animation: "ascend"});
                        return;
                    }
                    coordinates.push(newCoord);
                    updateTableCoordinates();
                })
            });
            document.querySelector('#type-coordinatees-switcher-meters').addEventListener('change', () => {
                typeOfCoordinates = 'decimal';
                updateTableCoordinates();
            });
            document.querySelector('#type-coordinatees-switcher-degrees').addEventListener('change', () => {
                typeOfCoordinates = 'degrees';
                updateTableCoordinates();
            });
            document.querySelector('#edit-geometry-save-changes').addEventListener('click', () => {
                if(coordinates.length === 0 || 
                    geometryType === 'MultiLineString' && coordinates.length < 2 ||
                    geometryType === 'MultiPolygon' && coordinates.length < 3
                ){
                    ons.notification.alert({title: 'Ошибка', message: 'Неверное количество координат(узлов).'});
                    return;
                }
                updateFeatureGeometryFromTable(feature, coordinates, successfulCallback);
                hideDialog('manual-input-coordinates');
            });
            document.querySelector('#edit-geometry-cancel-changes').addEventListener('click', () => {
                hideDialog('manual-input-coordinates');
            });

            dialog.show();
        });

    function updateTableCoordinates(){
        const tableTbody = document.querySelector('.table-coordinates-tbody');
        tableTbody.innerHTML = '';
        const template = document.querySelector('#manualInputCoordinatesTable');
        for(let i in coordinates){ 
            const tableElement = template.content.cloneNode(true);
            const lonLatCoordinate = ol.proj.toLonLat(coordinates[i]);
            tableElement.querySelector('.numberOfCoordinate').textContent = parseInt(i) + 1;
            const lon = typeOfCoordinates === 'degrees' ? 
                transformDecimalToMinutesAndSeconds(lonLatCoordinate[0].toFixed(7)) : lonLatCoordinate[0].toFixed(7);
            const lat = typeOfCoordinates === 'degrees' ? 
                transformDecimalToMinutesAndSeconds(lonLatCoordinate[1].toFixed(7)) : lonLatCoordinate[1].toFixed(7);
            tableElement.querySelector('.longtitude').textContent = lon;
            tableElement.querySelector('.latitude').textContent = lat;
            tableElement.querySelector('.manual-input-coordinates-tr').addEventListener('click', () => {
                createDialogEditCoordinate(lonLatCoordinate, typeOfCoordinates, (coordinate) => {
                    const newCoord = ol.proj.fromLonLat(coordinate, map.getView().getProjection());
                    if(isNaN(newCoord[0]) || isNaN(newCoord[1])){
                        ons.notification.toast('Некорректный ввод. Отмена операции', {timeout: 1000, animation: "ascend"});
                        return;
                    }
                    coordinates[i] = newCoord;
                    updateTableCoordinates();
                });
            });
            tableElement.querySelector('.delete-button').addEventListener('click', (event) => {
                event.stopPropagation();
                coordinates.splice(i, 1);
                updateTableCoordinates();
            });
            tableTbody.appendChild(tableElement);
        }
        if(coordinates.length === 0){
            document.querySelector('#manual-edit-geometry-add-coordinate-button').style.display = 'block';
        }
        else if(geometryType === 'Point' || geometryType === 'MultiPoint'){
            document.querySelector('#manual-edit-geometry-add-coordinate-button').style.display = 'none';
        }
    }
}

function createDialogEditCoordinate(coordinate = [], typeOfCoordinates, callback){
    ons.createElement('dialogEditCoordinate', {append: true})
        .then(function(dialog){
            const dialogContent = document.querySelector('.dialog-edit-coordinate-content');
            const inputContainer = document.querySelector('.dialog-edit-coordinate-inputs');
            if(typeOfCoordinates === 'decimal'){
                const template = dialogContent.querySelector('#dialog-edit-coordinate-inputs-meters');
                const inputs = template.content.cloneNode(true);
                inputContainer.appendChild(inputs);
                if(coordinate.length > 0){
                    dialogContent.querySelector('#longtitude').value = coordinate[0].toFixed(7);
                    dialogContent.querySelector('#latitude').value = coordinate[1].toFixed(7);
                }
            } else {
                const template = dialogContent.querySelector('#dialog-edit-coordinate-inputs-degrees');
                const inputs = template.content.cloneNode(true);
                const templateDegreeInput = inputs.querySelector('#input-degrees');
                for(let i in [0, 1]){
                    const degreeInput = templateDegreeInput.content.cloneNode(true);
                    inputContainer.appendChild(degreeInput);
                }
                if(coordinate.length > 0){
                    for(let i in [0, 1]){
                        const c = transformDecimalToMinutesAndSeconds(coordinate[1-i].toFixed(7));
                        dialogContent.getElementsByClassName('idegree')[i].value = c.slice(0, c.indexOf('°'));
                        dialogContent.getElementsByClassName('iminute')[i].value = c.slice(c.indexOf('°') + 1, c.indexOf('\''));
                        dialogContent.getElementsByClassName('isec')[i].value = c.slice(c.indexOf('\'') + 1, c.indexOf('\"'));
                    }
                }
                dialogContent.getElementsByClassName('dialog-edit-coordinate-label-input')[0].textContent = 'Широта:';
                dialogContent.getElementsByClassName('dialog-edit-coordinate-label-input')[1].textContent = 'Долгота:';
            }
            dialogContent.querySelector('#edit-coordinate-save-changes').addEventListener('click', () => {
                let newCoord = [];
                if(typeOfCoordinates === 'degrees'){
                    const inputs =  document.getElementsByClassName('input-degrees-container'); 
                    for(let input of inputs){
                        let degree = input.querySelector('.idegree').value + '°' + input.querySelector('.iminute').value +
                            '\'' + input.querySelector('.isec').value + '\"';
                        let decimal = transformToDecimal(degree);
                        newCoord.push(decimal);
                    }
                    newCoord = newCoord.reverse();
                } else {
                    let lon = dialogContent.querySelector('#longtitude').value;
                    let lat = dialogContent.querySelector('#latitude').value;
                    newCoord = [lon, lat];
                }
                callback(newCoord);
                hideDialog('dialog-edit-coordinate');
            });
            dialogContent.querySelector('#edit-coordinate-cancel-changes').addEventListener('click', () => {
                hideDialog('dialog-edit-coordinate');
            });
            dialog.show();
        });
}

function updateFeatureGeometryFromTable(feature, coordinates, successfulCallback = null){

    const layer = findLayer(feature.layerID);
    const geometry = feature.getGeometry();
    const geometryType = geometry?.getType() || layer.geometryType;

    if (!geometry) {
        switch(geometryType.toUpperCase()) {
            case 'MULTIPOINT':
            case 'POINT':
                feature.setGeometry(new ol.geom.MultiPoint(coordinates));
                break;
            case 'MuULTILINESTRING':
                feature.setGeometry(new ol.geom.MultiLineString([coordinates]));
                break;
            case 'LINESTRING':
                feature.setGeometry(new ol.geom.LineString(coordinates));
                break;
            case 'MULTIPOLYGON':
                feature.setGeometry(new ol.geom.MultiPolygon([[coordinates]]));
                break;
            case 'POLYGON':
                feature.setGeometry(new ol.geom.Polygon(coordinates))
                break;
        }
    } else {
        if(geometryType === 'MultiLineString' || geometryType === 'MultiPolygon'){
            let newCoordinates = [coordinates];
            if(geometryType === 'MultiPolygon')
                newCoordinates = [newCoordinates];
            feature.getGeometry().setCoordinates(newCoordinates);
        }
        else{
            feature.getGeometry().setCoordinates(coordinates);
        }
    }

    if(successfulCallback)
        successfulCallback();
}