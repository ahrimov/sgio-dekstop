const { ErrorHandler, config, logger } = require('gis-core');
const LrsTools = require('../../../../utils/LrsTools');
const { lang, errors } = require('../../../../resources');

class OfflineLineIdx {
    process(objects, axes, meta) {
        LrsTools.projectOfflineObjects(objects, axes, meta, 50000);
    }
}
module.exports = OfflineLineIdx;
