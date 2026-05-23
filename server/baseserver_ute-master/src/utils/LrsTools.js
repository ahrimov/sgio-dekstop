const simplify = require('simplify-js');
const gdal = require('gdal');
const nearestPointOnLine = require('@turf/nearest-point-on-line');
const multilinestring = require('turf-multilinestring');
const turf = require('@turf/turf');
const GeoFuncs = require("./GeoFuncs");
const LinearOp = require("./LinearOp");
const {ErrorHandler, config, logger} = require("gis-core");
const {lang, errors} = require("../resources");

/**
 * Класс содержит функции проецирования объектов
 */
class LrsTools{
	/**
	 *
	 * @param tblObjects Массив выбранных объектов для проецирования
	 * @param tblAxes ось, куда будут объекты проецироваться
	 * @param meta
	 * @param size количество точек для проецирования
	 */
	static projectLineObjects( tblObjects,  tblAxes, meta, size = 50000){
		if (tblAxes.rows.length < 2)
			throw new ErrorHandler(errors.gis_offline_line_1);

		let bufWidth = parseFloat(meta.bufferWidth) || 0;

		let infoFields = meta.infoFields.split(',');
		let measureField = 'MEASURE';
		let valFields = meta.valFields.split(',');
		let axeId = meta.axeId;
		let seqField = meta.seqField;
		for(let row of tblAxes.rows){
			row.X = row.X_COORD;
			row.Y = row.Y_COORD;
			row.ID = row.STATION_ID;
		}

		// Создание линейного объекта оси коридора
		let axisGeom = this.getLineLRS(tblAxes, "STATION_ID", valFields, infoFields);
		if (axisGeom.length === 0)
			throw new ErrorHandler(errors.gis_offline_line_1);
		let zone = parseInt((axisGeom[0][0].x + 3) / 6 + 1);

		//Построение буфера
		let minX = Number.MAX_VALUE;
		let minY = Number.MAX_VALUE;
		let maxX = Number.MIN_VALUE;
		let maxY = Number.MIN_VALUE;
		let bufGeom;
		if (bufWidth > 0){
			let bufAxisGeom = this.createLinearObjectDispersed1(tblAxes, bufWidth * 0.000001);
			//GeoFuncs.convertWgs84ToGC(bufAxisGeom, zone);
			// Создание площадного объекта буфера
			bufGeom = bufAxisGeom.buffer(bufWidth, 5);
			if (!bufGeom)
				throw new ErrorHandler(errors.gis_offline_line_2);
			//GeoFuncs.convertCSToWgs84(bufGeom, zone);

			bufGeom.rings.forEach(line => {
				line.points.forEach(p => {
					minX = Math.min(minX, p.x);
					minY = Math.min(minY, p.y);
					maxX = Math.max(maxX, p.x);
					maxY = Math.max(maxY, p.y);
				});
			});
		}
		//GeoFuncs.convertWgs84ToGC(axisGeom, zone);
		let i = 0;
		for(let r of tblObjects.rows){
			i++;
			if (!r.WKB_GEOMETRY)
				continue;
			let xMin = r.MINX;
			let yMin = r.MINY;
			let xMax = r.MAXX;
			let yMax = r.MAXY;

			if (bufGeom && (maxX <= xMin || maxY <= yMin || minX >= xMax || minY >= yMax))
				continue;
			let geom;
			try{
				geom = gdal.Geometry.fromWKB(r.WKB_GEOMETRY);
			}
			catch(ex){
				continue;
			}
			if(!geom)
				continue;

			if (bufGeom && !bufGeom.intersects(geom))
				continue; // пропускаем точку не попавшую в буффер

			// Перебор координат геометрии для нахождения проекции и расстояния до оси
			let sVals = {};//new Dictionary<string, object>();
			let eVals = {};//new Dictionary<string, object>();

			let dist = NaN, sDist = NaN, eDist = NaN,
				sSeq = NaN, eSeq = NaN,
				sPnt = null, ePnt = null;

			let coords = GeoFuncs.getCoordsFromGdalGeometry(geom);

			for (let coord of coords){
				let p = new gdal.Point(coord.x, coord.y);
				//GeoFuncs.convertWgs84ToGC(p, zone);
				let c = p;
				// Проекция на ось
				let alp = this.createProjectedPoint(axisGeom, c);

				if (!alp){
					logger.info(`Не удалось найти проекцию точки (${c.x}, ${c.y}).`);
					continue;
				}
				if(alp.vals[measureField]) // к measure ближайшего узла добавляем расстояние до спроецированной точки
					alp.vals[measureField] += alp.location;
				sVals = {...sVals, ...alp.vals};
				eVals = {...eVals, ...alp.info};
				//let d = c.distance(new gdal.Point(alp.x, alp.y));
				// дистанция через turf дает отличие в 6см с C#.
				// Через gdal намного больше различие. Причина такого поведения не прорабатывалась
				let d = alp.location;//alp.distance;//turf.distance(from, to);
				if (isNaN(dist) || dist > d)
					dist = d;
			}

			if (!isNaN(Number(r.DISTANCE)) && r.DISTANCE <= dist)
				continue;
			// Обновление таблицы
			r.DISTANCE = dist.toFixed(4);

			Object.keys(sVals).forEach(key => {
				if(key === 'STATION')
					r['KM_START'] = sVals[key];
				if(key === 'MEASURE')
					r['LINE_COORD_START'] = sVals[key];
			});
			Object.keys(eVals).forEach(key => {
				r[key] = eVals[key];
			});
		}
	}
	/**
	 *
	 * @param tblObjects Массив выбранных объектов для проецирования
	 * @param tblAxes ось, куда будут объекты проецироваться
	 * @param meta
	 * @param size количество точек для проецирования
	 */
	static projectOfflineObjects( tblObjects,  tblAxes, meta, size = 50000){
		if (tblAxes.rows.length < 2)
			throw new ErrorHandler(errors.gis_offline_line_1);

		let bufWidth = parseFloat(meta.bufferWidth) || 0;
		let justBounds = meta.justBounds ||  false;

		let valFields = meta.valFields.split(',');
		let infoFields = meta.infoFields.split(',');
		let measureField = meta.measureField;
		let seqField = meta.seqField;

		// Создание линейного объекта оси коридора
		let axisGeom = this.getLRS(tblAxes, "ID", valFields, infoFields);
		if (axisGeom.length === 0)
			throw new ErrorHandler(errors.gis_offline_line_1);
		let zone = (axisGeom[0][0].x + 3) / 6 + 1;

		//Построение буфера
		let minX = Number.MAX_VALUE;
		let minY = Number.MAX_VALUE;
		let maxX = Number.MIN_VALUE;
		let maxY = Number.MIN_VALUE;
		let bufGeom;
		if (bufWidth > 0){
			let bufAxisGeom = this.createLinearObjectDispersed(tblAxes, bufWidth * 0.000001);
			//GeoFuncs.convertWgs84ToGC(bufAxisGeom, zone);
			// Создание площадного объекта буфера
			bufGeom = bufAxisGeom.buffer(bufWidth, 5);
			if (!bufGeom)
				throw new ErrorHandler('Не удалось создать буфер.');
			//GeoFuncs.convertCSToWgs84(bufGeom, zone);

			bufGeom.rings.forEach(line => {
				line.points.forEach(p => {
					minX = Math.min(minX, p.x);
					minY = Math.min(minY, p.y);
					maxX = Math.max(maxX, p.x);
					maxY = Math.max(maxY, p.y);
				});
			});
		}
		//GeoFuncs.convertWgs84ToGC(axisGeom, zone);

		for(let r of tblObjects.rows){
			if (!r.WKB_GEOMETRY)
				continue;
			let xMin = r.MINX;
			let yMin = r.MINY;
			let xMax = r.MAXX;
			let yMax = r.MAXY;

			if (bufGeom && (maxX <= xMin || maxY <= yMin || minX >= xMax || minY >= yMax))
				continue;
			let geom;
			try{
				geom = gdal.Geometry.fromWKB(r.WKB_GEOMETRY);
			}
			catch(ex){
				continue;
			}
			if(!geom)
				continue;

			if (bufGeom && !bufGeom.intersects(geom))
				continue; // пропускаем точку не попавшую в буффер

			// Перебор координат геометрии для нахождения проекции и расстояния до оси
			let sVals = {};//new Dictionary<string, object>();
			let eVals = {};//new Dictionary<string, object>();

			let dist = NaN, sDist = NaN, eDist = NaN,
			sSeq = NaN, eSeq = NaN,
			sPnt = null, ePnt = null;

			let coords = GeoFuncs.getCoordsFromGdalGeometry(geom);
			/*if (justBounds){
				let coordList = [];//new List<ICoordinate>();
				for(let x in xMin != xMax ? new double[] { xMin, xMax } : new double[] { xMin }){
					for(let y in yMin != yMax ? new double[] { yMin, yMax } : new double[] { yMin }){
						coordList.push(new Coordinate(x, y));
					}
				}
				coords = coordList.ToArray();
			}*/

			for (let coord of coords){
				let p = new gdal.Point(coord.x, coord.y);
				//GeoFuncs.convertWgs84ToGC(p, zone);
				let c = p;
				// Проекция на ось
				let alp = this.createProjectedPoint(axisGeom, c);

				if (!alp){
					logger.info(`Не удалось найти проекцию точки (${c.x}, ${c.y}).`);
					continue;
				}

				let measure = alp.vals[measureField];
				let seq = seqField ? 0 : Number(alp.info[seqField]);
				if (isNaN(sDist) || sSeq > seq || (sSeq === seq && sDist > measure)){
					sDist = measure;
					sSeq = seq;
					sVals = {...sVals, ...alp.vals};
					sVals = {...sVals, ...alp.info};
					sPnt = new gdal.Point(alp.x, alp.y);
				}
				if (isNaN(eDist) || eSeq < seq || (eSeq === seq && eDist < measure)){
					eDist = measure;
					eSeq = seq;
					sVals = {...eVals, ...alp.vals};
					sVals = {...eVals, ...alp.info};
					ePnt = new gdal.Point(alp.x, alp.y);
				}

				let d = c.distance(new gdal.Point(alp.x, alp.y));
				if (isNaN(dist) || dist > d)
					dist = d;
			}

			if (!isNaN(Number(r.DISTANCE)) && r.DISTANCE <= dist)
				continue;
			// Обновление таблицы
			r.DISTANCE = dist.toFixed(2);

			Object.keys(sVals).forEach(key => {
				r[key + '_START'] = sVals[key];
			});
			Object.keys(eVals).forEach(key => {
				r[key + '_END'] = eVals[key];
			});

			if (sPnt != null){
				GeoFuncs.convertCSToWgs84(sPnt, zone);
				r.X_START = sPnt.x;
				r.Y_START = sPnt.y;
			}
			if (ePnt != null){
				GeoFuncs.convertCSToWgs84(ePnt, zone);
				r.X_END = ePnt.x;
				r.Y_END = ePnt.y;
			}
		}
	}

