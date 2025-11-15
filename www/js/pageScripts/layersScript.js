function layersScriptInit() {
  creatingLayerList();

  createBaseRasterList();

  loadLayersVisibility(true);

  Sortable.create(layerListWithHandle, {
    handle: '.reorder-move',
    animation: 150,
    onUpdate: function(event){
      saveLayersOrder(this.toArray());

      var count = layers.length;
      for(layerID of this.toArray()){
        let layer = getLayerById(layerID);
        layer.setZIndex(minZIndexForVectorLayers +  count);
        count--;
      }
    }
  });
}

function creatingLayerList() {
  const list = document.querySelector("#layerListWithHandle");
  layers.sort(function(a, b){
    return b.getZIndex() - a.getZIndex();
  });
  for (layer of layers) {
    addLayerToViewList({ layer, list });
  }
}

function addLayerToViewList({ layer, list }) {
  const template = document.querySelector('#layerListItem');
  const item = template.content.cloneNode(true);

  item.querySelector('.layer-label').textContent = '';
  item.querySelector('.list-group-item').removeAttribute("data-id");
  item.querySelector('.layers-more-button')?.removeAttribute("layer_id");

  item.querySelector('.layer-label').textContent = layer.get("descr");
  item.querySelector('.list-group-item').setAttribute("data-id", layer.get("id"));
  item.querySelector('.layers-more-button').setAttribute("layer_id", layer.get("id"));
  
  if(layer.enabled){
    item.querySelector('.block-icon').style['display'] = 'none';
  }
  if(layer.getVisible()){
    item.querySelector('.list-group-item').style.backgroundColor = 'rgb(99 156 249)';
  }
  item.querySelector('.layers-more-button').addEventListener('click', function(event){showActionSheet(this, event)});
  list.appendChild(item);
}

function updatingVectorList() {
  const list = document.querySelector("#layerListWithHandle");
  list.innerHTML = '';
  creatingLayerList();
}

