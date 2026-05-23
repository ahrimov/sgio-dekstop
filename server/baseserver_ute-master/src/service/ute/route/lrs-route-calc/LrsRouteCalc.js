const turf = require('@turf/turf');
const gdal = require('gdal');
const DB = require('../../db');
const LrsTools = require('../../../../utils/LrsTools');
const GeoFuncs = require('../../../../utils/GeoFuncs');

class LrsRouteCalc {
    static process(ds, logger) {
        const stationPointArray = ds.Tables['STATION_POINT'];
        let sumM = -1;
        // Проход по всем диапозонам между базовыми точками
        let prevB = 0;
            let prevL = 0;
            let prevZ = 0;
        const baseAxesPoints = stationPointArray.rows.filter(item =>{
            return (item.TYPE_CL === 'ST_POINT_TYPE_02' || item.TYPE_CL === 'ST_POINT_TYPE_03' || item.TYPE_CL === 'ST_POINT_TYPE_04');
        });
        const baseAxesTable = DB.createEmptyTable();
        baseAxesTable.rows = baseAxesPoints;

        for (const row of baseAxesTable.rows) {
            let curB; let curL; let curZ; let 
curM;
            curL = Number(row.X); // curL = Convert.ToDouble(row[X]);
            curB = Number(row.Y); // curB = Convert.ToDouble(row[Y]);

            curZ = row.Z === null ? NaN : Number(row.Z);
            curM = Number(row.MEASURE);
            // upd. 30.06.21 начальное значение MEASURE всегда выставляем в 0, чтобы избежать проблемы:
            // когда на тестах увеличивали для всех точек measure на 100, то линейная дистанция не менялась, а должна расчитываться заново с 0
            if (sumM < 0) {
                sumM = 0;
            } else {
                // upd 01.04.21 исправлено условие получение Z, чтобы в середине трубы не было аномальных перепадов в случае, если Z=NULL
                /* sumM += GeoFuncs.getDist(curB, curL, isNaN(curZ) || isNaN(prevZ) ? 0 : curZ,
                    prevB, prevL, isNaN(curZ) || isNaN(prevZ) ? 0 : prevZ); */
                if (isNaN(curZ)) curZ = prevZ;
                sumM += GeoFuncs.getDist(curB, curL, curZ, prevB, prevL, prevZ);
            }
            if (Math.abs(sumM - curM) > 0.01) {
                row.MEASURE = sumM;
            }
            prevB = curB;
            prevL = curL;
            prevZ = curZ;
        }

        const baseAxesCoordinates = [];
        baseAxesTable.rows.forEach((item) => {
            baseAxesCoordinates.push([Number(item.X), Number(item.Y)]);
        });
        let typeCl5StationPoints = stationPointArray.rows.filter((item) => (item.TYPE_CL === 'ST_POINT_TYPE_05'));
        // на выходе делаем объект с ключами, чтобы на пересчете лин дистанции быстро производить поиск
        // logger.info(`Начинаем проецирование ${typeCl5StationPoints.length} объектов типа ST_POINT_TYPE_05`);
        let typeCl5StationPointsObj = this.getClosestPoint_(baseAxesTable.rows, baseAxesCoordinates, typeCl5StationPoints, logger);
        // logger.info(`Проецирование закончено`);
        /* let baseAxesCoordinates = GeoFuncs.toTurfLineStringFromData(baseAxesTable.rows);
        let stationPoints4Bind = stationPointArray.rows.filter(item => {
             return (item.TYPE_CL === 'ST_POINT_TYPE_05');
         })
        let stationPoints4BindCoordinates = stationPoints4Bind.map(item => (turf.point([Number(item.X), Number(item.Y)])));
        //на выходе делаем объект с ключами, чтобы на пересчете лин дистанции быстро производить поиск
        logger.info(`Начинаем проецирование ${stationPoints4BindCoordinates.length} объектов типа ST_POINT_TYPE_05`);
        let typeCl5StationPointsObj = this.getClosestPointV2_(baseAxesTable.rows, baseAxesCoordinates, stationPoints4Bind, stationPoints4BindCoordinates, logger); */
        baseAxesTable.rows.push(...typeCl5StationPointsObj);
        baseAxesTable.rows = baseAxesTable.rows.sort((a, b) => ((a.MEASURE > b.MEASURE) ? 1 : -1));
        return baseAxesTable;
    }

