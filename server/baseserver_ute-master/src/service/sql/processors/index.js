const CoordProcessor = require('./coord/CoordProcessor');
const BufProcessor = require('./coord/BufProcessor');
const LRSProcessor = require('./coord/LRSProcessor');
const XYZProcessor = require('./coord/XYZProcessor');

const ObjProcessor = require('./obj/ObjProcessor');
const BoundsProcessor = require('./obj/BoundsProcessor');
const WKBProcessor = require('./obj/WKBProcessor');

module.exports = {
    CoordProcessor,
    BufProcessor,
    LRSProcessor,
    XYZProcessor,
    ObjProcessor,
    BoundsProcessor,
    WKBProcessor,
};