function changeVisible(element) {
    const layerID = element.getAttribute("data-id");
    const layer = getLayerById(layerID);
    if(layer){
      layer.visible = !layer.visible;
      layer.setVisible(!layer.getVisible());
    }
    else{
      ons.notification.alert({title:"Внимание", meassage:'Слой невозможно отобразить.'})
    }
    if(layer.getVisible()){
      element.style.backgroundColor = 'rgb(99 156 249)';
    }
    else{
      element.style.backgroundColor = '#FFFFFF';
    }

    saveLayersVisibility()

    updateInfo();
  }

  function createFileChooserForKML(layerID, callback){
    ons.createElement('choose_path_to_KML', {append: true})
            .then(function(dialog){
              document.querySelector('#path-chooser-kml-media-label').textContent = path_to_media_kml_label;
              document.querySelector('#path-chooser-kml-iternal-label').textContent = path_to_project_kml_label;
                document.querySelector('#buttonFileChooser').addEventListener('click', () => {
                  const media_radio = document.querySelector('#media-path');
                  const iternal_radio = document.querySelector('#iternal-path');
                  if(media_radio.checked){
                    callback(pathToKMLStorage, layerID);
                  }
                  else if (iternal_radio.checked){
                    callback(root_directory + pathToKMLStorage, layerID);
                  }
                  hideDialog('choose-path-to-KML');
                }, false)
                dialog.show()
            })
  }


  function showActionSheet(element, event){
    event.stopPropagation();
    var layerID = element.getAttribute("layer_id");
    const layer = findLayer(layerID);
    const navigator = document.querySelector('#myNavigator');
    const kmlType = layer.get('kmlType');
    if (kmlType) {
      ons.openActionSheet({
        cancelable: true,
        buttons: [
          {
            label: 'Список атрибутов',
            modifier: 'destructive'
          },
          {
            label: 'Добавить объект',
          },
          {
            label: 'Изменить стиль',
          },
          {
            label: 'Экспорт kml',
          },
          {
            label: 'Очистить слой',
          },
          {
            label: 'Исключить из проекта',
          },
          {
            label: 'Назад',
            icon: 'md-close'
          }
        ]
      }).then(function (index) {
          if(index === 0){
            navigator.pushPage('./views/features.html', {data: {layerID: layerID}});
          }
          if(index === 1){
            if (layer.enabled) {
              navigator.popPage({times: navigator.pages.length - 1});
              createFeature(layer);
            }
          }
          if (index === 2) {
            document.querySelector('#myNavigator').pushPage('./views/styleEditor.html', { data: {
              layer: layer,
              callback: () => {},
            }});
          }
          if (index === 3) {
            saveKMLToFile(layerID);
          }
          if(index === 4) {
            clearLayer(layerID);
          }
          if (index === 5) {
            deleteLayer(layerID);
          }
      });
    } else {
      ons.openActionSheet({
        cancelable: true,
        buttons: [
          {
            label: 'Список атрибутов',
            modifier: 'destructive'
          },
          {
            label: 'Добавить объект',
          },
          {
            label: 'Экспорт kml',
          },
          {
            label: 'Импорт kml',
          },
          {
            label: 'Очистить слой'
          },
          {
            label: 'Назад',
            icon: 'md-close'
          }
        ]
      }).then(function (index) {
          if(index === 0){
            navigator.pushPage('./views/features.html', {data: {layerID: layerID}});
          }
          if(index === 1){
            if (layer.enabled) {
              navigator.popPage({times: navigator.pages.length - 1});
              createFeature(layer);
            }
          }
          if(index === 2){
            if(!layer.enabled){
              ons.notification.alert({title:"Внимание", message: "Этот слой нельзя экспортировать"});
            }
            else{
              exportKML(layerID);
            }
          }
          if(index === 3){
            fileChooser.open((fileUri) => {
              compareAtribs(layerID, fileUri)
            });
          }
          if(index === 4){
            clearLayer(layerID);
          }
      });
    }
  }

  function chooseFile(pathToKML, layerID){
    ons.createElement('file_chooser', {append: true})
      .then(function(dialog){
        let content = document.getElementById('dialog-file-chooser-content')
        showAllFilesAtDir(pathToKML, function(entries){
          let html = ''
          for(let entry of entries){
            if(entry.name.search(`.xml`)){
              var item = ons._util.createElement("<ons-list-item tappable></ons-list-item>")
              item.innerHTML = `${entry.name}`
              item.addEventListener("click", () => {
                hideDialog('file-chooser')
                compareAtribs(layerID, entry.nativeURL)
              }, false)
              content.appendChild(item)
            }
          }
        })
        dialog.show()
      })
  }

  function compareAtribs(layerID, pathToKML){
    let layer = findLayer(layerID)
    globalReadlFile(pathToKML, function(data){
        let format = new ol.format.KML();
        let features = format.readFeatures(data.replace(/nan/g, "0"));
        if(features.length == 0){
            ons.notification.alert({title:"Внимание", message:'Элементы не найдены'});
            return;
        }
        const properties = Object.keys(features[0].getProperties());
        ons.createElement('comparison_KML', {append: true})
            .then(function(dialog){
                let html = '<table class="dialog-comparison-KML-table">'
                for(let atrib of layer.atribs){
                    html += `<tr class='property'>
                        <td class='left_property title'>${atrib.name}</td>`

                    let select = `<ons-select class='right_property' id='${atrib.name}' onclick="simpleCreateModalSelect('${atrib.name}')">`
                    select += `<option value="" selected disabled hidden>Нет соотвествия</option>`
                    for(let prop of properties){
                        let selected = ''
                        if(atrib.name.toLowerCase() == prop.toLowerCase()){
                            selected = ` selected="selected" `
                        }
                        select += `<option value='${prop}'${selected}>${prop}</option>`
                    }
                    select += `</ons-select>`

                    html += `<td>${select}</td>
                        </tr>`
                }
                html += `</table>`
                document.querySelector('#dialog-list-properties').innerHTML = html
                document.querySelector('#acceptImportKML').addEventListener('click', () => {acceptImportKML(layerID, features)}, false)
                dialog.show()
            })
    })
  }

  function acceptImportKML(layerID, features){
    let dict = {}
    let htmlProperties = document.querySelectorAll('.property')
    for(let elem of htmlProperties){
      let left = elem.querySelector('.left_property').textContent
      let right = elem.querySelector('.right_property').value
      dict[left] = right.toLowerCase();
    }
    importKML(layerID, dict, features)
    hideDialog('comparison-KML')
  }

  function clearLayer(layerID){
    let layer = findLayer(layerID);
    const kmlType = layer.get('kmlType');
    ons
    .notification.confirm({title: 'Очистка слоя', messageHTML: `<p class="notification-alert">Вы уверены, что хотите очитстить слой ${layer.label}?</p>`, buttonLabels: ["Нет", "Да"]})
    .then(function(index) {
        if(index == 1){
          if (kmlType) {
            const features = layer.getSource().getFeatures();
            features.forEach(feature => feature.deleted = true);
            syncChangesWithKML(layerID);
          } else {
            let query = `DELETE FROM ${layer.id}`;
            requestToDB(query, function(res){
              layer.getSource().clear(true);
              ons.notification.alert({title:"Внимание", message:`Слой ${layer.label} очищен`});
              saveDB();
            });
          }
        }
    });

  }

  function clickRasterMenu(event){
    event.stopPropagation()
    showRasterSheet()
  }

