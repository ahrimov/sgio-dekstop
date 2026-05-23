const gdal = require('gdal');
const multilinestring = require('turf-multilinestring');
/**
 * Класс для выполения географических вычислений
 */
class GeoFuncs {
    /**
     * Функция конвертации проекции из P42 в WGS84
     * @param b1 широта y
     * @param l1 долгота x
     * @param h1 высота
     * @returns {{b2: number, l2: number, h2: number}}
     */
    static p42Wgs(b1, l1, h1 = 0) {
        b1 = b1 * Math.PI / 180;
        l1 = l1 * Math.PI / 180;
        // Параметры эллипсоида CK-42
        let a1 = 6378245;
        let e1 = 0.0066934216;
        // Параметры эллипсоида WGS
        let a2 = 6378137;
        let e2 = 0.00669438;
        let N1 = a1 / Math.sqrt(1 - e1 * Math.sin(b1)**2);
        // Геоцентрические прямоугольные координаты в CK-42
        let x1 = (N1 + h1) * Math.cos(b1) * Math.cos(l1);
        let y1 = (N1 + h1) * Math.cos(b1) * Math.sin(l1);
        let z1 = ((1 - e1) * N1 + h1) * Math.sin(b1);
        let coeff = 1 - 0.12E-6;
        // Геоцентрические прямоугольные координаты в WGS
        let x2 = coeff * (x1 - 4.363321062E-6 * y1 + 1.939259378E-6 * z1) + 26.3;
        let y2 = coeff * (4.36332313E-6 * x1 + y1 - 1.066581637E-6 * z1) - 132.6;
        let z2 = coeff * (-1.939254724E-6 * x1 + 1.066590098E-6 * y1 + z1) - 76.3;
        let l2 = Math.atan(y2 / x2);
        let b2 = b1;
        let N2 = 0;
        for (let i = 0; i < 3; i++) {
            N2 = a2 / Math.sqrt(1 - e2 * Math.sin(b2)**2);
            b2 = Math.atan((z2 + e2 * N2 * Math.sin(b2)) / Math.sqrt(x2 * x2 + y2 * y2));
        }
        let h2 = x2 / Math.cos(l2) / Math.cos(b2) - N2;
        b2 = b2 * 180 / Math.PI;
        l2 = l2 * 180 / Math.PI;
        return { b2, l2, h2 };
    }

    /**
     * Функция конвертации проекции из WGS84 в P42
     * @param b1 широта y
     * @param l1 долгота x
     * @param h1 высота
     * @returns {{b2: number, l2: number, h2: number}}
     */
    static wgsP42(b1, l1, h1 = 0) {
        b1 = b1 * Math.PI / 180;
        l1 = l1 * Math.PI / 180;
        // Параметры эллипсоида WGS
        let a1 = 6378137;
        let e1 = 0.00669438;
        // Параметры эллипсоида CK-42
        let a2 = 6378245;
        let e2 = 0.0066934216;
        let N1 = a1 / Math.sqrt(1 - e1 * Math.sin(b1)**2);
        // Геоцентрические прямоугольные координаты в WGS
        let x1 = (N1 + h1) * Math.cos(b1) * Math.cos(l1);
        let y1 = (N1 + h1) * Math.cos(b1) * Math.sin(l1);
        let z1 = ((1 - e1) * N1 + h1) * Math.sin(b1);
        let coeff = 1 - 0.12E-6;
        // Геоцентрические прямоугольные координаты в CK-42
        let x2 = coeff * (x1 + 4.363321062E-6 * y1 - 1.939259378E-6 * z1) - 26.3;
        let y2 = coeff * (-4.36332313E-6 * x1 + y1 + 1.066581637E-6 * z1) + 132.6;
        let z2 = coeff * (1.939254724E-6 * x1 - 1.066590098E-6 * y1 + z1) + 76.3;
        let l2 = Math.atan(y2 / x2);
        let b2 = b1;
        let N2 = 0;
        for (let i = 0; i < 3; i++) {
            N2 = a2 / Math.sqrt(1 - e2 * Math.sin(b2)**2);
            b2 = Math.atan((z2 + e2 * N2 * Math.sin(b2)) / Math.sqrt(x2 * x2 + y2 * y2));
        }
        let h2 = x2 / Math.cos(l2) / Math.cos(b2) - N2;
        b2 = b2 * 180 / Math.PI;
        l2 = l2 * 180 / Math.PI;
        return { b2, l2, h2 };
    }

