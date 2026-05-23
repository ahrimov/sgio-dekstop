const ObjProcessor = require('./ObjProcessor');

class WKBProcessor extends ObjProcessor {
    constructor() {
        super();
    }

    get priority() {
        return 100;
    }

    setParams(cmd, params) {
        if (!cmd) return false;
        try {
            const paramName = 'WKB';
            params[paramName] = null;
            const re = new RegExp(`:${paramName}`, 'g');
            return re.exec(cmd) !== null;
        } catch (ex) {}
        return false;
    }

    process(geometry, params) {
        try {
            params.WKB = geometry.toWkb();
        } catch (ex) {}
        return params;
    }
}

module.exports = WKBProcessor;
