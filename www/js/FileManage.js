async function openFile(filePath, post_processing){
    try {
        const data = await electronAPI.readFile(filePath);
        const fileName = filePath.split('/').pop() || filePath.split('\\').pop();
        post_processing(data, fileName);
    } catch (err) {
        console.log("Error while open file:", filePath);
        ons.notification.alert({
            title: "Внимание", 
            messageHTML: `<p class="notification-alert">Ошибка при открытии файла: ${filePath} </p>`
        });
    }
}
async function getFileEntry(filePath, success, fail) {
    try {
        const exists = await electronAPI.exists(filePath);
        if (exists) {
            success({ path: filePath });
        } else {
            fail(new Error('File not found'));
        }
    } catch (err) {
        fail(err);
    }
}

async function writeFileText(fileEntry, text, success, fail) {
    try {
        await electronAPI.writeFile(fileEntry.path, text);
        if (success) success();
    } catch (err) {
        console.log("Failed file write: " + err.toString());
        if (fail) fail();
    }
}

async function getFolder(dirName, callback){
    try {
        await electronAPI.mkdir(dirName);
        callback({ path: dirName });
    } catch (err) {
        console.log("Error creating directory:", err);
        callback({ path: dirName });
    }
}

async function checkIfFileExists(filePath, fileExists, fileDoesNotExist){
    try {
        const exists = await electronAPI.exists(filePath);
        if (exists) {
            fileExists({ path: filePath });
        } else {
            fileDoesNotExist(new Error('File not found'));
        }
    } catch (err) {
        fileDoesNotExist(err);
    }
}

async function saveFile(pathDir, fileName, fileData, success, onError) {
    const innerOnError = (error) => { 
        ons.notification.alert({
            title: "Внимание", 
            message: `Невозможно создать файл. Ошибка: ${error}`
        });
    };
    const onError_ = onError ?? innerOnError;
    
    const fullPath = `${pathDir}/${fileName}`;
    
    try {
        await electronAPI.writeFile(fullPath, fileData);
        if (success) success();
    } catch (err) {
        onError_(err);
    }
}

function showAllFilesAtDir(pathToDir, success){
    electronAPI.readdir(pathToDir, function(err, files) {
        if (err) {
            console.log('Unable to read directory');
            return;
        }
        const fileEntries = files.map(file => ({ name: file, path: path.join(pathToDir, file) }));
        success(fileEntries);
    });
}

async function openFileFromProject(relativePath, callback, firstCheckApplicationDirectory = true){
    try {
        const data = await electronAPI.readFile(relativePath);
        const fileName = relativePath.split('/').pop() || relativePath.split('\\').pop();
        callback(data, fileName);
    } catch (err) {
        console.log("Error while open file:", relativePath);
        ons.notification.alert({
            title: "Внимание", 
            messageHTML: `<p class="notification-alert">Ошибка при открытии файла: ${relativePath} </p>`
        });
    }
}

function tileLoadFunctionLocal(imageTile, src){
    // Для работы с файлами в Electron нужно использовать file:// протокол
    // или передавать данные через base64
    electronAPI.exists(src).then(exists => {
        if (exists) {
            imageTile.getImage().src = 'file://' + src;
        } else {
            // Проверяем существование дефолтной плитки
            const emptyTilePath = './sgio-data/resources/images/empty_tile.png';
            electronAPI.exists(emptyTilePath).then(exists => {
                if (exists) {
                    imageTile.getImage().src = 'file://' + emptyTilePath;
                } else {
                    console.log("Tile wasn't found");
                }
            });
        }
    });
}

function tileLoadFunctionDefault(imageTile, src){
    imageTile.getImage().src = src;
}

function rosreetrUrlFunction(tileCoord, number, projection){
    const maxY = 2**tileCoord[0];
    const tile = [tileCoord[1], tileCoord[2], tileCoord[0]];
    const bbox = tileToBBOX(tile);
    const bboxM = ol.proj.transformExtent(bbox, 'EPSG:4326', projection);
    return rosreestr_url + '&bbox=' + bboxM.join(','); 
}

async function globalReadlFile(fileUri, callback) {
    try {
        const data = await electronAPI.readFile(fileUri);
        callback(data);
    } catch (err) {
        console.error("Ошибка чтения файла:", err);
    }
}