	/**
	 * Создание линейного объекта оси коридора
	 * В данном случае, в отличае от c# создаем просто массив точек вместо мультилинии, чтобы далее использовать доп. свойства точек
	 * @param tab
	 * @param idField
	 * @param valFields
	 * @param infoFields
	 * @returns {null|*[]}
	 */
	static getLRS(tab, idField, valFields, infoFields){
		let routes = [];//new List<LineString>();
		let points = [];//new List<LinearPoint>();
		let prevId = null;
		for (let row of tab.rows){
			let curId = row[idField];
			if (curId !== prevId){
				if (points.length > 1){
					routes.push(points);
				}
				points = [];//new List<LinearPoint>();
				prevId = curId;
			}
			let vals = {};//new Dictionary<string, double>();
			let info = {};//new Dictionary<string, object>();
			if (valFields){
				for (let fld of valFields){
					vals[fld] = Number(row[fld]);
				}
			}
			if (infoFields){
				for (let fld of infoFields){
					info[fld] = row[fld];
				}
			}
			points.push({
				x: Number(row.X),
				y: Number(row.Y),
				vals: vals,
				info: info,
			}); //new LinearPoint(Convert.ToDouble(row["X"]), Convert.ToDouble(row["Y"]), vals, info)
		}
		if (points.length > 1){
			routes.push(points);
		}
		if (routes.length <= 0)
			return [];
		return routes;
	}

