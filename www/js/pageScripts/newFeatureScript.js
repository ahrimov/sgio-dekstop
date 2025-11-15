function newFeatureScipt(pageLayer, pageFeature, fromMap = true){
    let layer = pageLayer;
    const layerId = layer.get('id');
    const kmlType = layer.get('kmlType');
    let feature = pageFeature;   
    let featureImages = [];
    const content  =  document.createElement('table');
    content.className = 'new-feature-content-table';
    for(let atrib of layer.atribs){
        if(checkServiceField(atrib.name))
            continue;
        let line = document.createElement('tr');
        line.innerHTML += `
                <td class='title'>${atrib.label}</td>
                <td class='input'>
                    ${inputByType(atrib)}
                </td>`;
        if(!atrib.visible) line.style.visibility = 'collapse';
        content.appendChild(line);
    }
    document.querySelector('#add-feature-content').appendChild(content);

    if (!kmlType) {
        let template_gallery = document.querySelector('#photogallery');
        let clone_gallery = template_gallery.content.cloneNode(true);
        document.querySelector('#add-feature-content').appendChild(clone_gallery);
        document.querySelector('#addNewPhoto').addEventListener('click', clickOpenCamera, false)
    }


    document.querySelector('#saveFeatureButton').addEventListener('click', saveFeature, false)
    document.querySelector('#backButton').addEventListener('click', back, false)

    if (kmlType) {
        const features = layer.getSource().getFeatures();
        let maxId = 0;
        features.forEach(feature => {
            const id = feature.get('ID');
            if (id > maxId) {
                maxId = id;
            }
        });
        const newId = maxId + 1;
        if (document.querySelector('#ID')) {
            document.querySelector('#ID').value = newId;
        } else {
            // Создаем скрытое поле, если оно не существует
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'ID';
            hiddenInput.value = newId;
            document.body.appendChild(hiddenInput);
        }
    } else {
        autonumericID(layer.atribs[0].name, layer).then((new_id) => {
            document.querySelector(`#${layer.atribs[0].name}`).value = new_id
        });
    }

    function back(){
        document.querySelector('#myNavigator').popPage();
    }

    function saveFeature(){
        let atribNames = [];
        let atribValues = [];
        const values = [];
        for(let atrib of layer.atribs){
            if(checkServiceField(atrib.name))
                continue
            if(atrib.type == 'BOOLEAN'){
                atribNames.push(atrib.name);
                if(document.querySelector(`#${atrib.name}`).checked == true){
                    atribValues.push(1);
                    values.push(1);
                }
                else{
                    atribValues.push(0);
                    values.push(1);
                }
            }
            else{
                let value = document.querySelector(`#${atrib.name}`).value
                if(value != ''){
                    atribNames.push(atrib.name)
                    atribValues.push(`'${value}'`)
                    values.push(value);
                }
            }

        }

        if (kmlType) {
            let id = document.querySelector('#ID').value;
            feature.id = id;
            feature.set('id', id);
            feature.layerID = layer.id;
            feature.type = 'default';
            feature.isNew = true;
            for (let i = 0; i < atribNames.length; i++) {
                const atribName = atribNames[i];
                const atribValue = values[i];
                feature.set(atribName, atribValue);
            }
            if (fromMap) finishDraw();
            else layer.getSource().addFeature(feature);
            
            document.querySelector('#myNavigator').popPage();
            syncChangesWithKML(layerId);
        } else {
            const feautureString = writeFeatureInKML(feature); // format.writeFeature(feature)
            const query = `
                        INSERT INTO ${layer.id} (${atribNames.join(', ')}, Geometry)
                        VALUES (${atribValues.join(',')}, GeomFromText('${feautureString}', 3857));
                        ;`
            requestToDB(query, function(res){
                let id = document.querySelector(`#${layer.atribs[0].name}`).value;
                feature.id = id;
                feature.layerID = layer.id;

                const typeIndex = atribNames.indexOf(layer.styleTypeColumn);
                if(typeIndex >= 0)
                    feature.type = values[typeIndex];
                else 
                    feature.type = 'default';

                const labelIndex = atribNames.indexOf(layer.labelColumn);
                if(labelIndex >= 0)
                    feature.label = values[labelIndex];

                if(fromMap)
                    finishDraw();
                else
                    layer.getSource().addFeature(feature);

                document.querySelector('#myNavigator').popPage();

                if(featureImages.length > 0)
                    saveImageToNewFeature();

                feature.changed();
                saveDB();
            }); 
        }
    }

    async function saveImageToNewFeature(){
        let i = 0;
        saveImageInDB(i, layer, feature);
    }

    function saveImageInDB(i, layer, feature){
        saveImage(featureImages[i].imageEntry, featureImages[i].imageName, featureImages[i].image_options, layer, feature, function(imgUri){
            i++;
            if(i < featureImages.length){
            saveImageInDB(i, layer, feature)
            }
        })
    }

    function inputByType(atrib){
        switch(atrib.type){
            case 'DOUBLE':
                return `<ons-input id='${atrib.name}' modifier="underbar" type="number" placeholder="Числовые данные" float></ons-input>`
            case 'DATE':
                return `<ons-input id='${atrib.name}' modifier="underbar" type="date" float></ons-input>`
            case 'BOOLEAN':
                return `<ons-checkbox id='${atrib.name}'></ons-checkbox>`
            case 'ENUM':
                let select = `<ons-select id='${atrib.name}' onclick="callModalSelectWithLayerAtribs('${layer.id}', '${atrib.name}', '${atrib.name}')">`
                for(let code in atrib.options){
                    select += `<option value='${code}'>${atrib.options[code]}</option>`
                }   
                select += `</ons-select>`
                return select
            default:
                return `<ons-input id='${atrib.name}' modifier="underbar" placeholder="Текстовые данные" float></ons-input>`
        }
    }

    function convertToGeometryType(inp_string){
        let string = insert(inp_string, ' Z', inp_string.search(/\(\(/))
        let res = string.matchAll(/,/g)
        let offset = 0
        for(let r of res){
            string = insert(string, ' 0', r.index + offset)
            offset += 2
        }
        return insert(string, ' 0', string.search(/\)\)/))
    }


    //camera function (dublicate) 

    function clickOpenCamera(){
        try{
            openCamera(function(imgUri){
                getFileEntry(imgUri, function(fileEntry){

                    firstImage();

                    let date = new Date()  
                    let imageName = `${layer.id}${formatDate(date)}.jpg`
                    let pathToImage = './' + pathToImageStorage + imageName
                    pathToImage = pathToImage.replace(/\//g, String.raw`\/`)
                    let image_options = {
                        path: pathToImage,
                        created: date.toISOString(),
                        mimeType:"image" + String.raw`\/` + "jpeg",
                        desc:""
                    }

                    let image = {imageEntry: fileEntry, imageName: imageName, image_options : image_options};
                    featureImages.push(image);

                    let gallery = document.querySelector('.gallery');
                    displayImage(fileEntry.toInternalURL(), gallery);

                }, function(error){
                    console.log(`Cann't save image: ` + error)
                    ons.notification.alert({title:"Внимание", message: 'Невозможно сохранить изображение'});
                })
            }, function(error){
                console.log(`Image didn't create`);
                //ons.notification.alert({title:"Внимание", message: 'Ошибка камеры'});
            })
        }
        catch(err){
            ons.notification.alert({title:"Внимание", message: 'Что-то пошло не так'})
        }
    }


    function displayImage(image, container){
        let image_element = document.createElement('img')
        image_element.className = "pre-image"
        image_element.src = image
        container.appendChild(image_element)
    }

    function displayImagesFromStorage(){
        getImagesFromStorage(layer, feature, function(image_options){
            if(image_options.length == 0)
                return
                
            firstImage()
            let gallery = document.querySelector('.gallery')
            for(let elem of image_options){
                pathToImage = elem.path.replace(/\\\//g, '/');
                getFileEntry(root_directory + pathToImage, function(fileEntry){
                    displayImage(fileEntry.toInternalURL(), gallery)
                }, function(error){
                    ons.notification.alert({title:'Внимание', message: `Не удалось загрузить изображение: ${pathToImage}`})
                })
            }
        })
    }

    function firstImage(){
        if(typeof firstImage.counter == 'undefined'){
            firstImage.counter = 0
            changeAddPhotoButton()
            let gallery = document.createElement('div')
            gallery.className = "gallery"
            document.querySelector('#photos').appendChild(gallery)
        }
        else
            return
    }

    function changeAddPhotoButton(){
        let addNewPhoto = document.querySelector('#addNewPhoto')
        addNewPhoto.remove()
        addNewPhoto = ons.createElement(`<ons-button modifier="outline light" id="addNewPhoto"></ons-button>`)
        addNewPhoto.innerHTML = `<div class='signature'>
            <ons-icon class='icon' icon="md-plus" size="20px"></ons-icon></div>`
        addNewPhoto.style['width'] = "25%"
        addNewPhoto.style['float'] = 'right'
        document.querySelector('#photos').appendChild(addNewPhoto)
        document.querySelector('#addNewPhoto').addEventListener('click', clickOpenCamera, false)
    }
}