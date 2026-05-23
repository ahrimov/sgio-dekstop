const {lang, errors} = require("../../../../resources");
const {ErrorHandler, config, logger} = require("gis-core");
const KmRouteCalc = require('./KmRouteCalc');
const DB = require('../../db');
/**
 * Класс для пересчета километража
 */
class KmRouteCalcService {
	static async call(req) {
		logger.info(`proc_start : process_data`);
		let params = req.uteParams;

		let connection = DB.createConnection();


		let ds = {
			Tables:{}
		};
		logger.info('proc_start : prepare_km_data');
		let stationPointList = await DB.dbReader('UTE_SEM.xml#CALC_CALC_KM_1','select',  params, null, connection);
		logger.info('proc_end : prepare_km_data');
		ds.Tables.STATION_POINT = stationPointList;
		logger.info('proc_start : km_calc');
		stationPointList = KmRouteCalc.process(ds);
		logger.info('proc_end : km_calc');

		let transaction = await DB.beginTransaction(connection);
		logger.info('proc_start : update_km_data');
		logger.info('status : Обновление STATION_POINT');
		await DB.dbWriter('UTE_SEM.xml#CALC_CALC_KM_2', 'insert', stationPointList, params, transaction, connection);
		logger.info('proc_end : update_km_data');

		await DB.commitTransaction(transaction);
		await DB.closeConnection(connection);

		logger.info(`proc_end : process_data`);
		return {status: 200};
	}
}

module.exports = KmRouteCalcService;
