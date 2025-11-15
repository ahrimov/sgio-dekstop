class UndoButton extends ol.control.Control {
    constructor(opt_options) {
        const options = opt_options || {};
    
        const undoButton = ons.createElement(`<div class='map-button undo-button'><ons-fab modifier='mini'>
                                                <ons-icon class='icon' icon='md-undo'></ons-icon>
                                            </ons-fab></div>`)
    
        super({
          element: undoButton,
          target: options.target,
        });

        undoButton.addEventListener('click', this.undoDraw.bind(this), false);
      }

      undoDraw(){
        if(typeof map.draw != 'undefined'){
            map.draw.removeLastPoint()
            let coordString = map.draw.currentFeature.getGeometry().getCoordinates().toString()
            let len = coordString.split(',').length
            if(map.draw.currentFeature.getGeometry().getType() == 'LineString'){
              if(len <= 2){
                finishDraw()
              }
            }
            if(map.draw.currentFeature.getGeometry().getType() == 'Polygon'){
              if(len <= 4){
                finishDraw()
              }
            }
      }
    }
}