    /**
	 *
	 * @param x l долгота
	 * @param y b широта
	 * @param zone
	 * @returns {{b: number, l: number}}
	 */
    static gkP42(x, y, zone) {
        let yy = y - zone * 1000000 - 500000;
        let beta = x / 6367558.4969;
        let sinbeta = Math.sin(beta);
        let cosbeta = Math.cos(beta);
        let cosbeta2 = cosbeta * cosbeta;
        let Bx = beta + (50221746 + (293622 + (2350 + 22 * cosbeta2) * cosbeta2) * cosbeta2) * 0.0000000001 * sinbeta * cosbeta;
        let cosBx = Math.cos(Bx);
        let cosBx2 = cosBx * cosBx;
        let sinBx = Math.sin(Bx);
        let Nx = 6399698.902 - (21562.267 - (108.973 - 0.612 * cosBx2) * cosBx2) * cosBx2;
        let z = yy / (Nx * cosBx);
        let z2 = z * z;
        let b2 = (0.5 + 0.003369 * cosBx2) * sinBx * cosBx;
        let b3 = 0.333333 - (0.166667 - 0.001123 * cosBx2) * cosBx2;
        let b4 = 0.25 + (0.16161 + 0.00562 * cosBx2) * cosBx2;
        let b5 = 0.2 - (0.1667 - 0.0088 * cosBx2) * cosBx2;
        let ll = (1 - (b3 - b5 * z2) * z2) * z;
        let b = (Bx - (1 - (b4 - 0.12 * z2) * z2) * z2 * b2) * 180 / Math.PI;
        let l = 6 * zone - 3 + ll * 180 / Math.PI;
        return { b, l };
    }

    /**
	 *
	 * @param b y широта
	 * @param l x долгота
	 * @param n
	 * @returns {{x: number, y: number}}
	 */
    static p42Gk(b, l, n) {
        let radB = b * Math.PI / 180;
        let cosB = Math.cos(radB);
        let sinB = Math.sin(radB);
        let cosB2 = cosB * cosB;
        let L0 = 6 * n - 3;	// Осевой меридиан
        let ll = (l - L0) * Math.PI / 180;	// Разность долгот относительно осевого меридиана
        let l2 = ll * ll;
        let N = 6399698.902 - (21562.267 - (108.973 - 0.612 * cosB2) * cosB2) * cosB2; // Первый вертикал
        let a2 = 32140.404 - (135.3302 - (0.7092 - 0.004 * cosB2) * cosB2) * cosB2;
        let a4 = (0.25 + 0.00252 * cosB2) * cosB2 - 0.04166;
        let a6 = (0.166 * cosB2 - 0.084) * cosB2;
        let a3 = (0.3333333 + 0.001123 * cosB2) * cosB2 - 0.1666667;
        let a5 = 0.0083 - (0.1667 - (0.1968 + 0.004 * cosB2) * cosB2) * cosB2;
        let x = 6367558.4969 * radB - (a2 - (0.5 + (a4 + a6 * l2) * l2) * l2 * N) * sinB * cosB;
        let y = n * 1000000 + 500000 + (1 + (a3 + a5 * l2) * l2) * ll * N * cosB;
        return { x, y };
    }

