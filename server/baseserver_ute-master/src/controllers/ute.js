const {
	lrsRouteCalcService,
	kmRouteCalcService,
	IliInspCalcService,
	LinkRepersService,
	IliClusterService,
	StoEnzInspService,
	StoIliInspService,
	IliPressureService,
	IliImportXmlService,
	IntervalDiviningService,
	GroupRouteIdxService,
	OfflineLineIdxService,
	LineRouteIdxService,
} = require('../service/ute');
const {logger} = require('gis-core');
const fs = require("fs");

const blockerFilePath = '/home/websys53/gis_web80/nodejs/baseserver/blockerFile'

function writeToLog(step, id, serviceName, serviceGroup) {
	switch (step) {
		case 'service':
			logger.info(`service : @${id}@ : {"serviceName": "${serviceName}", "serviceGroup": "${serviceGroup}"}`);
			fs.writeFileSync(`${blockerFilePath}_${id}`, `{"serviceName": "${serviceName}", "serviceGroup": "route"}`);
			break;
		case 'finished':
			logger.info(`finished : @${id}@ : {"serviceName": "${serviceName}", "serviceGroup": "${serviceGroup}"}`);
			try {
				fs.unlinkSync(`${blockerFilePath}_${id}`);
			} catch (err) {}
			break;
		default: break
	}
}

module.exports = {
	async lrsRouteCalc(req, res, next) {
		try {
			writeToLog('service', req.uteParams.processId, req.uteParams.serviceName, 'route');
			const result = await lrsRouteCalcService.call(req);
			res.send(result);
		} catch (e) {
			next(e);
		} finally {
			writeToLog('finished', req.uteParams.processId, req.uteParams.serviceName, 'route');
		}
	},
	async kmRouteCalc(req, res, next) {
		try {
			writeToLog('service', req.uteParams.processId, req.uteParams.serviceName, 'route');
			const result = await kmRouteCalcService.call(req);
			res.send(result);
		} catch (e) {
			next(e);
		} finally {
			writeToLog('finished', req.uteParams.processId, req.uteParams.serviceName, 'route');
		}
	},
	async iliInspCalc(req, res, next) {
		try {
			writeToLog('service', req.uteParams.processId, req.uteParams.serviceName, 'ili');
			const result = await IliInspCalcService.call(req);
			res.send(result);
		} catch (e) {
			next(e);
		} finally {
			writeToLog('finished', req.uteParams.processId, req.uteParams.serviceName, 'ili');
		}
	},
	async linkRepers(req, res, next) {
		try {
			writeToLog('service', req.uteParams.processId, req.uteParams.serviceName, 'ili');
			const result = await LinkRepersService.call(req);
			res.send(result);
		} catch (e) {
			next(e);
		} finally {
			writeToLog('finished', req.uteParams.processId, req.uteParams.serviceName, 'ili');
		}
	},
	async iliImportXml(req, res, next) {
		try {
			writeToLog('service', req.uteParams.processId, req.uteParams.serviceName, 'ili');
			const result = await IliImportXmlService.call(req);
			res.send(result);
		} catch (e) {
			next(e);
		} finally {
			writeToLog('finished', req.uteParams.processId, req.uteParams.serviceName, 'ili');
		}
	},
	async iliCluster(req, res, next) {
		try {
			writeToLog('service', req.uteParams.processId, req.uteParams.serviceName, 'ili');
			const result = await IliClusterService.call(req);
			res.send(result);
		} catch (e) {
			next(e);
		} finally {
			writeToLog('finished', req.uteParams.processId, req.uteParams.serviceName, 'ili');
		}
	},
	async stoEnzInsp(req, res, next) {
		try {
			writeToLog('service', req.uteParams.processId, req.uteParams.serviceName, 'ili');
			const result = await StoEnzInspService.call(req);
			res.send(result);
		} catch (e) {
			next(e);
		} finally {
			writeToLog('finished', req.uteParams.processId, req.uteParams.serviceName, 'ili');
		}
	},
	async stoIliInsp(req, res, next) {
		try {
			writeToLog('service', req.uteParams.processId, req.uteParams.serviceName, 'ili');
			const result = await StoIliInspService.call(req);
			res.send(result);
		} catch (e) {
			next(e);
		} finally {
			writeToLog('finished', req.uteParams.processId, req.uteParams.serviceName, 'ili');
		}
	},
	async iliPressure(req, res, next) {
		try {
			writeToLog('service', req.uteParams.processId, req.uteParams.serviceName, 'ili');
			const result = await IliPressureService.call(req);
			res.send(result);
		} catch (e) {
			next(e);
		} finally {
			writeToLog('finished', req.uteParams.processId, req.uteParams.serviceName, 'ili');
		}
	},
	async groupRouteIdx(req, res, next) {
		try {
			writeToLog('service', req.uteParams.processId, req.uteParams.serviceName, 'route');
			const result = await GroupRouteIdxService.call(req);
			res.send(result);
		} catch (e) {
			next(e);
		} finally {
			writeToLog('finished', req.uteParams.processId, req.uteParams.serviceName, 'route');
		}
	},
	async offLineLineIdx(req, res, next) {
		try {
			writeToLog('service', req.uteParams.processId, req.uteParams.serviceName, 'route');
			const result = await OfflineLineIdxService.call(req);
			res.send(result);
		} catch (e) {
			next(e);
		} finally {
			writeToLog('finished', req.uteParams.processId, req.uteParams.serviceName, 'route');
		}
	},
	async lineRouteIdx(req, res, next) {
		try {
			writeToLog('service', req.uteParams.processId, req.uteParams.serviceName, 'route');
			const result = await LineRouteIdxService.call(req);
			res.send(result);
		} catch (e) {
			next(e);
		} finally {
			writeToLog('finished', req.uteParams.processId, req.uteParams.serviceName, 'route');
		}
	},
	async intervalDivining(req, res, next) {
		try {
			writeToLog('service', req.uteParams.processId, req.uteParams.serviceName, 'route');
			const result = await IntervalDiviningService.call(req);
			res.send(result);
		} catch (e) {
			next(e);
		} finally {
			writeToLog('finished', req.uteParams.processId, req.uteParams.serviceName, 'route');
		}
	},
};
