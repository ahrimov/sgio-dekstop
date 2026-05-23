const CoordProcessor = require('./CoordProcessor');

class XYZProcessor extends CoordProcessor {
    constructor() {
        super();
    }

    setParams(params) {
        params.X = null;
        params.Y = null;
        params.Z = null;
    }

    process(coords, attrs) {
        super.process(coords, attrs);
        for (let i = 0; i < coords.length; i++) {
            const obj = attrs[i];
            const coord = coords[i];
            obj.X = (isNaN(coord.x)) ? null : coord.x;
            obj.Y = (isNaN(coord.y)) ? null : coord.y;
            obj.Z = (isNaN(coord.z)) ? null : coord.z;
        }
        return attrs;
    }
}

module.exports = XYZProcessor;
