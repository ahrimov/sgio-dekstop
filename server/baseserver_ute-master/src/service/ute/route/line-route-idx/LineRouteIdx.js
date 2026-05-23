const LrsTools = require('../../../../utils/LrsTools');

class LineRouteIdx {
    process(objects, axes, meta) {
        LrsTools.projectLineObjects(objects, axes, meta, 50000);
    }
}
module.exports = LineRouteIdx;
