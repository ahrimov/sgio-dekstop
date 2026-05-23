class ObjProcessor {
    constructor() {
        this._priority = 0;
    }

    get priority() {
        return this._priority;
    }

    set priority(value) {
        this._priority = value;
    }

    setParams(cmd, params) {

    }

    /**
	 *
	 * @param {gdal.Geometry} geometry
	 * @param attrs
	 */
    process(geometry, attrs = {}) {

    }
}

module.exports = ObjProcessor;
