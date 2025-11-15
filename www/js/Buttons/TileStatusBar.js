class TileStatusBar extends ol.control.Control {
    constructor(opt_options) {
      const options = opt_options || {};
  
      let div = document.createElement('div')
      div.id = "tile-status-bar";
      div.className = "att"
      let str = `<span class='dot'></span>
                <span id='info-label' >Онлайн</span>`
      div.innerHTML = str.trim()                           
      const element = document.createElement('div');
      element.className = 'buttons'
      element.appendChild(div)
        
      super({
        element: element,
        target: options.target,
      });
  
    }    
}