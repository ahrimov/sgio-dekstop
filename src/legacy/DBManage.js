import { Vector } from "ol/source";
import WKT from 'ol/format/WKT.js';
import Feature from 'ol/Feature.js';

let db;

let dbLoadState = {
    totalLayers: 0,
    loadedLayers: 0,
    onProgress: null,
    onLayerComplete: null
};

export function setDBProgressCallbacks(onProgress, onLayerComplete = null) {
    dbLoadState.onProgress = onProgress;
    dbLoadState.onLayerComplete = onLayerComplete;
}

async function openDB(filename, name, sourceDirName) {
    try {
        const appDataPath = await electronAPI.getAppDataPath();
        const dbPath = `${appDataPath}/database/${filename}`;
        
        console.log('Opening database:', dbPath);
        
        const dbInfo = await electronAPI.openDatabase(dbPath);
        console.log('Database opened, info:', dbInfo);
        
        dbInfo.filename = filename;
        dbInfo.sourceDirName = sourceDirName;
        
        return dbInfo;
    } catch (error) {
        console.error('Error opening database:', error);
        throw error;
    }
}

export async function initialDB(sourceDirName, dbName, name) {
    try {
        const appDataPath = await electronAPI.getAppDataPath();
        const targetDBPath = `${appDataPath}/database/${dbName}`;
        const sourceDBPath = `${sourceDirName}${dbName}`;
        
        
        if (dbLoadState.onProgress) {
            dbLoadState.onProgress('Инициализация базы данных...');
        }
        
        await electronAPI.mkdir(`${appDataPath}/database`);
        
        try {
            const sourceExists = await electronAPI.exists(targetDBPath);
            if (!sourceExists) {
                if (dbLoadState.onProgress) {
                    dbLoadState.onProgress('Копирование базы данных...');
                }
                await electronAPI.copyFile(sourceDBPath, targetDBPath);
                console.log('Database copied from resources');
            }
        } catch (copyError) {
            console.log('No source database found, will create new one');
        }
        
        db = await openDB(dbName, name,  `${appDataPath}/database/`);
        
        if (dbLoadState.onProgress) {
            dbLoadState.onProgress('База данных готова');
        }
        
        return db;
        
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

export function requestToDB(query, callback, notification = 'Неизвестная ошибка') {
    if (!db) {
        console.log('Database not initialized, retrying...');
        setTimeout(() => requestToDB(query, callback, notification), 50);
        return;
    }
    
    electronAPI.executeSQL(db.path, query)
        .then(result => {
            const compatibleResult = {
                rows: {
                    length: result.rows.length,
                    item: (index) => result.rows[index]
                }
            };
            callback(compatibleResult);
        })
        .catch(error => {
            console.error('Database transaction error:', error);
            console.log('Query:', query);
        });
}

export function getDataLayerFromBD(layer) {
    return new Promise((resolve, reject) => {
        if (!db) {
            setTimeout(() => {
                getDataLayerFromBD(layer).then(resolve).catch(reject);
            }, 50);
            return;
        }
        
        if (dbLoadState.onProgress) {
            dbLoadState.loadedLayers++;
            const progress = Math.round((dbLoadState.loadedLayers / dbLoadState.totalLayers) * 100);
            dbLoadState.onProgress(
                dbLoadState.loadedLayers,
                `Текущий слой: ${layer.label}`,
                progress
            );
        }
        
        const source = new Vector();
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
            try {
                const format = new WKT();
                
                for (let i = 0; i < res.rows.length; i++) {
                    let wkt = res.rows.item(i).geom;
                    let feature = new Feature();
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
                
                if (dbLoadState.onLayerComplete) {
                    dbLoadState.onLayerComplete(layer);
                }
                
                resolve(layer);
                
            } catch (error) {
                console.error(`Ошибка загрузки слоя "${layer.label}":`, error);
                reject(error);
            }
        }, 'Ошибка в базе данных.');
    });
}

export async function loadAllLayers(layers) {
    if (!layers || layers.length === 0) {
        console.log('Нет слоев для загрузки');
        return [];
    }
    
    setTotalLayersCount(layers.length);
    
    const results = [];
    
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        try {
            if (dbLoadState.onProgress) {
                dbLoadState.onProgress(
                    i + 1,
                    `Загрузка: ${layer.label}`,
                    Math.round(((i + 1) / layers.length) * 100)
                );
            }
            
            const result = await getDataLayerFromBD(layer);
            results.push(result);
            
        } catch (error) {
            console.error(`Ошибка загрузки слоя ${layer.label}:`, error);
            results.push(null);
        }
    }
    
    if (dbLoadState.onProgress) {
        dbLoadState.onProgress(
            layers.length,
            'Все слои загружены',
            100
        );
    }
    
    return results;
}

export function setTotalLayersCount(count) {
    dbLoadState.totalLayers = count;
    dbLoadState.loadedLayers = 0;
}

export function resetDBLoadState() {
    dbLoadState.totalLayers = 0;
    dbLoadState.loadedLayers = 0;
}

export function onProgress(message, currentFile = '', progress = 0) {
    if (window.dbProgressCallbacks && window.dbProgressCallbacks.onProgress) {
        window.dbProgressCallbacks.onProgress(message, currentFile, progress);
    }
}