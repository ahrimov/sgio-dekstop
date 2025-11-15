function setOptions(srcType) {
    var options = {
        // Some common settings are 20, 50, and 100
        quality: 100,
        destinationType: Camera.DestinationType.FILE_URI,
        // In this app, dynamically set the picture source, Camera or photo gallery
        sourceType: srcType,
        correctOrientation: true,
        encodingType: Camera.EncodingType.JPG
    }
    return options;
}

function openCamera(succes, fail) {

    var srcType = Camera.PictureSourceType.CAMERA;
    var options = setOptions(srcType);
    //var func = getFileEntry;

    navigator.camera.getPicture(succes, fail, options);

    /*
    navigator.camera.getPicture(function cameraSuccess(imageUri) {

        //displayImage(imageUri);
        // You may choose to copy the picture, save it somewhere, or upload.
        func(imageUri, displayContainer, imgName);

    }, function cameraError(error) {
        console.debug("Unable to obtain picture: " + error, "app");

    }, options);*/
}
/*
function displayImage(imgUri, displayContainer) {
    displayContainer.src = imgUri;
}*/


function saveImage(imgEntry, image_name, image_options, layer, feature, success_func){
    getFolder(pathToImageStorage, function(dirEntry){
        imgEntry.copyTo(dirEntry, image_name, function(){
            requestToDB(`SELECT lg_attach as im FROM ${layer.id} WHERE ${layer.atribs[0].name} = ${feature.id}`, function(data){

                let lg_attach = data.rows.item(0).im
                if(typeof lg_attach == 'undefined')
                    lg_attach = []
                else
                    lg_attach = JSON.parse(lg_attach)
                lg_attach.push(image_options)
                lg_attach = JSON.stringify(lg_attach)
                let query = `UPDATE ${layer.id} SET lg_attach = '${lg_attach}' WHERE ${layer.atribs[0].name} = ${feature.id}`
                requestToDB(query, function(data){
                    saveDB()
                    
                    success_func(root_directory + pathToImageStorage + image_name)
                })
            })
        })
    })
}

function getImagesFromStorage(layer, feature, success){
    const query = `SELECT lg_attach as im FROM ${layer.id} WHERE ${layer.atribs[0].name} = ${feature.id}`
    requestToDB(query, function(data){
        let lg_attach = data.rows.item(0).im
        if(typeof lg_attach == 'undefined')
            lg_attach = []
        else{
            lg_attach = JSON.parse(lg_attach)
        }
        success(lg_attach)
    })
}