    /**
     * Функиця проецирования массива точек stationPoints4Bind на ось baseStationPoints
     * @param baseStationPoints  базовая ось
     * @param baseStationCoords  базовая ось, содержащая только координаты
     * @param stationPoints4Bind массив точек, которые должны проецироваться
     * @returns {Object}
     * @private
     */
    static getClosestPointV2_(baseStationPoints, baseStationCoords, stationPoints4Bind, stationPoints4BindCoordinates, logger) {
        const result = [];
        if (!baseStationCoords) return result;
        // stationPoints4BindCoordinates = stationPoints4BindCoordinates.reverse();
        // stationPoints4BindCoordinates.length = 100;
        logger.info(`Начинаем проецирование ${stationPoints4Bind.length} объектов типа ST_POINT_TYPE_05`);
        stationPoints4BindCoordinates.forEach((item/* {gdal.Point} */, i) => {
            try {
                const alp = LrsTools.createProjectedPointV2(baseStationPoints, baseStationCoords, item);// this.getClosestPointOnLines(item, baseStationPoints);
                if (alp) {
                    // к measure ближайшего узла добавляем расстояние до спроецированной точки
                    stationPoints4Bind[i].MEASURE = alp.measure;
                }
                result.push(stationPoints4Bind[i]);
                if (i % 1000 === 0 && i !== 0) logger.info(`Спроецировано ${i} из ${stationPoints4Bind.length} объектов.`);
            } catch (ex) {
            }
        });
        logger.info('Проецирование закончено');
        return result;
    }

    static getClosestPoint_(baseStationPoints, baseStationCoords, stationPoints4Bind, logger) {
        const result = [];
        if (!baseStationCoords || baseStationCoords.length === 0) return result;
        /* let line = turf.lineString(baseStationCoords);
        stationPoints4Bind.forEach((item, i) => {
            if(i === 500)
                return;
            let pt = turf.point([Number(item.X), Number(item.Y)]);
            try{
                let snapped = turf.nearestPointOnLine(line, pt, {units: 'degrees'});
                if(snapped){
                    item.X = snapped.geometry.coordinates[0];
                    item.Y = snapped.geometry.coordinates[1];
                    let prevBasePoint = baseStationPoints[snapped.properties.index];
                    let measure = GeoFuncs.getDist(item.Y, item.X, Number(item.Z), Number(prevBasePoint.Y), Number(prevBasePoint.X), Number(prevBasePoint.Z));
                    item.MEASURE = measure; // расстояние между начальной и спроецированной
                }
                result.push(item);
            }
            catch(ex){}

        }); */
        logger.info(`Начинаем проецирование ${stationPoints4Bind.length} объектов типа ST_POINT_TYPE_05`);
        stationPoints4Bind.forEach((item, i) => {
            try {
                const snapped = this.getClosestPointOnLines(item, baseStationPoints);
                if (snapped) {
                    item.X = snapped.x;
                    item.Y = snapped.y;
                    const prevBasePoint = baseStationPoints[snapped.i];
                    if (item.Z === null || isNaN(Number(item.Z))) item.Z = Number(prevBasePoint.Z);
                    let measure = GeoFuncs.getDist(item.Y, item.X, Number(item.Z), Number(prevBasePoint.Y), Number(prevBasePoint.X), Number(prevBasePoint.Z));
                    if (item.X === prevBasePoint.X && item.Y === prevBasePoint.Y) measure = prevBasePoint.MEASURE;
                    else measure = Number(prevBasePoint.MEASURE) + measure;
                    item.MEASURE = measure; // расстояние между начальной и спроецированной
                }
                result.push(item);
                if (i % 1000 === 0 && i !== 0) logger.info(`Спроецировано ${i} из ${stationPoints4Bind.length} объектов.`);
            } catch (ex) {}
        });
        logger.info('Проецирование закончено');
        return result;
    }

    /**
     * https://stackoverflow.com/questions/16429562/find-a-point-in-a-polyline-which-is-closest-to-a-latlng
     * @param pXy
     * @param aXys
     * @returns {{fTo: number, x: number, y: number, i: number, fFrom: number}}
     */
    static getClosestPointOnLines(pXy, aXys) {
        let minDist; let fTo; let fFrom; let x; let y; let i; let 
dist;
        if (aXys.length > 1) {
            for (let n = 1; n < aXys.length; n++) {
                if (aXys[n].X != aXys[n - 1].X) {
                    const a = (aXys[n].Y - aXys[n - 1].Y) / (aXys[n].X - aXys[n - 1].X);
                    const b = aXys[n].Y - a * aXys[n].X;
                    dist = Math.abs(a * pXy.X + b - pXy.Y) / Math.sqrt(a * a + 1);
                } else dist = Math.abs(pXy.X - aXys[n].X);
                // length^2 of line segment
                const rl2 = Math.pow(aXys[n].Y - aXys[n - 1].Y, 2) + Math.pow(aXys[n].X - aXys[n - 1].X, 2);
                // distance^2 of pt to end line segment
                const ln2 = Math.pow(aXys[n].Y - pXy.Y, 2) + Math.pow(aXys[n].X - pXy.X, 2);
                // distance^2 of pt to begin line segment
                const lnm12 = Math.pow(aXys[n - 1].Y - pXy.Y, 2) + Math.pow(aXys[n - 1].X - pXy.X, 2);
                // minimum distance^2 of pt to infinite line
                const dist2 = Math.pow(dist, 2);
                // calculated length^2 of line segment
                const calcrl2 = ln2 - dist2 + lnm12 - dist2;
                // redefine minimum distance to line segment (not infinite line) if necessary
                if (calcrl2 > rl2) dist = Math.sqrt(Math.min(ln2, lnm12));
                if ((minDist == null) || (minDist > dist)) {
                    if (calcrl2 > rl2) {
                        if (lnm12 < ln2) {
                            fTo = 0;// nearer to previous point
                            fFrom = 1;
                        } else {
                            fFrom = 0;// nearer to current point
                            fTo = 1;
                        }
                    } else {
                        // perpendicular from point intersects line segment
                        fTo = ((Math.sqrt(lnm12 - dist2)) / Math.sqrt(rl2));
                        fFrom = ((Math.sqrt(ln2 - dist2)) / Math.sqrt(rl2));
                    }
                    minDist = dist;
                    i = n;
                }
            }
            const dx = aXys[i - 1].X - aXys[i].X;
            const dy = aXys[i - 1].Y - aXys[i].Y;
            x = aXys[i - 1].X - (dx * fTo);
            y = aXys[i - 1].Y - (dy * fTo);
        }
        return { x, y, i, fTo, fFrom };
    }

