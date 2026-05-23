const express = require('express');
const {
    uteController,
} = require('../controllers');

const router = express.Router();

// 1-й сервис
router.post('/api/ute/lrs-route-calc', uteController.lrsRouteCalc);
// 2-й сервис
router.post('/api/ute/km-route-calc', uteController.kmRouteCalc);
// 3-й сервис
router.post('/api/ute/ili-insp-calc', uteController.iliInspCalc);
// 3-й сервис
router.post('/api/ute/ili-insp-link', uteController.linkRepers);
// 4-й сервис
router.post('/api/ute/ili-import-xml', uteController.iliImportXml);
// 5-й сервис
router.post('/api/ute/ili-cluster', uteController.iliCluster);
// 6-й сервис
router.post('/api/ute/sto-ehz-insp-proc', uteController.stoEnzInsp);
// 7-й сервис
router.post('/api/ute/sto-ili-insp-proc', uteController.stoIliInsp);
// 8-й срвис
router.post('/api/ute/ili-pressure', uteController.iliPressure);
// 9-й сервис
router.post('/api/ute/group-route-idx', uteController.groupRouteIdx);
// 10-й сервис
router.post('/api/ute/offline-line-idx', uteController.offLineLineIdx);
// 11-й сервис
router.post('/api/ute/line-route-idx', uteController.lineRouteIdx);
// 12-й сервис
router.post('/api/ute/interval-divining', uteController.intervalDivining);

module.exports = router;
