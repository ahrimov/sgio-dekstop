class HoldCenterButton extends ol.control.Control {
    constructor(opt_options) {
        const options = opt_options || {};

        const holdCenterButton = ons.createElement(`
            <div class='hold-center-button' id='hold-center-button'>
                <ons-fab id='ons-hold-center-button' modifier='mini'>
                    <ons-icon id='hold-center-button-icon' class='icon' icon='md-center-focus-strong'>
                    </ons-icon>
                </ons-fab>
            </div>`
        );

        super({
            element: holdCenterButton,
            target: options.target,
        });

        holdCenterButton.addEventListener('click', this.holdCenter.bind(this), false);
    }

    holdCenter(){
        switch(navigationMode){
            case NAVIGATION_MODE.TURN_NAVIGATION_ARROW:
                navigationMode = NAVIGATION_MODE.HOLD_CENTER_MAP;
                document.getElementById('hold-center-button-icon').style.color = '#ffffff';
                document.getElementById('ons-hold-center-button').style.backgroundColor = '#2375fa';
                window.addEventListener('deviceorientationabsolute', getOrientation, true);
                map.getView().setCenter(ol.proj.fromLonLat([gps_position.coords.longitude, gps_position.coords.latitude]));
                map.getInteractions().forEach(x => x.setActive(false));
                const gpsLayer = getLayerById(GPS_LAYER_ID);
                const geoMarker = getFeatureByName(GEO_MARKER_NAME, gpsLayer);
                geoMarker.getStyle().getImage().setRotation(0);
                break;
            case NAVIGATION_MODE.HOLD_CENTER_MAP:
                navigationMode =  NAVIGATION_MODE.TURN_NAVIGATION_ARROW;
                document.getElementById('hold-center-button-icon').style.color = '#000000';
                document.getElementById('ons-hold-center-button').style.backgroundColor = '#ffffff';
                window.removeEventListener('deviceorientationabsolute', getOrientation, true);
                map.getInteractions().forEach(x => x.setActive(true));
                const view = map.getView();
                view.setRotation(0);
                break;
            default: break;
        }
    }
}