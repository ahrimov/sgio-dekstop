const {lang, errors} = require("../../../../resources");
const {ErrorHandler, config, logger} = require("gis-core");
const LrsRouteCalc = require('./LrsRouteCalc');
const DB = require('../../db');
/**
 * Класс для пересчета линейной дистанции по участку
 */
class LrsRouteCalcService {
	/**
	 * Пересчет линейной дистанции
	 * @param req
	 * @returns {Promise<{status: number}>}
	 */
	static async call(req) {
		logger.info(`proc_start : process_data`);
		let params = req.uteParams;
		let ds = {
			Tables:{}
		};
		let connection = DB.createConnection();

		logger.info('proc_start : prepare_lrs_data');
		let stationPointList = await DB.dbReader('UTE_SEM.xml#CALC_CALC_LRS_1','select',  params, null, connection);
		logger.info('proc_end : prepare_lrs_data');
		ds.Tables.STATION_POINT = stationPointList;

		//РАСЧЕТ
		logger.info('proc_start : lrs_calc');
		stationPointList = LrsRouteCalc.process(ds, logger);
		logger.info('proc_end : lrs_calc');

		logger.info('proc_start : update_lrs_data');
		logger.info('status : Обновление STATION_POINT');

		let transaction = await DB.beginTransaction(connection);
		await DB.dbWriter('UTE_SEM.xml#CALC_CALC_LRS_2', 'insert', stationPointList, params, transaction, connection);
		logger.info('proc_end : update_lrs_data');

		await DB.commitTransaction(transaction);
		await DB.closeConnection(connection);

		logger.info(`proc_end : process_data`);
		return {status: 200};
	}
}

module.exports = LrsRouteCalcService;
