class Crosshair extends ol.control.Control {
    constructor(opt_options) {
      const options = opt_options || {};
  
      const crosshair = ons.createElement(`<img class='crosshair' src='../resources/crosshair.png'>`)
  
      super({
        element: crosshair,
        target: options.target,
      });
    }
}