    /**
     * Расчет дистанции между точками
     * @param b1 широта y 1
     * @param l1 долгота x 1
     * @param z1 высота 1
     * @param b2 широта y 2
     * @param l2 долгота x 2
     * @param z2 высота 2
     * @returns {number}
     * @constructor
     */
    static getDist(b1, l1, z1, b2, l2, z2) {
        let dB = (b2 - b1) * 3600;
        let dL = (l2 - l1) * 3600;
        if (dB === 0 && dL === 0) return 0;
        let Bm = (b1 + b2) / 2;
        let ddB = dB / 10000;
        let ddL = dL / 10000;
        let ddB2 = ddB * ddB;
        let ddL2 = ddL * ddL;
        let ddB2L = ddB2 * ddL;
        let ddBL2 = ddB * ddL2;
        let ddB3 = ddB2 * ddB;
        let ddL3 = ddL2 * ddL;
        let cosB = Math.cos(Bm * Math.PI / 180);
        let cosB2 = cosB * cosB;
        let cosB3 = cosB2 * cosB;
        let cosB4 = cosB3 * cosB;
        let cosB5 = cosB4 * cosB;
        let cosB6 = cosB5 * cosB;
        let a1 = 103422.05 * cosB;
        let a2 = 9.5144 * cosB + 0.5525 * cosB3 - 0.0078 * cosB5;
        let a3 = -10.1287 * cosB + 10.1287 * cosB3;
        let a4 = 103422.05 - 696.9116 * cosB2 + 4.6954 * cosB4 - 0.0310 * cosB6;
        let a5 = -30.3860 + 10.3334 * cosB2 - 0.2061 * cosB4 + 0.0014 * cosB6;
        let a6 = -0.2048 + 0.4192 * cosB2 - 0.0124 * cosB4;
        let D = (593.602160 + cosB2) / (197.867385 + cosB2);
        let E1 = a1 * ddL + a2 * ddB2L + a3 * ddL3;
        let E2 = a4 * ddB + a5 * ddBL2 + a6 * ddB3;
        let sinA = Math.sin(Math.atan2(E1, E2));
        let dist = (Math.abs(sinA) > 0.0000000001) ? Math.abs(D * E1 / sinA) : Math.abs(D * E2);
        return Math.sqrt(dist * dist + (z2 - z1) * (z2 - z1));
    }

    static getDist2D(b1, b2) {
        return GeoFuncs.getDist(b1[1], b1[0], 0, b2[1], b2[0], 0);
    }

    // Compute the distance from AB to C
    // if isSegment is true, AB is a segment, not a line.
    static lineToPointDistance2D(pointA, pointB, pointC) {
        const dot1 = GeoFuncs.dotProduct(pointA, pointB, pointC);
        if (dot1 > 0) return GeoFuncs.getDist2D(pointB, pointC);

        const dot2 = GeoFuncs.dotProduct(pointB, pointA, pointC);
        if (dot2 > 0) return GeoFuncs.getDist2D(pointA, pointC);
        const dist = GeoFuncs.crossProduct(pointA, pointB, pointC) / GeoFuncs.getDist2D(pointA, pointB);
        return Math.abs(dist);
    }

    /**
    * Calculating distance between line (or line segment) and point 2D
    */
    // Compute the dot product AB . AC
    static dotProduct(pointA, pointB, pointC) {
        const AB = [0,0];
        const BC = [0,0];
        AB[0] = pointB[0] - pointA[0];
        AB[1] = pointB[1] - pointA[1];
        BC[0] = pointC[0] - pointB[0];
        BC[1] = pointC[1] - pointB[1];
        const dot = AB[0] * BC[0] + AB[1] * BC[1];

        return dot;
    }

    // Compute the cross product AB x AC
    static crossProduct(pointA, pointB, pointC) {
        const AB = [0,0];
        const AC = [0,0];
        AB[0] = pointB[0] - pointA[0];
        AB[1] = pointB[1] - pointA[1];
        AC[0] = pointC[0] - pointA[0];
        AC[1] = pointC[1] - pointA[1];
        const cross = AB[0] * AC[1] - AB[1] * AC[0];
        return cross;
    }

    /**
	 * Конвертирует коорд. сист. из Гаусс-Крюгера в WGS84
	 * @param g
	 * @param zone
	 */
    static convertCSToWgs84(g, zone) {
        if (g) {
            let p; let 
res;
            if (Array.isArray(g)) {
                g.forEach((line) => {
                    line.forEach((p) => {
                        let res = this.gkP42(p.y, p.x, zone);
                        p.y = res.b;
                        p.x = res.l;
                        res = this.p42Wgs(p.y, p.x, 0);
                        p.y = res.b2;
                        p.x = res.l2;
                    });
                });
                return;
            }
            switch (g.wkbType) {
                case gdal.wkbPoint:
                    p = g;
                    res = this.gkP42(p.y, p.x, zone);
                    p.y = res.b;
                    p.x = res.l;
                    res = this.p42Wgs(p.y, p.x, 0);
                    p.y = res.b2;
                    p.x = res.l2;
                    break;
                case gdal.wkbLineString:
                    g.points.forEach((p) => {
                        res = this.gkP42(p.y, p.x, zone);
                        p.y = res.b;
                        p.x = res.l;
                        res = this.p42Wgs(p.y, p.x, 0);
                        p.y = res.b2;
                        p.x = res.l2;
                    });
                    break;
                case gdal.wkbMultiLineString:
                    g.children.forEach((line) => {
                        line.points.forEach((p) => {
                            res = this.gkP42(p.y, p.x, zone);
                            p.y = res.b;
                            p.x = res.l;
                            res = this.p42Wgs(p.y, p.x, 0);
                            p.y = res.b2;
                            p.x = res.l2;
                        });
                    });
                    break;
                case gdal.wkbPolygon:
                    g.rings.forEach((line) => {
                        line.points.forEach((p) => {
                            res = this.gkP42(p.y, p.x, zone);
                            p.y = res.b;
                            p.x = res.l;
                            res = this.p42Wgs(p.y, p.x, 0);
                            p.y = res.b2;
                            p.x = res.l2;
                        });
                    });
                    break;
            }
		}
	}

