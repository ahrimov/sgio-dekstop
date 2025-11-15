class AcceptModifyButton extends ol.control.Control {
    constructor(opt_options) {
      const options = opt_options || {};
  
      const acceptModifyButton = ons.createElement(`<div class='map-button accept-modify-button' id="accept-modify-button"><ons-fab class='accept-modify-button-fab'>
                                                    <ons-icon class='icon' icon='md-check'></ons-icon>
                                                </ons-fab></div>`)
  
      super({
        element: acceptModifyButton,
        target: options.target,
      });

      acceptModifyButton.addEventListener('click', this.acceptModify.bind(this), false);
    }

    acceptModify(){
        let button = document.querySelector('.accept-modify-button-fab')
        if(typeof map != 'undefined' && typeof map.modify != 'undefined'){
            finishModify();
        }
            //document.querySelector('#myNavigator').pushPage('./views/newFeature.html', {data: {layer: map.activeLayer, feature: map.draw.currentFeature}});
    }
}