class GPSButton extends ol.control.Control {
    constructor(opt_options) {
        const options = opt_options || {};

        const gpsButton = ons.createElement(`<div class='map-button gps-button' id='gps-button'><ons-fab  modifier='mini'>
            <ons-icon class='icon' icon='md-gps'></ons-icon>
        </ons-fab></div>`);

        super({
            element: gpsButton,
            target: options.target,
        });

        gpsButton.addEventListener('click', this.centerGPS.bind(this), false);
    }

    centerGPS(){
        if(!hasGeolocationPermission){
            ons.notification.toast('Доступ к геолокации заблокирован', {timeout: 1000, animation: "ascend"}); 
            return;
        }

        if(!gps_position) {
            ons.notification.toast('Ожидание gps-сигнала', {timeout: 1000, animation: "ascend"}); 
            return;
        }
        map.getView().animate({
            center: ol.proj.fromLonLat([gps_position.coords.longitude, gps_position.coords.latitude])
        });
    }
}