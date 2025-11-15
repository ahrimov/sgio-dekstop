class CompassArrow extends ol.control.Control {
    constructor(opt_options) {
      const options = opt_options || {};
  
      const compass = ons.createElement(`<img id='compass-arrow' class='compass' src='../resources/compass-arrow.png'>`)
  
      super({
        element: compass,
        target: options.target,
      });
    }
}