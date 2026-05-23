const {lang, errors} = require("../../../../resources");
const {ErrorHandler, config, logger} = require("gis-core");
const LinkRepers = require('./LinkRepers');
const DB = require('../../db');
const IliInspCalcService = require("../ili-insp-calc/IliInspCalcService");
/**
 * Класс для привязки реперов и рассчета координат дефектов
 */
class LinkRepersService {
	/**
	 * Вызов расчета, как отдельного сервиса
	 * @param req
	 * @returns {Promise<{status: number}>}
	 */
	static async call(req) {
		let params = req.uteParams;
		//UTEService process=
		// unlink_repers|
		// load_repers|
		// link_repers|
		// load_def|
		// calc_def

		let connection = DB.createConnection();
		let transaction = await DB.beginTransaction(connection);

		logger.info('proc_start : unlink_repers');
		logger.info('status : Отвязываю репера');
		await DB.dbCommand('UTE_SEM.xml#CALC_LINK_REPERS_4', 'update', params, transaction, connection);
		logger.info('proc_end : unlink_repers');

		logger.info('status : Получение ROUTE_ID');
		let routeId = await DB.dbScalarReader('UTE_SEM.xml#ILI_ILI_INSP_PROC_C_1', 'select', params, 'ROUTE_ID', transaction, connection);
		if (routeId === undefined)
			throw new ErrorHandler(errors.gis_core_calc_1, 'ROUTE_ID');
		else
			params.data.P_ROUTE_ID = routeId;
		logger.info(`P_ROUTE_ID=${params.data.P_ROUTE_ID}`);
		if(params.linkRepers) {
			logger.info('status : Начинаю привязку реперов');
			await this.process(params, transaction, connection);
			logger.info('status : Привязка реперов закончена');
		}
		else
			logger.info('status : Начинаю пересчет без привязки реперов');

		//выполняем пересчет координат дефектов
		await IliInspCalcService.process(params, transaction, connection);

		await DB.commitTransaction(transaction);
		await DB.closeConnection(connection);

		return {status: 200};
	}

	/**
	 * Вызов расчета как отдельная функция
	 * @param params
	 * @param transaction
	 * @returns {Promise<void>}
	 */
	static async process(params, transaction, connection){
		if(!transaction || !connection)
			throw new ErrorHandler(errors.gis_core_18);
		logger.info(`proc_start : process_data`);
		let ds = {
			Tables:{}
		};

		logger.info('proc_start : load_repers');
		let rep = await DB.dbReader('UTE_SEM.xml#CALC_LINK_REPERS_1','select',  params, transaction, connection);
		ds.Tables.REP = rep;
		let gp = await DB.dbReader('UTE_SEM.xml#CALC_LINK_REPERS_2','select',  params, transaction, connection);
		ds.Tables.GP = gp;
		logger.info('proc_end : load_repers');

		//РАСЧЕТ
		logger.info('proc_start : link_repers');
		ds.Tables.RES_REP = LinkRepers.process(ds);
		logger.info('proc_start : update_control_points');
		logger.info('status : Обновляю контрольные точки');
		if(ds.Tables.RES_REP)
			await DB.dbWriter('UTE_SEM.xml#CALC_LINK_REPERS_3', 'insert', ds.Tables.RES_REP, params, transaction, connection);
		logger.info('proc_end : update_control_points');

		logger.info('proc_end : link_repers');

		logger.info(`proc_end : process_data`);
	}
}

module.exports = LinkRepersService;
