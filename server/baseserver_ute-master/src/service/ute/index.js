const uteLrsRouteCalcPrepareService = require('./route/lrs-route-calc/prepareService');
const uteLrsRouteCalcValidationService = require('./route/lrs-route-calc/validationService');
const lrsRouteCalcService = require('./route/lrs-route-calc/LrsRouteCalcService');
const uteKmRouteCalcPrepareService = require('./route/km-route-calc/prepareService');
const uteKmRouteCalcValidationService = require('./route/km-route-calc/validationService');
const kmRouteCalcService = require('./route/km-route-calc/KmRouteCalcService');
const uteIliInspCalcPrepareService = require('./ili/ili-insp-calc/prepareService');
const uteIliInspCalcValidationService = require('./ili/ili-insp-calc/validationService');
const IliInspCalcService = require('./ili/ili-insp-calc/IliInspCalcService');
const uteLinkRepersPrepareService = require('./ili/ili-insp-link/prepareService');
const uteLinkRepersValidationService = require('./ili/ili-insp-link/validationService');
const LinkRepersService = require('./ili/ili-insp-link/LinkRepersService');
const IliClusterService = require('./ili/ili-cluster/IliClusterService');
const uteIliClusterPrepareService = require('./ili/ili-cluster/prepareService');
const uteIliClusterValidationService = require('./ili/ili-cluster/validationService');
const StoEnzInspService = require('./ili/sto-ehz-insp-proc/StoEnzInspService');
const uteStoEnzInspPrepareService = require('./ili/sto-ehz-insp-proc/prepareService');
const uteStoEnzInspValidationService = require('./ili/sto-ehz-insp-proc/validationService');
const StoIliInspService = require('./ili/sto-ili-insp-proc/StoIliInspService');
const uteStoIliInspPrepareService = require('./ili/sto-ili-insp-proc/prepareService');
const uteStoIliInspValidationService = require('./ili/sto-ili-insp-proc/validationService');
const IliPressureService = require('./ili/ili-pressure/IliPressureService');
const uteIliPressurePrepareService = require('./ili/ili-pressure/prepareService');
const uteIliPressureValidationService = require('./ili/ili-pressure/validationService');
const IliImportXmlService = require('./ili/ili-import-xml/IliImportXmlService');
const uteIliImportXmlPrepareService = require('./ili/ili-import-xml/prepareService');
const uteIliImportXmlValidationService = require('./ili/ili-import-xml/validationService');
const IntervalDiviningService = require('./route/interval-divining/IntervalDiviningService');
const uteIntervalDiviningPrepareService = require('./route/interval-divining/prepareService');
const uteIntervalDiviningServiceVallidationService = require('./route/interval-divining/validationService');
const GroupRouteIdxService = require('./route/group-route-idx/GroupRouteIdxService');
const uteGroupRouteIdxPrepareService = require('./route/group-route-idx/prepareService');
const uteGroupRouteIdxValidationService = require('./route/group-route-idx/validationService');
const OfflineLineIdxService = require('./route/offline-line-idx/OfflineLineIdxService');
const uteOfflineLineIdxPrepareService = require('./route/offline-line-idx/prepareService');
const uteOfflineLineIdxValidationService = require('./route/offline-line-idx/validationService');
const LineRouteIdxService = require('./route/line-route-idx/LineRouteIdxService');
const uteLineRouteIdxPrepareService = require('./route/line-route-idx/prepareService');
const uteLineRouteIdxValidationService = require('./route/line-route-idx/validationService');

module.exports = {
    uteLrsRouteCalcPrepareService,
    uteLrsRouteCalcValidationService,
    lrsRouteCalcService,
    uteKmRouteCalcPrepareService,
    uteKmRouteCalcValidationService,
    kmRouteCalcService,
    IliInspCalcService,
    uteIliInspCalcPrepareService,
    uteIliInspCalcValidationService,
    LinkRepersService,
    uteLinkRepersPrepareService,
    uteLinkRepersValidationService,
    IliClusterService,
    uteIliClusterPrepareService,
    uteIliClusterValidationService,
    StoEnzInspService,
    uteStoEnzInspPrepareService,
    uteStoEnzInspValidationService,
    StoIliInspService,
    uteStoIliInspPrepareService,
    uteStoIliInspValidationService,
    IliPressureService,
    uteIliPressurePrepareService,
    uteIliPressureValidationService,
    IliImportXmlService,
    uteIliImportXmlPrepareService,
    uteIliImportXmlValidationService,
    IntervalDiviningService,
    uteIntervalDiviningPrepareService,
    uteIntervalDiviningServiceVallidationService,
    GroupRouteIdxService,
    uteGroupRouteIdxPrepareService,
    uteGroupRouteIdxValidationService,
    OfflineLineIdxService,
    uteOfflineLineIdxPrepareService,
    uteOfflineLineIdxValidationService,
    LineRouteIdxService,
    uteLineRouteIdxPrepareService,
    uteLineRouteIdxValidationService,
};
