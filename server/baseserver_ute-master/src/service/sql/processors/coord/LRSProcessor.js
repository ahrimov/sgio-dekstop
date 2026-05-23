const CoordProcessor = require('./CoordProcessor');

class LRSProcessor extends CoordProcessor {
    constructor() {
        super();
    }

    setParams(params) {
        params.SEQ = null;
        params.BACK_SEQ = null;
        params.MEASURE = null;
    }

    process(coords, attrs) {
        super.process(coords, attrs);
        let measure = 0;
        let prevCoord = null;
        coords.forEach((coord, i) => {
            if (prevCoord !== null) measure += this.getDist3D(coord, prevCoord);
            prevCoord = coord;
            const obj = attrs[i];
            obj.SEQ = i;
            obj.BACK_SEQ = coords.length - i - 1;
            obj.MEASURE = measure;
        });
        return attrs;
    }

    getDist3D(p1, p2) {
        const dist2D = this.getDist(p1, p2);
        const dZ = p2.z - p1.z;
        return (dZ === 0 || isNaN(dZ)) ? dist2D : Math.sqrt(dist2D * dist2D + dZ * dZ);
    }

    getDist(p1, p2) {
        const dB = (p1.y - p2.y) * 3600;
        const dL = (p1.x - p2.x) * 3600;

        if ((dB === 0) && (dL === 0)) { return 0; }

        const Bm = (p1.y + p2.y) / 2;
        const ddB = dB / 10000;
        const ddL = dL / 10000;
        const ddB2 = ddB * ddB;
        const ddL2 = ddL * ddL;
        const ddB2L = ddB2 * ddL;
        const ddBL2 = ddB * ddL2;
        const ddB3 = ddB2 * ddB;
        const ddL3 = ddL2 * ddL;
        const cosB = Math.cos(Bm * Math.PI / 180);
        const cosB2 = cosB * cosB;
        const cosB3 = cosB2 * cosB;
        const cosB4 = cosB3 * cosB;
        const cosB5 = cosB4 * cosB;
        const cosB6 = cosB5 * cosB;
        const a1 = 103422.05 * cosB;
        const a2 = 9.5144 * cosB + 0.5525 * cosB3 - 0.0078 * cosB5;
        const a3 = -10.1287 * cosB + 10.1287 * cosB3;
        const a4 = 103422.05 - 696.9116 * cosB2 + 4.6954 * cosB4 - 0.0310 * cosB6;
        const a5 = -30.3860 + 10.3334 * cosB2 - 0.2061 * cosB4 + 0.0014 * cosB6;
        const a6 = -0.2048 + 0.4192 * cosB2 - 0.0124 * cosB4;
        const D = (593.602160 + cosB2) / (197.867385 + cosB2);
        const E1 = a1 * ddL + a2 * ddB2L + a3 * ddL3;
        const E2 = a4 * ddB + a5 * ddBL2 + a6 * ddB3;
        const sinA = Math.sin(Math.atan2(E1, E2));

        if (sinA !== 0) { return Math.abs(D * E1 / sinA); }

        return Math.abs(D * E2);
    }
}

module.exports = LRSProcessor;