	/**
	 * Создание линейного объекта оси коридора для трассовых объектов
	 * В данном случае, в отличае от c# создаем просто массив точек вместо мультилинии, чтобы далее использовать доп. свойства точек
	 * @param tab
	 * @param idField
	 * @param valFields
	 * @param infoFields
	 * @returns {null|*[]}
	 */
	static getLineLRS(tab, idField, valFields, infoFields){
		let points = [];//new List<LinearPoint>();
		let prevId = null;
		for (let row of tab.rows){
			let curId = row[idField];
			if (curId !== prevId){
				prevId = curId;
			}
			let vals = {};//new Dictionary<string, double>();
			let info = {};//new Dictionary<string, object>();
			if (valFields){
				for (let fld of valFields){
					vals[fld] = Number(row[fld]);
				}
			}
			if (infoFields){
				for (let fld of infoFields){
					info[fld] = row[fld];
				}
			}
			points.push({
				x: Number(row.X),
				y: Number(row.Y),
				vals: vals,
				info: info,
			}); //new LinearPoint(Convert.ToDouble(row["X"]), Convert.ToDouble(row["Y"]), vals, info)
		}
		if (points.length === 0)
			return [];
		return [points];
	}


	/**
	 *
	 * @param tblPoints
	 * @param tolerance
	 * @returns {null|MultiLineString}
	 */
	static createLinearObjectDispersed(tblPoints, tolerance){
		let routes = [];//new List<LineString>();
		let points = [];//new List<Coordinate>();
		let curSeriesId = -1;
		for (let i = 0; i < tblPoints.rows.length; i++){
			let row = tblPoints.rows[i];
			let seriesId = parseInt(row.ID);
			let pnt = new gdal.Point(Number(row.X), Number(row.Y));
			if (seriesId !== curSeriesId){
				if (points.length > 1){
					let route = new gdal.LineString();
					route.points.add(points);
					routes.push(route);
				}
				points = [];//new List<Coordinate>();
				curSeriesId = seriesId;
				//points.push(pnt);//????
			}
			points.push(pnt);
		}
		if (points.length > 1){
			let route = new gdal.LineString();
			route.points.add(points);
			routes.push(route);
		}
		if (routes.length <= 0)
			return null;

		let simpRoutes = [];//new List<LineString>();
		for (let line of routes){
			//либо через gdal simplify
			let simp = line.simplify(tolerance);//simplify(line.points.toArray, tolerance);//DouglasPeuckerLineSimplifier.Simplify(line.Coordinates, tolerance);
			/*let lineString = new gdal.LineString();
			lineString.points.add(simp);
			simpRoutes.push(lineString);*/
			simpRoutes.push(simp);
		}
		//let multiLine = new gdal.MultiLineString(simpRoutes);
		let multiLine = new gdal.MultiLineString();
		multiLine.children.add(simpRoutes);
		return multiLine;
	}