    /* static getClosestPoint1_(baseStationPoints, stationPoints4Bind) {
        let result = {};
        stationPoints4Bind.forEach((item, i) => {
            let p1 = {}
            let x = p1.x,
                y = p1.y,
                dx = p2.x - x,
                dy = p2.y - y,
                dot = dx * dx + dy * dy,
                t;

            if (dot > 0) {
                t = ((p.x - x) * dx + (p.y - y) * dy) / dot;

                if (t > 1) {
                    x = p2.x;
                    y = p2.y;
                } else if (t > 0) {
                    x += dx * t;
                    y += dy * t;
                }
            }

            if(sqDist){
                item.X = p.x;
                item.Y = p.y;
            }
            result[item.STATION_ID] = item;

        });
        return result;
    } */

    static bindStationPoints_(baseStationPoints, stationPoints4Bind) {
        const result = {};
        // return result;
        stationPoints4Bind.forEach((item, i) => {
            /* if(i>5)
                return; */
            let minDist1 = Number.POSITIVE_INFINITY;
            let closestSegment1 = null;
            const srcPntArr1 = [Number(item.X), Number(item.Y)];
            let coeff1 = 0;
            // получаем сегменты линии
            let point1; let 
point2;
            const numSegs = baseStationPoints.length;
            for (let i = 0; i < numSegs - 1; ++i) {
                point1 = baseStationPoints[i];
                point2 = baseStationPoints[i + 1];
                // Длина текущего отрезка
                const segmentLength = GeoFuncs.getDist2D(point1, point2);
                // рассчитываем ближайшее расстояние от нашей точки до текущего отрезка
                const calcDist1 = GeoFuncs.lineToPointDistance2D(point1, point2, srcPntArr1);
                if (calcDist1 < minDist1) {
                    const srcPoint1ToPoint1Dist = GeoFuncs.getDist2D(point1, srcPntArr1);
                    const srcPoint1ToPoint2Dist = GeoFuncs.getDist2D(point2, srcPntArr1);
                    // рассчитываем коэффициент отношения длины от начальной точки до точки проекции на отрезок к длине отрезка
                    // Если длина от нашей точки до отрезка равна длине от нашей точки до одной из 2-х точек отрезка coeff1 = 0 если точка первая и coeff1 = 1 если точка последняя
                    if (calcDist1 === srcPoint1ToPoint1Dist) coeff1 = 0;
                    else if (calcDist1 === srcPoint1ToPoint2Dist) coeff1 = 1;
                    else coeff1 = Math.sqrt(srcPoint1ToPoint1Dist**2 - calcDist1**2) / segmentLength;
                    // Сохраняем текущую дистанцию как минимальную, текущий отрезок как ближайший
                    minDist1 = calcDist1;
                    closestSegment1 = [point1, point2];
                }
            }
            // если closestSegment!=null, значит у нас есть ближайший сегмент линии
            if (closestSegment1) {
                // возвращаемый результат - мы привязываем точку по проекции
                // Сохраняем новую точку на трубе в newPoint1
                const newPoint1 = this.getNewPointProj_(closestSegment1, coeff1);
                item.X = newPoint1.X;
                item.Y = newPoint1.Y;
                // console.log('$$1',item)
            }
            result[item.STATION_ID] = item;
        });
        return result;
    }

    static getNewPointProj_(closestSegment, coeff) {
        const pnt1x = closestSegment[0][0];
        const pnt1y = closestSegment[0][1];
        const pnt2x = closestSegment[1][0];
        const pnt2y = closestSegment[1][1];
        const xCoeff = pnt1x > pnt2x ? (1 - coeff) : coeff;
        const yCoeff = pnt1y > pnt2y ? (1 - coeff) : coeff;
        return {
            X: Math.min(pnt1x, pnt2x) + Math.abs(pnt1x - pnt2x) * xCoeff,
            Y: Math.min(pnt1y, pnt2y) + Math.abs(pnt1y - pnt2y) * yCoeff,
        };
    }
}
module.exports = LrsRouteCalc;
