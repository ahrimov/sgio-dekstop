class ZoomPlusButton extends ol.control.Control {
  constructor(opt_options) {
    const options = opt_options || {};

    const buttonZoomPlus = ons.createElement(`<div class='map-button map-button zoom-plus' id='zoom-plus'><ons-fab modifier='mini'>
      <ons-icon class='icon' icon='md-plus'></ons-icon>
    </ons-fab></div>`);

    super({
      element: buttonZoomPlus,
      target: options.target,
    });

    buttonZoomPlus.addEventListener('click', this.zoomPlus.bind(this), false);
  }

  zoomPlus(){
    const view = this.getMap().getView();
    const zoom = view.getZoom();
    view.setZoom(zoom + 1)
  }
}