	static createLinearObjectDispersed1(tblPoints, tolerance){
		let routes = [];//new List<LineString>();
		let points = [];//new List<Coordinate>();
		let curSeriesId = -1;
		for (let i = 0; i < tblPoints.rows.length; i++){
			let row = tblPoints.rows[i];
			let seriesId = parseInt(row.ID);
			let pnt = new gdal.Point(Number(row.X), Number(row.Y));
			points.push(pnt);
		}
		let route = new gdal.LineString();
		route.points.add(points);
		routes.push(route);
		if (routes.length <= 0)
			return null;

		let simpRoutes = [];//new List<LineString>();
		for (let line of routes){
			//либо через gdal simplify
			let simp = line.simplify(tolerance);//simplify(line.points.toArray, tolerance);//DouglasPeuckerLineSimplifier.Simplify(line.Coordinates, tolerance);
			simpRoutes.push(simp);
		}
		//let multiLine = new gdal.MultiLineString(simpRoutes);
		let multiLine = new gdal.MultiLineString();
		multiLine.children.add(simpRoutes);
		return multiLine;
	}

	/**
	 * Создание проецированной точки из объектов gdal классов
	 * @param {gdal.MultiLineString}geom
	 * @param pt
	 * @returns {null|*}
	 */
	static createProjectedPoint(geom, pt){
		// Проекция точки на линейном объекте
		let turfLine = this.toTurfMultiLine(geom);
		let turfPoint = turf.point([pt.x, pt.y]);
		let np = turf.nearestPointOnLine(turfLine, turfPoint, {units: 'kilometres'});
		let lp = this.findGeoObjByNearestPoint(geom, np);
		return lp;
	}

