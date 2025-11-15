// global variable for js/home.js
let mapContainerDownBarHeight = '90%';
let crosshairDownbarTop = "45%";

function transformUIToOrientation(){
  return;
  switch(screen.orientation.type){
    case 'portrait-primary':
    case 'portrait-secondary':
      portraitMode();
      break;
    case 'landscape-primary':
    case 'landscape-secondary':
      landscapeMode();
      break;
    default:
      break;
  }
} 

function portraitMode(){
    document.getElementById('zoom-plus').style.top = zoomPlusButtonPortraitTop;
    document.getElementById('zoom-minus').style.top = zoomMinusButtonPortraitTop;
    document.getElementById('draw-button').style.top = drawButtonPortraitTop;
    document.getElementById('draw-button').style.left = drawButtonPortraitLeft;
    document.getElementById('accept-draw-button').style.top = acceptDrawButtonPortraitTop;
    document.getElementById('accept-draw-button').style.left = acceptDrawButtonPortraitLeft;
    document.getElementById('gps-button').style.top = gpsButtonPortraitTop;
    document.getElementById('gps-button').style.left = gpsButtonPortraitLeft;
    document.getElementById('nav-button').style.top = navigatorPortraitTop;
    document.getElementById('nav-button').style.left = navigatorPortraitLeft;
    document.getElementById('hold-center-button').style.top = holdCenterPortraitTop;
    document.getElementById('hold-center-button').style.left = holdCenterPortraitLeft;
    document.getElementById('tile-status-bar').style.top = tileStatusBarPortraitTop;
    document.getElementById('tile-status-bar').style.left = tileStatusBarPortraitLeft;
    mapContainerDownBarHeight = pageContentDownBarPortraitHeight;
    crosshairDownbarTop = crosshairDownBarPortraitTop;
    let drawBar = document.querySelector('#downbar-wrapper');
    drawBar.style.height = downbarPortraitHeight;
    if(drawBar.style["display"] === "grid"){
      openDrawBar();
    }
    let drawInstrumentBar = document.getElementById('draw-instrument-bar');
    drawInstrumentBar.style.height = downbarPortraitHeight;
    if(drawInstrumentBar.style["display"] === "block"){
      let mapContainer = document.querySelector('#map-container')
      mapContainer.style['height'] = mapContainerDownBarHeight;
      map.updateSize();
      document.querySelector('.crosshair').style['top'] = crosshairDownBarPortraitTop;
    }
    if(document.getElementById('add-feature-content') !== null)
      document.getElementById('add-feature-content').style.height = pageContentDownBarPortraitHeight;
    if(document.getElementById('save-feature-bar') !== null)
      document.getElementById('save-feature-bar').style.height = downbarPortraitHeight;
    if(document.getElementById('featureProperties') !== null) 
      document.getElementById('featureProperties').style.height = pageContentDownBarPortraitHeight;
    if(document.getElementById('save-modification-bar') !== null)   
      document.getElementById('save-modification-bar').style.height = downbarPortraitHeight;
    if(document.getElementById('feature-instruments') !== null)   
      document.getElementById('feature-instruments').style.height = downbarPortraitHeight;
    if(document.getElementById('accept-modify-button') !== null){   
      document.getElementById('accept-modify-button').style.top = acceptModifyButtonPortraitTop;
      document.getElementById('accept-modify-button').style.left = acceptModifyuttonPortraitLeft;
    }
    if(document.querySelector('#featureProperties .title') !== null){
        document.querySelector('#featureProperties .title').style.width = "40%"
    }
  }
  
  function landscapeMode(){
    document.getElementById('zoom-plus').style.top = zoomPlusButtonLandscapeTop;
    document.getElementById('zoom-minus').style.top = zoomMinusButtonLandscapeTop;
    document.getElementById('draw-button').style.top = drawButtonLandscapeTop;
    document.getElementById('accept-draw-button').style.top = acceptDrawButtonLandscapeTop;
    document.getElementById('draw-button').style.left = drawButtonLandscapeLeft;
    document.getElementById('accept-draw-button').style.left = acceptDrawButtonLandscapetLeft;
    document.getElementById('gps-button').style.top = gpsButtonLandscapeTop;
    document.getElementById('tile-status-bar').style.top = tileStatusBarLandscapeTop;
    document.getElementById('gps-button').style.left = gpsButtonLandscapeLeft;
    document.getElementById('tile-status-bar').style.left = tileStatusBarLandscapeLeft;
    document.getElementById('nav-button').style.top = navigatorLandscapeTop;
    document.getElementById('nav-button').style.left = navigatorLandscapeLeft;
    document.getElementById('hold-center-button').style.top = holdCenterLandscapeTop;
    document.getElementById('hold-center-button').style.left = holdCenterLandscapeLeft;
    mapContainerDownBarHeight = pageContentDownBarLandscapeHeight;
    crosshairDownbarTop = crosshairDownBarLandscapeTop ;
    let drawBar = document.querySelector('#downbar-wrapper');
    drawBar.style.height = downbarLandscapeHeight;
    if(drawBar.style["display"] === "grid"){
      openDrawBar();
    }
    let drawInstrumentBar = document.getElementById('draw-instrument-bar');
    drawInstrumentBar.style.height = downbarLandscapeHeight;
    if(drawInstrumentBar.style["display"] === "block"){
      let mapContainer = document.querySelector('#map-container');
      mapContainer.style['height'] = mapContainerDownBarHeight;
      map.updateSize();
      document.querySelector('.crosshair').style['top'] = crosshairDownBarLandscapeTop;
    }
    if(document.getElementById('add-feature-content') !== null)
      document.getElementById('add-feature-content').style.height = pageContentDownBarLandscapeHeight;
    if(document.getElementById('save-feature-bar') !== null)
      document.getElementById('save-feature-bar').style.height = downbarLandscapeHeight;
    if(document.getElementById('featureProperties') !== null) 
      document.getElementById('featureProperties').style.height = pageContentDownBarLandscapeHeight;
    if(document.getElementById('save-modification-bar') !== null)   
      document.getElementById('save-modification-bar').style.height = downbarLandscapeHeight;
    if(document.getElementById('feature-instruments') !== null)   
      document.getElementById('feature-instruments').style.height = downbarLandscapeHeight;
    if(document.getElementById('accept-modify-button') !== null){   
      document.getElementById('accept-modify-button').style.top = acceptModifyButtonLandscapeTop;
      document.getElementById('accept-modify-button').style.left = acceptModifyButtonLandscapetLeft;
    }
    if(document.querySelector('#featureProperties .title') !== null){
        document.querySelector('#featureProperties .title').style.width = "40%"
    }
  }