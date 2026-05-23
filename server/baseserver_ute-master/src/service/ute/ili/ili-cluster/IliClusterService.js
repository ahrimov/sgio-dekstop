const {lang, errors} = require("../../../../resources");
const {ErrorHandler, config, logger} = require("gis-core");
const IliCluster = require('./IliCluster');
const DB = require('../../db');
/**
 * 1. Группировка дефектов в кластеры
 */
class IliClusterService {
	static async call(req) {
		
		await this.process(req.uteParams);

		return {status: 200};
	}

	/**
	 * Вызов расчета как отдельная функция
	 * @param params
	 * @param transaction
	 * @returns {Promise<void>}
	 */
	static async process(params){
		if (!params)
			throw new ErrorHandler(errors.gis_core_19);
		let connection = DB.createConnection();
		
		logger.info(`proc_start : process_data`);
		let ds = {
			Tables:{}
		};
		//UTEService process=
		// load_def|
		// calc_cluster|
		// begin_transaction|
			// clear_old_calc|
			// prepare_defs|
			// write_cluster|
			// fill_def|
			// write_def|
			// fill_avg|
			// geolize_clusters|
		// commit_transaction|
		// post_calc
		logger.info('status : Получение идентификатора участка');
		let routeId = await DB.dbScalarReader('UTE_SEM.xml#ILI_CLUSTER_1','select',  params, 'ROUTE_ID', null, connection);
		if (routeId === undefined)
			throw new ErrorHandler(errors.gis_core_calc_1, 'ROUTE_ID');
		else
			params.data.P_ROUTE_ID = routeId;
		logger.info(`ROUTE_ID=${params.data.P_ROUTE_ID}`);

		logger.info('status : Получение диаметра');
		let diameter = await DB.dbScalarReader('UTE_SEM.xml#ILI_CLUSTER_2','select',  params, 'NOMINAL_DIAMETER_GCL', null, connection);
		params.processParameters.DIAMETER = 1420;
		if(diameter !== undefined)
			params.processParameters.DIAMETER = diameter;
		logger.info(`DIAMETER=${params.processParameters.DIAMETER}`);

		logger.info('proc_start : load_def');
		let defects = await DB.dbReader('UTE_SEM.xml#CALC_ILI_CALC_CLUSTER_1','select',  params, null, connection);
		logger.info('proc_end : load_def');
		ds.Tables.DEFECTS = defects;
		ds.Tables.CLUSTER = DB.createEmptyTable();
		ds.Tables.ILI_DATA = DB.createEmptyTable();

		let iliCluster = new IliCluster(params.processParameters);
		logger.info('proc_start : calc_cluster');
		ds = iliCluster.process(ds);
		logger.info('proc_end : calc_cluster');

		let transaction = await DB.beginTransaction(connection);
		logger.info('proc_start : clear_old_calc');
		logger.info('status : Очистка старого расчета');
		await DB.dbCommand('UTE_SEM.xml#CALC_ILI_CALC_CLUSTER_6', 'update', params, transaction, connection);
		logger.info('proc_end : clear_old_calc');

		logger.info('proc_start : prepare_defs');
		logger.info('status : Заполнение или обновление данных по дефектам в таблице СТО');
		await DB.dbCommand('UTE_SEM.xml#CALC_ILI_CALC_CLUSTER_4', 'update', params, transaction, connection);
		logger.info('proc_end : prepare_defs');

		logger.info('proc_start : write_cluster');
		logger.info('status : Заполнение кластеров');
		let queryData = await DB.dbWriter('UTE_SEM.xml#CALC_ILI_CALC_CLUSTER_2', 'insert', ds.Tables.CLUSTER, params, transaction, connection);
		logger.info('proc_end : write_cluster');

		logger.info('proc_start : fill_def');
		ds = iliCluster.fill(ds);
		logger.info('proc_end : fill_def');

		logger.info('proc_start : write_def');
		logger.info('status : Заполнение дефектов');
		await DB.dbWriter('UTE_SEM.xml#CALC_ILI_CALC_CLUSTER_3', 'insert', ds.Tables.ILI_DATA, params, transaction, connection);
		logger.info('proc_end : write_def');

		logger.info('proc_start : fill_avg');
		logger.info('status : Расчет средних значений по кластерам');
		await DB.dbCommand('UTE_SEM.xml#CALC_ILI_CALC_CLUSTER_5', 'update', params, transaction, connection);
		logger.info('proc_end : fill_avg');

		logger.info('proc_start : geolize_clusters');
		logger.info('status : Геопривязка кластеров');
		await DB.dbCommand('UTE_SEM.xml#CALC_ILI_GEOLIZE_CLUSTER_1', 'update', params, transaction, connection);
		logger.info('proc_end : geolize_clusters');

		logger.info(`proc_start : post_calc`);
		logger.info('status : Постобработка после выполнения каждого отчета');
		await DB.dbCommand('UTE_SEM.xml#ILI_INTEGR_2_13', 'update', params, transaction, connection);
		logger.info(`proc_end : post_calc`);

		await DB.commitTransaction(transaction);
		await DB.closeConnection(connection);


		logger.info(`proc_end : process_data`);
	}
}

module.exports = IliClusterService;
