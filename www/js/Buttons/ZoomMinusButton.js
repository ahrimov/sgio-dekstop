class ZoomMinusButton extends ol.control.Control {
    constructor(opt_options) {
        const options = opt_options || {};

        const buttonZoomMinus = ons.createElement(`<div class='map-button zoom-minus' id='zoom-minus'><ons-fab modifier='mini'>
            <ons-icon class='icon' icon='md-minus'></ons-icon>
        </ons-fab></div>`);

        super({
            element: buttonZoomMinus,
            target: options.target,
        });

        buttonZoomMinus.addEventListener('click', this.zoomMinus.bind(this), false);
    }

    zoomMinus(){
        const view = this.getMap().getView();
        const zoom = view.getZoom();
        view.setZoom(zoom - 1)
    }
}