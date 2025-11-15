/**
 * Создание диалогового окна выбора режима редактирования геометрии
 * mapEditingCallback - function
 * manualEditingCallback - function
 * */
function createChooseEditGeometryModeDialog(mapEditingCallback, manualEditingCallback){
  ons.createElement('chooseTypeEditGeometry', {append: true})
    .then(function(dialog){
      document.querySelector('#choose-type-edit-geometry-button').addEventListener('click', () => {
        const mapRadio = document.querySelector('#choose-type-edit-geometry-map');
        const manualRadio = document.querySelector('#choose-type-edit-geometry-manual');
        if(mapRadio.checked){
          mapEditingCallback();
        }
        else if (manualRadio.checked){
          manualEditingCallback();
        }
        hideDialog('choose-type-edit-geometry');
      }, false)
      dialog.show()
  });
}