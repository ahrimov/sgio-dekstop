const wkx = require('wkx');
const turf = require('@turf/turf');

const CoordProcessor = require('./CoordProcessor');

class BufProcessor extends CoordProcessor {
    get query() {
        return this._query;
    }

    get idField() {
        return this._idField;
    }

    get geoField() {
        return this._geoField;
    }

    get buf() {
        return this._buf;
    }

    constructor(query, idField, geoField) {
        super();
        this._query = query;
        this._idField = idField;
        this._geoField = geoField;
        this._buf = {};
    }

    setParams(params) {
        params[this._idField] = null;
    }

    process(coords, attrs) {
        super.process(coords, attrs);
        coords.forEach((coord, i) => {
            const point = (coord.z) ? turf.point([coord.x, coord.y, coord.z]) : turf.point([coord.x, coord.y]);
            const obj = attrs[i];
            for (const buf in this.buf) {
                if (turf.inside(point, this.buf[buf])) {
                    obj[this.idField] = buf;
                    break;
                }
            }
            if (!obj[this.idField]) obj[this.idField] = null;
        });
        return attrs;
    }

    endInit(bufOutput) {
        bufOutput.forEach((row) => {
            this._buf[row[this.idField]] = wkx.Geometry.parse(row[this.geoField]).toGeoJSON();
        });
    }
}
module.exports = BufProcessor;
