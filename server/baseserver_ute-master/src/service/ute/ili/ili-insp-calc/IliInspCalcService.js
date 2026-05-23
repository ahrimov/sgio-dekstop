const {lang, errors} = require("../../../../resources");
const {ErrorHandler, config, logger} = require("gis-core");
const IliInspCalc = require('./IliInspCalc');
const DB = require('../../db');
/**
 * Класс для рассчета координат дефектов
 */
class IliInspCalcService {
	/**
	 * Вызов расчета, как отдельного сервиса
	 * @param req
	 * @returns {Promise<{status: number}>}
	 */
	static async call(req) {
		let params = req.uteParams;
		let connection = DB.createConnection();
		let transaction = await DB.beginTransaction(connection);
		logger.info('status : Получение ROUTE_ID');
		let routeId = await DB.dbScalarReader('UTE_SEM.xml#ILI_ILI_INSP_PROC_C_1', 'select', params, 'ROUTE_ID', transaction, connection);
		if (routeId === undefined)
			throw new ErrorHandler(errors.gis_core_calc_1, 'ROUTE_ID');
		else
			params.data.P_ROUTE_ID = routeId;
		logger.info(`P_ROUTE_ID=${params.data.P_ROUTE_ID}`);

		await this.process(params, transaction, connection);

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
		logger.info('proc_start : process_data');
		let ds = {
			Tables:{}
		};
		//UTEService process=
		// load_def|
		// calc_def

		logger.info('proc_start : load_def');
		let data = await DB.dbReader('UTE_SEM.xml#CALC_CALC_DEF_1','select',  params, transaction, connection);
		ds.Tables.DATA = data;
		let piket = await DB.dbReader('UTE_SEM.xml#CALC_CALC_DEF_2','select',  params, transaction, connection);
		ds.Tables.PIKET = piket;
		logger.info('proc_end : load_def');

		logger.info('proc_start : calc_def');
		//РАСЧЕТ
		ds.Tables.RES = IliInspCalc.process(ds);

		logger.info('proc_start : update_prev_event');
		logger.info('status : Перевод старых записей в EVENT_RANGE в неактуальное состояние');
		await DB.dbCommand('UTE_SEM.xml#CALC_CALC_DEF_8', 'update', params, transaction, connection);
		logger.info('proc_end : update_prev_event');

		logger.info('proc_start : write_def');
		logger.info('status : Заполнение дефектов');
		await DB.dbWriter('UTE_SEM.xml#CALC_CALC_DEF_3', 'insert', ds.Tables.RES, params, transaction, connection);
		logger.info('proc_end : write_def');

		logger.info('proc_start : update_prev_len_event');
		logger.info('status : Перевод старых записей в EVENT_RANGE в неактуальное состояние');
		let pipeLen = await DB.dbReader('UTE_SEM.xml#CALC_CALC_DEF_5','select',  params, transaction);
		ds.Tables.PIPE_LEN = pipeLen;
		logger.info('proc_end : update_prev_len_event');

		logger.info('proc_start : write_len_event');
		logger.info('status : Заполнение EVENT_RANGE для ILI_PIPE_LENGTH');
		let queryData = await DB.dbWriter('UTE_SEM.xml#CALC_CALC_DEF_6', 'insert', ds.Tables.PIPE_LEN, params, transaction, connection);
		if(params && params.data && queryData.outputParams) {
			params.data['EVENT_ID'] = queryData.outputParams.EVENT_ID;
		}
		logger.info('proc_end : write_len_event');

		logger.info('proc_start : update_pipe_len');
		logger.info('status : Обновление ILI_PIPE_LENGTH');
		await DB.dbWriter('UTE_SEM.xml#CALC_CALC_DEF_7', 'insert', ds.Tables.PIPE_LEN, params, transaction, connection);
		logger.info('proc_end : update_pipe_len');


		logger.info('proc_start : unlink_prev_event');
		logger.info('status : Обнуление ссылок на старые записи в EVENT_RANGE');
		await DB.dbCommand('UTE_SEM.xml#CALC_CALC_DEF_10', 'update', params, transaction, connection);
		logger.info('proc_end : unlink_prev_event');

		logger.info('proc_start : unlink_prev_len_event');
		logger.info('status : Обнуление ссылок на старые записи в EVENT_RANGE');
		await DB.dbCommand('UTE_SEM.xml#CALC_CALC_DEF_11', 'update', params, transaction, connection);
		logger.info('proc_end : unlink_prev_len_event');

		logger.info('proc_start : get_station_range');
		let stationRange = IliInspCalc.getStationRange(ds.Tables.RES);
		params.data['call_complex_method.STATION_RANGE'] = stationRange;
		logger.info('proc_end : get_station_range');

		logger.info('proc_start : update_report');
		await DB.dbCommand('UTE_SEM.xml#CALC_CALC_DEF_12', 'update', params, transaction, connection);
		logger.info('proc_end : update_report');

		logger.info('proc_start : reset_is_dirty');
		await DB.dbCommand('UTE_SEM.xml#CALC_CALC_DEF_13', 'update', params, transaction, connection);
		logger.info('proc_end : reset_is_dirty');

		logger.info('proc_end : calc_def');

		logger.info('proc_end : process_data');
	}
}

module.exports = IliInspCalcService;
