class AcceptDrawButton extends ol.control.Control {
    constructor(opt_options) {
      const options = opt_options || {};
  
      const acceptDrawButton = ons.createElement(`<div class='map-button accept-draw-button' id="accept-draw-button"><ons-fab class='accept-draw-button-fab'>
                                                    <ons-icon class='icon' icon='md-check'></ons-icon>
                                                </ons-fab></div>`)
  
      super({
        element: acceptDrawButton,
        target: options.target,
      });

      acceptDrawButton.addEventListener('click', this.acceptDraw.bind(this), false);
    }

    acceptDraw(){
        let button = document.querySelector('.accept-draw-button-fab')
        if(!button.disabled){
            let coordString = map.draw.currentFeature.getGeometry().getCoordinates().toString()
            let coords = coordString.split(',')
            let len = coords.length
            if(map.draw.currentFeature.getGeometry().getType() == 'LineString'){
              if(len <= 2){
                ons.notification.alert({
                  title:'Внимание',
                  message:'Невозможно создать геометрию объекта'
                })
                return;
              }
              if(len == 4 && coords[0] == coords[2] && coords[1] == coords[3]){
                ons.notification.alert({
                  title:'Внимание',
                  message:'Невозможно создать геометрию объекта. Слишком мало узлов.'
                })
                return;
              }
            }
            if(map.draw.currentFeature.getGeometry().getType() == 'Polygon'){
              if(len <= 4){
                ons.notification.alert({
                  title:'Внимание',
                  message:'Невозможно создать геометрию объекта'
                });
                return;
              }
            }
            
            map.draw.finishDrawing();
            document.querySelector('#myNavigator').pushPage('./views/newFeature.html', {data: {
              layer: map.activeLayer, 
              feature: map.draw.currentFeature, 
              fromMap: true
            }});
        }
    }
}