    /**
	 * Перевод WGS84 в Гаусс-Крюгера
	 * @param g
	 * @param zone
	 */
    static convertWgs84ToGC(g, zone) {
        if (g) {
            let p; let 
res;
            if (Array.isArray(g)) {
                g.forEach((line) => {
                    line.forEach((p) => {
                        res = this.wgsP42(p.y, p.x, 0);
                        p.y = res.b2;
                        p.x = res.l2;
                        res = this.p42Gk(p.y, p.x, zone);
                        p.y = res.y;
                        p.x = res.x;
                    });
                });
                return;
            }
            switch (g.wkbType) {
                case gdal.wkbPoint:
                    p = g;
                    res = this.wgsP42(p.y, p.x, 0);
                    p.y = res.b2;
                    p.x = res.l2;
                    res = this.p42Gk(p.y, p.x, zone);
                    p.y = res.y;
                    p.x = res.x;
                    break;
                case gdal.wkbLineString:
                    g.points.forEach((p) => {
                        res = this.wgsP42(p.y, p.x, 0);
                        p.y = res.b2;
                        p.x = res.l2;
                        res = this.p42Gk(p.y, p.x, zone);
                        p.y = res.y;
                        p.x = res.x;
                    });
                    break;
                case gdal.wkbMultiLineString:
                    g.children.forEach((line) => {
                        line.points.forEach((p) => {
                            res = this.wgsP42(p.y, p.x, 0);
                            p.y = res.b2;
                            p.x = res.l2;
                            res = this.p42Gk(p.y, p.x, zone);
                            p.y = res.y;
                            p.x = res.x;
                        });
                    });
                    break;
                case gdal.wkbPolygon:
                    g.rings.forEach((line) => {
                        line.points.forEach((p) => {
                            res = this.wgsP42(p.y, p.x, 0);
                            p.y = res.b2;
                            p.x = res.l2;
                            res = this.p42Gk(p.y, p.x, zone);
                            p.y = res.y;
                            p.x = res.x;
                        });
                    });
                    break;
            }
        }
    }

    /**
	 * Получение массива координат из геометрии у классов gdal
	 * @param g
	 * @returns {*[]}
	 */
    static getCoordsFromGdalGeometry(g) {
        let coords = [];
        let centoid = g.centroid();
        coords.push(centoid);
        return coords;
        if (g) {
            switch (g.wkbType) {
                case gdal.wkbPoint:
                    coords.push(g);
                    break;
                case gdal.wkbLineString:
                    g.points.forEach((p) => {
                        coords.push(p);
                    });
                    break;
                case gdal.wkbMultiLineString:
                    centoid = g.centroid();
                    coords.push(centoid);
                    /* g.children.forEach(line => {
						line.points.forEach(p => {
							coords.push(p);
						});
					}); */
                    break;
                case gdal.wkbPolygon:
                    let centoid = g.centroid();
                    coords.push(centoid);
                    /* g.rings.forEach(line => {
						line.points.forEach(p => {
							coords.push(p);
						});
					}); */
                    break;
            }
        }
        return coords;
    }

    /**
	 * Формируем мультилинию из массива объектов
	 * @param rows
	 * @returns {Feature<MultiLineString>}
	 */
    static toTurfLineStringFromData(rows) {
        let multiLineArr = [];
        if (!rows) return null;
        let line = [];
        rows.forEach((item) => {
            line.push([Number(item.X), Number(item.Y)]);
        });
        multiLineArr.push(line);
        return multilinestring(multiLineArr);
    }
}
module.exports = GeoFuncs;
