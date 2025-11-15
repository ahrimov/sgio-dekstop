function transformDecimalToMinutesAndSeconds(value){
	const degrees = Math.floor(value);
	const minutes = getDecimalPortion(value) * 60;
	const seconds = getDecimalPortion(minutes) * 60;
	let minutesStr = Math.trunc(minutes).toString();
	minutesStr = minutesStr.length === 1 ? '0' + minutesStr : minutesStr;
	const secondsStr = seconds.toFixed(2);
	return `${degrees}°${minutesStr}'${secondsStr}"`;
}

function getDecimalPortion(float){
	return float % 1;
}

function transformToDecimal(value){
	const degrees = parseFloat(value.slice(0, value.indexOf('°')));
	const minutes = (parseFloat(value.slice(value.indexOf('°') + 1, value.indexOf('\''))) / 60) || 0;
	const seconds = (parseFloat(value.slice(value.indexOf('\'') + 1, value.indexOf('\'\''))) / 3600) || 0;
	const res = degrees + minutes + seconds;
	return res.toFixed(7);
}

/**
 * Получение соотвествующего зума для карты
 * @param dist в метрах или номерах масштаба
*/

function getZoomFromMeters(dist, map){
	try{
		if(typeof dist === 'number' && !isNaN(dist)) {
			if(dist <= 0) return NaN;
			if(dist <= 50)
				return dist;
			const extent = [0,1, dist, 0];
			return getZoomForExtent(extent, map);
		}
	} catch(ex) {
		console.log('Error while parsing zoom');
		return NaN;
	}
	return NaN;
}

function getZoomForExtent(extent, map){
	//const viewSize = map.getSize();
	const view = map.getView();
	const deviceWidth = window.screen.width * window.devicePixelRatio;
	const deviceHeight = window.screen.height * window.devicePixelRatio;
	const resolution = Math.max(ol.extent.getWidth(extent) / deviceWidth, ol.extent.getHeight(extent) / deviceHeight);
	return view.getZoomForResolution(resolution);
}

function convertColorToHEX(color){
	if(color.length === 8){
		return '#' + color.slice(2, 8);
	}
	return color;
}