// Storage service для Electron
const ElectronStorage = {
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            console.log("✅ Данные сохранены:", key);
            return Promise.resolve();
        } catch (error) {
            console.error("❌ Ошибка сохранения:", error);
            return Promise.reject(error);
        }
    },

    getItem: (key) => {
        return new Promise((resolve, reject) => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    resolve(JSON.parse(data));
                } else {
                    reject({ code: 2, message: "Key not found" });
                }
            } catch (error) {
                reject(error);
            }
        });
    }
};

function saveMapPosition() {
    let saveTimeout;
    function debouncedSave(map) {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => saveMapState(map), 1000); 
    }

    map.getView().on('change:center', function() {
        debouncedSave(map);
    });

    function saveMapState(map) {
        const mapView = map.getView();
        const mapSettings = { 
            center: mapView.getCenter(), 
            zoom: mapView.getZoom() 
        }

        ElectronStorage.setItem(
            "mapSettings",
            mapSettings
        ).catch(error => console.error("Ошибка сохранения:", error));
    }
}

function loadMapPosition() {
    ElectronStorage.getItem("mapSettings")
        .then(data => {
            if (data && !isDemoData(data)) {
                currentMapView.setCenter(data.center);
                currentMapView.setZoom(data.zoom);
            }
        })
        .catch(error => console.error("Ошибка загрузки:", error));
}

function saveLayersVisibility() {
    const visibilityState = {};

    layers.forEach(layer => {
        visibilityState[layer.get('id')] = layer.getVisible();
    });

    ElectronStorage.setItem("layerVisibility", visibilityState)
        .catch(error => console.error("Ошибка сохранения видимости слоев:", error));
}

function loadLayersVisibility(showInList = false) {
    ElectronStorage.getItem("layerVisibility")
        .then(data => {
            if (data && typeof data === 'object') {
                layers.forEach(layer => {
                    const layerId = layer.get('id');
                    if (layerId in data) {
                        const isVisible = data[layerId];
                        layer.setVisible(isVisible);
                        layer.visible = isVisible;

                        if (showInList) {
                            const element = document.querySelector(`[data-id="${layerId}"]`);
                            if (element) {
                                element.style.backgroundColor = isVisible ? 'rgb(99 156 249)' : '#FFFFFF';
                            }
                        }
                    }
                });
            }
        })
        .catch(error => console.error("Ошибка загрузки видимости слоев:", error));
}

function saveLayersOrder(order) {
    const orderDict = {};
    order.forEach((layerId, index) => {
        orderDict[layerId] = index;
    });

    ElectronStorage.setItem('layersOrder', orderDict)
        .catch(error => console.error("Ошибка сохранения:", error));
}

async function loadLayersOrder() {
    try {
        const order = await ElectronStorage.getItem('layersOrder');
        return order ?? {};
    } catch (error) {
        if (error.code === 2) return {};
        throw error;
    }
}

// Остальные функции остаются без изменений
async function initLayerOrder() {
    const savedOrder = await loadLayersOrder();

    if (Object.keys(savedOrder).length > 0) {
        layers.sort(function(a, b) {
            const aId = a.get("id");
            const bId = b.get("id");
            const aIndex = aId in savedOrder ? savedOrder[aId] : Infinity;
            const bIndex = bId in savedOrder ? savedOrder[bId] : Infinity;
            return aIndex - bIndex;
        });
    } else {
        layers.sort(function(a, b) {
            return b.getZIndex() - a.getZIndex();
        });
        saveLayersOrder(layers.map(layer => layer.get("id")));
    }
    
    let count = layers.length;
    for (let layer of layers) {
        layer.setZIndex(minZIndexForVectorLayers + count);
        count--;
    }
}

function isDemoData(data) {
    const demoCenter = [5589769.981252036, 7624937.878124485];
    const demoZoom = 20.546652995062992;
    
    return data.center[0] === demoCenter[0] && 
           data.center[1] === demoCenter[1] && 
           data.zoom === demoZoom;
}