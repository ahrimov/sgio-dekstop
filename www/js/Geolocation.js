const gpsMarkerStyle = [
        new ol.style.Style({
        image: new ol.style.RegularShape({
            fill: new ol.style.Fill({color: 'rgba(35, 117, 250, 0.65)'}),
            points: 3,
            angle: 0,
            displacement: [0, 8],
            radius: 11,
            radius2: 6,
            rotateWithView: false
        })
    }),
    new ol.style.Style({
        image: new ol.style.Circle({
          radius: 8,
          fill: new ol.style.Fill({color: '#2375fa'}),
          stroke: new ol.style.Stroke({
            color: 'white',
            width: 3,
          })
        }),
    })
];

const gpsAccuracyStyle = new ol.style.Style({
    fill: new ol.style.Fill({color: 'rgba(255, 255, 255, 0.3)'}),
    stroke: new ol.style.Stroke({
        color: '#2375fa',
        width: 1
    })
})

const navigationArrowStyle = new ol.style.Style({
    image: new ol.style.Icon({
        src: '../resources/navigation-arrow-white-empty.png',
        color: '#2375fa',
        crossOrigin: 'anonymous',
        scale: 0.3,
        rotateWithView: false
    })
});

function turnGPS(){
    const influenceOfAccuracy = 0.01;
    let listener = null;
    const center = map.getView().getCenter();

    const currentPosition = new ol.geom.Point(center);

    const geoMarker = new ol.Feature({name: GEO_MARKER_NAME});

    geoMarker.setStyle(gpsMarkerStyle);

    const gpsAccuracy = new ol.Feature({
        name: GPS_ACCURACY_NAME
    });
    gpsAccuracy.setStyle(gpsAccuracyStyle);

    const gpsSource = new ol.source.Vector();
    const gpsLayer = new ol.layer.Vector({
        id: GPS_LAYER_ID,
        source: gpsSource,
        //updateWhileAnimating: true,
        updateWhileInteracting: true,
        zIndex: Infinity
    });

    gpsSource.addFeatures([geoMarker, gpsAccuracy]);

    map.addLayer(gpsLayer); 

    const positions = new ol.geom.LineString([]);

    const lineFeature = new ol.Feature({
        geometry: positions,
    });
    
    gpsSource.addFeature(lineFeature);

    navigator.geolocation.watchPosition(function(geoposition){

        const coords = [
            parseFloat(geoposition.coords.longitude.toFixed(5)), 
            parseFloat(geoposition.coords.latitude.toFixed(5))
        ];

        const coordinates = positions.getCoordinates();
        const len = coordinates.length;
        if(len > 1){
            const prevCoord = coordinates[len - 1];
            const distance = measure(coords[0], coords[1], prevCoord[0], prevCoord[1]);
            if(distance < geoposition.coords.accuracy * influenceOfAccuracy || listener){
                return;
            } 
        }

        positions.appendCoordinate(coords);
        positions.setCoordinates(positions.getCoordinates().slice(-2));

        gps_position = geoposition;

        currentPosition.setCoordinates(ol.proj.fromLonLat(coords, map.getView().getProjection()));

        geoMarker.setGeometry(currentPosition);

        let accuracy = ol.geom.Polygon.circular(coords, geoposition.coords.accuracy);
        gpsAccuracy.setGeometry(accuracy.transform('EPSG:4326', map.getView().getProjection()));

        if(navigationMode === NAVIGATION_MODE.HOLD_CENTER_MAP){
            map.getView().setCenter(ol.proj.fromLonLat(coords, map.getView().getProjection()));
        }

    }, function(error){
        console.log(`Error code: ${error.code} \n Error message: ${error.message}`);
    }, {
        maximumAge: 50,
        enableHighAccuracy: true,
        timeout: 600000,
    });

    let localPrevRadians;

    let viewRotation = 0;

     window.addEventListener("deviceorientationabsolute", function(event){
        const accuracy = 0.001;
        const compassbearing = Number(360 - event.alpha).toFixed();
        let radians = (compassbearing * (Math.PI/180)).toFixed(2);
        if(!localPrevRadians){
            localPrevRadians = radians;
        }
        if(Math.abs(localPrevRadians - radians) < accuracy) return;
        if(navigationMode === NAVIGATION_MODE.DISABLED){
            gpsMarkerStyle[0].getImage().setRotation(viewRotation + parseFloat(radians));
            geoMarker.setStyle(gpsMarkerStyle);
            localPrevRadians = radians;
        }
        if(navigationMode === NAVIGATION_MODE.TURN_NAVIGATION_ARROW){
            const style = geoMarker.getStyle();
            style.getImage().setRotation(viewRotation + parseFloat(radians));
            geoMarker.setStyle(style);
            localPrevRadians = radians;
        }
     }, true);

     map.getView().on('change:rotation', function(event){
        viewRotation = map.getView().getRotation();
        if(navigationMode === NAVIGATION_MODE.TURN_NAVIGATION_ARROW || 
            navigationMode === NAVIGATION_MODE.HOLD_CENTER_MAP){
            document.getElementById('compass-arrow').style.transform = `rotate(${viewRotation}rad)`;
        }
     })
}

function measure(lat1, lon1, lat2, lon2){  // generally used geo measurement function
    var R = 6378.137; // Radius of earth in KM
    var dLat = lat2 * Math.PI / 180 - lat1 * Math.PI / 180;
    var dLon = lon2 * Math.PI / 180 - lon1 * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d * 1000; // meters
}

function turnOnNavigation(){
    const layer = getLayerById(GPS_LAYER_ID);
    if(!layer) return;

    document.getElementById('compass-arrow').style.display = 'block';
    const viewRotation = map.getView().getRotation();
    document.getElementById('compass-arrow').style.transform = `rotate(${viewRotation}rad)`;

    const geoMarker = getFeatureByName(GEO_MARKER_NAME, layer);
    geoMarker.setStyle(navigationArrowStyle);
    const gpsAccuracy = getFeatureByName(GPS_ACCURACY_NAME, layer);
    gpsAccuracy.setStyle(new ol.style.Style({}));
}

function turnOffNavigation(){
    const layer = getLayerById(GPS_LAYER_ID);
    if(!layer) return;

    document.getElementById('compass-arrow').style.display = 'none';

    const geoMarker = getFeatureByName(GEO_MARKER_NAME, layer);
    geoMarker.setStyle(gpsMarkerStyle);
    const gpsAccuracy = getFeatureByName(GPS_ACCURACY_NAME, layer);
    gpsAccuracy.setStyle(gpsAccuracyStyle);
}

let prevRadians;

function getOrientation(event) {
    const accuracy = 0.025;
    const compassbearing = Number(360 - event.alpha).toFixed();
    const view = map.getView();
    let radians = (-compassbearing * (Math.PI/180)).toFixed(2);
    if(!prevRadians)
        prevRadians = radians;
    if(Math.abs(prevRadians - parseFloat(radians)) > accuracy){
        prevRadians = parseFloat(radians);
        view.setRotation(radians);
    }
}