	/**
	 * Создание проецированной точки из объектов turf классов
	 * @param baseLine Базовая ось с атрибутами
	 * @param {turf.MultiLineString} turfLine
	 * @param {turf.Point} turfPoint
	 * @returns {{distance: number, vals: ({}|*), x: Array<Number>, y: Array<Number>, location: number, info: (CustomLogger.info|((message?: any, ...optionalParams: any[]) => void)|boolean|string|Int8Array|Int16Array|Int32Array|Uint8Array|Uint16Array|Uint32Array|Uint8ClampedArray|Float32Array|Float64Array|DataView|ArrayBuffer|((...data: any[]) => void)|*)}}
	 */
	static createProjectedPointV2(baseLine, turfLine, turfPoint){
		// Проекция точки на линейном объекте
		let np = turf.nearestPointOnLine(turfLine, turfPoint, {units: 'kilometres'});
		let lp = this.findGeoObjByNearestPointV2(baseLine, np);
		return lp;
	}

	static findGeoObjByNearestPoint(geom, nearestPoint){
		let index = 0;
		for(let line of geom){
			for(let point of line){
				if(index === nearestPoint.properties.index){
					let from = turf.point([point.x, point.y]);
					let to = turf.point(nearestPoint.geometry.coordinates);
					// дистанция через turf дает отличие в 6см с C#
					let location = turf.distance(from, to);
					//дистанция через гдал не дает близкий результат
					/*let c = new gdal.Point(point.x, point.y);
					let dd = c.distance(new gdal.Point(nearestPoint.geometry.coordinates[0], nearestPoint.geometry.coordinates[1]));*/
					let lp = {
						x: nearestPoint.geometry.coordinates[0],
						y: nearestPoint.geometry.coordinates[1],
						vals: point.vals, info: point.info,
						location: location * 1000, //расстрояние от ближайшего узла до спроецированной точки(в метрах)
						distance: nearestPoint.properties.dist * 1000, // расстояние от базовой точки и её проекцией(в метрах)
					};
					return lp;
				}
				index++;
			}
		}
	}

	static findGeoObjByNearestPointV2(data, nearestPoint){
		let index = 0;
		for(let point of data){
			if(index === nearestPoint.properties.index){
				let from = turf.point([Number(point.X), Number(point.Y)]);
				let to = turf.point(nearestPoint.geometry.coordinates);
				// дистанция через turf дает отличие в 6см с C#
				let location = turf.distance(from, to);
				//дистанция через гдал не дает близкий результат
				/*let c = new gdal.Point(point.x, point.y);
				let dd = c.distance(new gdal.Point(nearestPoint.geometry.coordinates[0], nearestPoint.geometry.coordinates[1]));*/
				let lp = {
					x: nearestPoint.geometry.coordinates[0],
					y: nearestPoint.geometry.coordinates[1],
					location: location * 1000, //расстрояние от ближайшего узла до спроецированной точки(в метрах)
					distance: nearestPoint.properties.dist * 1000, // расстояние от базовой точки и её проекцией(в метрах)
					measure: Number(point.MEASURE) + (location * 1000),
				};
				return lp;
			}
			index++;
		}
	}

	static toTurfMultiLine(geom){
		let multiLineArr = [];
		geom.forEach(lines => {
			let line = [];
			lines.forEach(point => {
				line.push([point.x, point.y]);
			});
			multiLineArr.push(line);
		});
		return multilinestring(multiLineArr);
	}
}

module.exports = LrsTools;
