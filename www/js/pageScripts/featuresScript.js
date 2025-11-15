
function featuresInit(layerID) {
    const layer = findLayer(layerID);
    const kmlType = layer.get('kmlType');
    var left_row, right_row;
    var count_row;
    var limit = 50;
    var offset = 0;
    var filter_atrib_name;
    var filter_atrib_value = kmlType ? '' : '%';

    const layerAtribs = layer.atribs.filter(atrib => atrib.name !== 'geometryType');

    const idIndex = layerAtribs.findIndex(atrib => atrib.name === 'ID');
    if (idIndex > 0) {
        const idAtrib = layerAtribs.splice(idIndex, 1)[0];
        layerAtribs.unshift(idAtrib);
    }

    document.querySelector('#tool-search').addEventListener('click', showDialogSearch);

    if (!kmlType) {
        requestToDB(`SELECT COUNT(*) as count FROM ${layerID}`, function(data){
            count_row = data.rows.item(0).count
        });
    }
    
    let table = "<table class='features'>" +
        "<thead>" + 
            "<tr>" + 
                `<th>
                    <ons-select id="feat_left">
                        <select class="feat_left">`
                        for(atrib of layerAtribs){
                            table += `<option value="${atrib.name}">${atrib.label}</option>`
                        }
                    table += `</select>
                    </ons-select>
                </th>` + 
                `<th>
                    <ons-select id="feat_right">
                        <select class='feat_right'>`
                        for(atrib of layerAtribs){
                            table += `<option value="${atrib.name}">${atrib.label}</option>`
                        }
                    table += `</select>
                    </ons-select>
                </th>` + 
            "</tr>" +
        "</thead>" + 
        "<tbody id='features-tbody'>" +
        "</tbody>" + 
    "</table>"
    const content = document.getElementById("features-list");
    content.innerHTML = table;

    setTimeout(() => {
        const leftSelect = content.querySelector('#feat_left');
        const rightSelect = content.querySelector('#feat_right');

        leftSelect.addEventListener('change', editFeaturesTable);
        rightSelect.addEventListener('change', editFeaturesTable);
    })

    document.getElementById("title").innerHTML = layer.label
    left_row = layerAtribs[0].name
    right_row = layerAtribs[1].name
    filter_atrib_name = layerAtribs[0].name
    document.getElementsByClassName("feat_right")[0].value = right_row
    showFeaturesList(layerID, left_row, right_row, filter_atrib_name, filter_atrib_value, limit, offset)

    document.querySelector('.page__content').addEventListener('scroll',  function (e) {
        checkPosition()
    });

    function defaultShowFeatureList(){
        offset = 0
        let table = document.querySelector('#features-tbody')
        table.innerHTML = ""
        if(layerID !== void 0){
            showFeaturesList(layerID, left_row, right_row, filter_atrib_name, filter_atrib_value, limit, offset);
        }
    }

    function getPropertyPage(featureID){
        let layer = findLayer(layerID)
        let feature = findFeatureByID(layer, featureID)
        document.querySelector('#myNavigator').pushPage('./views/featureProperties.html', {data: {feature: feature}});
    }

    function editFeaturesTable(event){
        offset = 0
        let divClass = event.target.className
        divClass = divClass.split(" ")[0]
        if(divClass == 'feat_left'){
            left_row = event.target.value
        }
        else if(divClass == 'feat_right'){    
            right_row = event.target.value
        }
        let table = document.querySelector('#features-tbody')
        table.innerHTML = ""
        showFeaturesList(layerID, left_row, right_row, filter_atrib_name, filter_atrib_value, limit, offset)
    }

    function checkPosition(){
        const height = document.body.offsetHeight
        const screenHeight = window.innerHeight
        const scrolled = window.scrollY
        const threshold = height - screenHeight
        const position = scrolled + screenHeight

        if (position >= threshold) {
            offset += limit
            if(offset > count_row){
                return
            }
            showFeaturesList(layerID, left_row, right_row, filter_atrib_name, filter_atrib_value, limit, offset)
        }
    }

    function showFeaturesList(layerID, left_row, right_row, filter_atrib_name, filter_atrib_value, limit, offset){
        const layer = findLayer(layerID);
        const kmlType = layer.get('kmlType');
        if (kmlType) {
            const table = document.querySelector('#features-tbody');
            const features = layer.getSource().getFeatures();

            let filteredFeatures = features;
        
            if (filter_atrib_name && filter_atrib_value) {
                filteredFeatures = features.filter(feature => {
                    const value = feature.get(filter_atrib_name);
                    return value && String(value).toLowerCase().startsWith(filter_atrib_value.toLowerCase());
                });
            }

            const paginatedFeatures = filteredFeatures.slice(offset, offset + limit);

            for (let i = 0; i < paginatedFeatures.length; i++) {
                const feature = paginatedFeatures[i];
                const properties = feature.getProperties();
                let line = document.createElement("tr");
                let line_content = `<td><div>${getValueFromLayerAtrib(layerID, left_row, properties[left_row])}</div></td>
                                    <td><div>${getValueFromLayerAtrib(layerID, right_row, properties[right_row])}</div></td>`;
                line.innerHTML = line_content;
                line.addEventListener('click', () => getPropertyPage(properties['ID']));
                table.append(line);
            }
        } else {
            const query = `SELECT  ${layerAtribs[0].name} as id, ${left_row} as left, ${right_row} as right from ${layerID}
                WHERE ${filter_atrib_name} LIKE '${filter_atrib_value}%' 
                LIMIT ${limit} OFFSET ${offset}`;
            requestToDB(query, function(data){
                const table = document.querySelector('#features-tbody');
                for (let i = 0; i < data.rows.length; i++) {
                    let line = document.createElement("tr");
                    let line_content = `<td><div>${getValueFromLayerAtrib(layerID, left_row, data.rows.item(i).left)}</div></td>
                                        <td><div>${getValueFromLayerAtrib(layerID, right_row, data.rows.item(i).right)}</div></td>`;
                    line.innerHTML = line_content;
                    line.addEventListener('click', () => getPropertyPage(data.rows.item(i).id));
                    table.append(line);
                }
            });
        }  
    }


    function showDialogSearch(){
        ons.createElement('dialog_search', {append: true})
        .then(function(dialog){
            let layer = findLayer(layerID)
            let select = document.querySelector('#select-dialog-search')
            let options = ''
            for(let atrib of layerAtribs){
                if(checkServiceField(atrib.name)){
                    continue;
                }
                options += `<option value="${atrib.name}">${atrib.label}</option>`
            }
            select.innerHTML = options
            select.value = filter_atrib_name

            let typeAtrib = getAtribByName(layerAtribs, filter_atrib_name)
            addInputForFilter(typeAtrib)
            if(filter_atrib_value != '%'){
                inputSetValue(filter_atrib_value, typeAtrib)
            }
            dialog.show()
            document.getElementById('select-dialog-search').addEventListener('change', selectingSearch);
            document.getElementById('accept-filter-button').addEventListener('click', acceptFilter);
            document.getElementById('clear-filter-button').addEventListener('click', clearFilter);
        })
    }

    function selectingSearch(event){
        let atribName = event.target.value
        let layer = findLayer(layerID)
        addInputForFilter(getAtribByName(layerAtribs, atribName))
    }

    function addInputForFilter(atrib){
        let dialog_search_values = document.querySelector('#select-value-dialog-search')
        switch(atrib.type){
            case 'DOUBLE':
                let number_input = `<ons-input id="filter-value" modifier="underbar" type="number" float></ons-input>`
                dialog_search_values.innerHTML = number_input
                break
            case 'STRING':
                let string_input = `<ons-input id="filter-value" modifier="underbar" float></ons-input>`
                dialog_search_values.innerHTML = string_input
                break
            case 'BOOLEAN':
                let boolean_input = `<ons-radio id="radio-1" name="boolean-input" input-id="radio-1" value='1'></ons-radio>
                                    <label for="radio-1">Да</label>
                                    <ons-radio id="radio-0" name="boolean-input" input-id="radio-0" value='0'></ons-radio>
                                    <label for="radio-0">Нет</label>`
                dialog_search_values.innerHTML = boolean_input
                break
            case 'ENUM':
                let select = `<ons-select id="filter-value">`;
                for(let key in atrib.options){
                    select += `<option value='${key}'>${atrib.options[key]}</option>`;
                }
                select += `</ons-select>`;
                dialog_search_values.innerHTML = select;
                break;
            case 'DATE':
                dialog_search_values.innerHTML = `<ons-input id="filter-value" modifier="underbar" type="date" float></ons-input>`
                break;
            default:
                dialog_search_values.innerHTML = ''
                break
        }
    }

    function acceptFilter(){ 
        filter_atrib_name = document.querySelector('#ons-select-dialog-search').value
        let layer = findLayer(layerID)
        let typeAtrib = getTypeByAtribName(layerAtribs, filter_atrib_name)
        filter_atrib_value = inputGetValue(typeAtrib)
        offset = 0
        let table = document.querySelector('#features-tbody')
        table.innerHTML = ""
        showFeaturesList(layerID, left_row, right_row, filter_atrib_name, filter_atrib_value, limit, offset)
        
        hideDialog('dialog-search')
    }

    function clearFilter(){
        let table = document.querySelector('#features-tbody')
        table.innerHTML = ""
        filter_atrib_name = left_row
        filter_atrib_value = kmlType ? '' : '%'
        offset = 0
        showFeaturesList(layerID, left_row, right_row, filter_atrib_name, filter_atrib_value, limit, offset)

        hideDialog('dialog-search')
    }

    function inputSetValue(value, type){
        switch(type){
            case 'BOOLEAN':
                if(value == 1){
                    document.querySelector('#radio-1').checked = true
                    document.querySelector('#radio-0').checked = false
                }
                else{
                    document.querySelector('#radio-0').checked = true
                    document.querySelector('#radio-1').checked = false
                }
                break
            default:
                document.querySelector('#filter-value').value = filter_atrib_value
                break
        }
    }

    function inputGetValue(type){
        switch(type){
            case 'BOOLEAN':
                let group = document.getElementsByName('boolean-input')
                for(element of group){
                    if(element.checked)
                        return element.value
                }
                break
            default:
                return document.querySelector('#filter-value').value
        }
    }
};