function createBaseRasterList(){
  const template = document.querySelector('#layerListItem');
  const list = document.querySelector('#base-raster-layers-list-content');
  const sortBaseLayers = baseRasterLayers.sort((a, b) => b.getZIndex() - a.getZIndex());
  console.log(sortBaseLayers);
  
  sortBaseLayers.forEach((layer) => {
    const listItem = template.content.cloneNode(true);
    listItem.querySelector('.layer-label').textContent = layer.get('descr');
    
    // ЗАМЕНА Cordova пути на Electron путь
    const iconUrl = './resources/images/logos/' + layer.get('icon');
    const iconElement = listItem.querySelector('.icon-layer');
    
    // Используем fetch или electronAPI для загрузки изображения
    loadImageForElectron(iconUrl, iconElement, () => {
      console.log('Icon not found, using default');
      loadImageForElectron('./resources/images/logos/map_24x24.png', iconElement, () => {
        console.log('Default icon not found');
      });
    });
    
    if(layer.getVisible())
      listItem.querySelector('.list-group-item').style.backgroundColor = 'rgb(99 156 249)';
    listItem.querySelector('.block-icon').style['display'] = 'none';
    listItem.querySelector('.list-group-item').setAttribute("data-id", layer.get("id"));
    listItem.querySelector('.layers-more-button').setAttribute("layer_id", layer.get("id"));
    listItem.querySelector('.layers-more-button').addEventListener('click', function(event){baseLayersShowActionSheet(this, event)});
    list.appendChild(listItem);
  });

  Sortable.create(list, {
    handle: '.reorder-move',
    animation: 150,
    onUpdate: function(event){
      const layersList = this.toArray()
      let count = layersList.length;
      for(layerID of this.toArray()){
        let layer = getLayerById(layerID);
        layer.setZIndex(count);
        count--;
      }
      updateInfo();
    }
  });
}

// Новая функция для загрузки изображений в Electron
async function loadImageForElectron(imagePath, imgElement, onError) {
  try {
    // Пробуем загрузить через стандартный путь
    imgElement.src = imagePath;
    
    // Проверяем загрузилось ли изображение
    imgElement.onload = () => console.log('Image loaded:', imagePath);
    imgElement.onerror = () => {
      console.log('Image not found:', imagePath);
      
      // Пробуем абсолютный путь через electronAPI
      if (typeof electronAPI !== 'undefined' && electronAPI.getResourcePath) {
        electronAPI.getResourcePath().then(resourcePath => {
          const absolutePath = `${resourcePath}/images/logos/${imagePath.split('/').pop()}`;
          electronAPI.exists(absolutePath).then(exists => {
            if (exists) {
              imgElement.src = `file://${absolutePath}`;
            } else {
              onError();
            }
          });
        });
      } else {
        onError();
      }
    };
  } catch (error) {
    console.error('Error loading image:', error);
    onError();
  }
}

// Альтернативная версия с использованием fetch
async function loadImageWithFetch(imagePath, imgElement, onError) {
  try {
    const response = await fetch(imagePath);
    if (response.ok) {
      const blob = await response.blob();
      imgElement.src = URL.createObjectURL(blob);
    } else {
      // Пробуем загрузку через electronAPI
      if (typeof electronAPI !== 'undefined') {
        try {
          const resourcePath = await electronAPI.getResourcePath();
          const fullPath = `${resourcePath}/images/logos/${imagePath.split('/').pop()}`;
          const exists = await electronAPI.exists(fullPath);
          if (exists) {
            imgElement.src = `file://${fullPath}`;
            return;
          }
        } catch (e) {
          console.log('Electron API not available for image loading');
        }
      }
      onError();
    }
  } catch (error) {
    console.error('Fetch error:', error);
    onError();
  }
}

function baseLayersShowActionSheet(element, event){
  event.stopPropagation();
  const layerID = element.getAttribute('layer_id');
  const layer = getLayerById(layerID);
  if(layer){
    const useLocalTiles = layer.get('useLocalTiles');
    if(useLocalTiles){
      ons.openActionSheet({
        cancelable: true,
        buttons: [
          {
            label: 'Использовать тайлы с интернета',
            modifier: 'destructive'
          },
          {
            label: 'Назад',
            icon: 'md-close'
          }
        ]
      }).then(function (index) {
        if(index === 0){
          const remote_url = layer.get('remote_url');
          layer.getSource().setTileLoadFunction(tileLoadFunctionDefault);
          if(layer.get("id") === 'Rosreestr')
            layer.getSource().setTileUrlFunction(rosreetrUrlFunction);
          else
            layer.getSource().setUrl(remote_url);
          layer.set('useLocalTiles', false);
          updateInfo();
        }
      });
    }
    else{
      ons.openActionSheet({
        cancelable: true,
        buttons: [
          {
            label: 'Использовать тайлы на устройстве',
            modifier: 'destructive'
          },
          {
            label: 'Назад',
            icon: 'md-close'
          }
        ]
      }).then(function (index) {
        if(index === 0){
          const local_path = layer.get('local_path');
          layer.getSource().setUrl(main_directory + local_path);
          layer.getSource().setTileLoadFunction(tileLoadFunctionLocal);
          layer.set('useLocalTiles', true);
          updateInfo();
        }
      });
    }
  }
}

function loadImageFromFile(filename, element, onError) {
    window.resolveLocalFileSystemURL(filename, addIconToElement, onError);

    function addIconToElement(fileEntry){
        fileEntry.file(function (file) {
            const reader = new FileReader();
            reader.onloadend = function() {
                if (this.result) {
                    const blob = new Blob([new Uint8Array(this.result)], { type: "image/png" });
                    element.src = window.URL.createObjectURL(blob);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }
}
