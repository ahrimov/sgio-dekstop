class CancelButton extends ol.control.Control {
    constructor(opt_options) {
        const options = opt_options || {};

        const cancelButton = ons.createElement(`<div class='map-button cancel-button' id='cancel-button'><ons-fab modifier='mini'>
            <ons-icon class='icon' icon='md-close'></ons-icon>
        </ons-fab></div>`)

        super({
            element: cancelButton,
            target: options.target,
        });

        cancelButton.addEventListener('click', this.cancelDraw.bind(this), false);
    }

    cancelDraw(){
        if(typeof map.draw?.currentFeature != 'undefined'){
            let layer = map.activeLayer
            layer.getSource().removeFeature(map.draw.currentFeature)
        }

        if (map.draw) finishDraw();

        if (map.modify) {
            map.modify.modifyFeature?.setGeometry(map.modify.oldGeometry);
            removeModify();
        }
    }
}