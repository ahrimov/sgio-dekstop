async function openDB(filename, name, sourceDirName) {
    try {
        const appDataPath = await electronAPI.getAppDataPath();
        const dbPath = `${appDataPath}/database/${filename}`;
        
        console.log('🔧 Opening database:', dbPath);
        
        const dbInfo = await electronAPI.openDatabase(dbPath);
        console.log('✅ Database opened, info:', dbInfo);
        
        dbInfo.filename = filename;
        dbInfo.sourceDirName = sourceDirName;
        
        return dbInfo;
    } catch (error) {
        console.error('❌ Error opening database:', error);
        throw error;
    }
}

// Инициализация базы данных
async function initialDB(sourceDirName, dbName, name) {
    try {
        const appDataPath = await electronAPI.getAppDataPath();
        const targetDBPath = `${appDataPath}/database/${dbName}`;
        const sourceDBPath = `${sourceDirName}${dbName}`;
        
        console.log('Initializing database:', dbName);
        
        // Создаем директорию для базы данных
        await electronAPI.mkdir(`${appDataPath}/database`);
        
        // Пробуем скопировать базу данных из ресурсов если она там есть
        try {
            const sourceExists = await electronAPI.exists(sourceDBPath);
            if (sourceExists) {
                await electronAPI.copyFile(sourceDBPath, targetDBPath);
                console.log('Database copied from resources');
            }
        } catch (copyError) {
            console.log('No source database found, will create new one');
        }
        
        // Открываем базу данных
        db = await openDB(dbName, name, sourceDirName);
        return db;
        
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// Сохранение базы данных
async function saveDB() {
    if (!db) return;
    
    console.log('Database changes saved automatically in SQLite');
    return Promise.resolve();
}

function requestToDB(query, callback, notification = 'Неизвестная ошибка') {
    if (!db) {
        console.log('🔄 Database not initialized, retrying...');
        setTimeout(() => requestToDB(query, callback, notification), 50);
        return;
    }
    
    console.log('🚀 Executing query on database:', db.path);
    console.log('📝 Query:', query);
    
    // Используем полный путь из db.path
    electronAPI.executeSQL(db.path, query)
        .then(result => {
            console.log('✅ Query successful, rows:', result.rows.length);
            const compatibleResult = {
                rows: {
                    length: result.rows.length,
                    item: (index) => result.rows[index]
                }
            };
            callback(compatibleResult);
        })
        .catch(error => {
            console.error('❌ Database transaction error:', error);
            console.log('📊 Database object:', db);
            console.log('📝 Query:', query);
            if (notification) {
                ons.notification.alert({title: "Внимание", message: notification});
            }
        });
}

// Получение данных слоя из БД
function getDataLayerFromBD(layer) {
    if (!db) {
        setTimeout(() => getDataLayerFromBD(layer), 50);
        return;
    }
    
    const source = new ol.source.Vector();
    let selectTypeQuery = '';
    let selectLabelQuery = '';

    const atribType = layer.atribs.filter((atrib) => atrib.name === layer.styleTypeColumn);
    if (atribType.length > 0) {
        selectTypeQuery = ` ${layer.styleTypeColumn} as type, `;
    }

    const atribDescription = layer.atribs.filter((atrib) => atrib.name === layer.labelColumn);
    if (atribDescription.length > 0) {
        selectLabelQuery = ` ${layer.labelColumn} as description, `;
    }

    const query = `SELECT ${layer.atribs[0].name} as id,${selectTypeQuery} ${selectLabelQuery} AsText(Geometry) as geom from ` + layer.id;
    
    requestToDB(query, function(res) {
        const format = new ol.format.WKT();
        
        for (let i = 0; i < res.rows.length; i++) {
            let wkt = res.rows.item(i).geom;
            let feature = new ol.Feature();
            if (typeof wkt !== 'undefined' && wkt !== '') {
                feature = format.readFeature(wkt.replace(/nan/g, "0"));
            }
            feature.id = res.rows.item(i).id;
            feature.layerID = layer.id;
            feature.type = res.rows.item(i).type;
            feature.label = res.rows.item(i).description;
            source.addFeature(feature);
        }
        layer.setSource(source);
        completeLoad();
    }, 'Ошибка в базе данных.');
}