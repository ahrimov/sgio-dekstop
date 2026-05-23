const {lang, errors} = require("../../../../resources");
const {ErrorHandler, config, logger} = require("gis-core");
const IliPressure = require('./IliPressure');
const DB = require('../../db');
/**
 * 2. Расчет точечных показателей в соответствии с СТО 112, 173, 292, 401, 595
 */
class IliPressureService {
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
		// load_data|
		// calc_sto_2_2_3_112_2007|
		// calc_sto_2_2_3_173_2007|
		// calc_sto_2_2_3_292_2009|
		// calc_sto_2_2_3_401_2009|
		// calc_sto_2_2_3_595_2011|
		// post_calc"
		logger.info('proc_start : load_data');
		let ili = await DB.dbReader('UTE_SEM.xml#CALC_ILI_CALC_PRESSURE_1','select', params, null, connection);
		logger.info('proc_end : load_data');
		ds.Tables.ILI = ili;

		let transaction = await DB.beginTransaction(connection);
		if(params.calc_sto_2_2_3_112_2007) {
			logger.info('proc_start : calc_sto_2_2_3_112_2007');
			logger.info(`status : СТО Газпром 2-2.3-112-2007 оценка участков с коррозионным дефектом для INSPECTION_ID=${params.data.INSPECTION_ID}`);
			let iliPressure = new IliPressure(params.processParameters);
			ds = iliPressure.calc_sto_2_2_3_112_2007(ds, params.processParameters);

			logger.info('proc_start : write_result');
			logger.info('status : Заполнение результата расчета');
			await DB.dbWriter('UTE_SEM.xml#CALC_ILI_CALC_PRESSURE_2', 'insert', ds.Tables.ILI, params, transaction, connection);
			logger.info('proc_end : write_result');

			logger.info('proc_end : calc_sto_2_2_3_112_2007');
		}
		if(params.calc_sto_2_2_3_173_2007) {
			logger.info('proc_start : calc_sto_2_2_3_173_2007');
			logger.info(`status : CТО  Газпром 2-2.3-173-2007 оценка участков с КРН дефектами для INSPECTION_ID=${params.data.INSPECTION_ID}`);
			let iliPressure = new IliPressure(params.processParameters);
			ds = iliPressure.calc_sto_2_2_3_173_2007(ds, params.processParameters);

			logger.info('proc_start : write_result');
			logger.info('status : Заполнение результата расчета');
			await DB.dbWriter('UTE_SEM.xml#CALC_ILI_CALC_PRESSURE_2', 'insert', ds.Tables.ILI, params, transaction, connection);
			logger.info('proc_end : write_result');

			logger.info('proc_end : calc_sto_2_2_3_173_2007');
		}
		if(params.calc_sto_2_2_3_292_2009) {
			logger.info('proc_start : calc_sto_2_2_3_292_2009');
			logger.info(`status : СТО Газпром 2-2.3-292-2009  Определение ТС МГ по результатам ВТД для INSPECTION_ID=${params.data.INSPECTION_ID}`);
			let iliPressure = new IliPressure(params.processParameters);
			ds = iliPressure.calc_sto_2_2_3_292_2009(ds, params.processParameters);

			logger.info('proc_start : write_result');
			logger.info('status : Заполнение результата расчета');
			await DB.dbWriter('UTE_SEM.xml#CALC_ILI_CALC_PRESSURE_2', 'insert', ds.Tables.ILI, params, transaction, connection);
			logger.info('proc_end : write_result');

			logger.info('proc_end : calc_sto_2_2_3_292_2009');
		}
		if(params.calc_sto_2_2_3_401_2009) {
			logger.info('proc_start : calc_sto_2_2_3_401_2009');
			logger.info(`status : Признак необходимости расчета СТО Газпром 2-2.3-401-2009 - Вероятность отказа для трубы с коррозионным дефектом для INSPECTION_ID=${params.data.INSPECTION_ID}`);
			let iliPressure = new IliPressure(params.processParameters);
			ds = iliPressure.calc_sto_2_2_3_401_2009(ds, params.processParameters);

			logger.info('proc_start : write_result');
			logger.info('status : Заполнение результата расчета');
			await DB.dbWriter('UTE_SEM.xml#CALC_ILI_CALC_PRESSURE_2', 'insert', ds.Tables.ILI, params, transaction, connection);
			logger.info('proc_end : write_result');

			logger.info('proc_end : calc_sto_2_2_3_401_2009');
		}
		if(params.calc_sto_2_2_3_595_2011) {
			logger.info('proc_start : calc_sto_2_2_3_595_2011');
			logger.info(`status : Признак необходимости расчета Р Газпром 2-2.3-595-2011 Назначение ремонтных рекомендации для INSPECTION_ID=${params.data.INSPECTION_ID}`);
			let iliPressure = new IliPressure(params.processParameters);
			ds = iliPressure.calc_sto_2_2_3_595_2011(ds, params.processParameters);

			logger.info('proc_start : write_result');
			logger.info('status : Заполнение результата расчета');
			await DB.dbWriter('UTE_SEM.xml#CALC_ILI_CALC_PRESSURE_2', 'insert', ds.Tables.ILI, params, transaction, connection);
			logger.info('proc_end : write_result');

			logger.info('proc_end : calc_sto_2_2_3_595_2011');
		}
		//Не используется, т.к. исключен из расчетов в UTEService
		if(false && params.calc_sto_2_2_3_620_2011) {
			logger.info('proc_start : calc_sto_2_2_3_620_2011');
			logger.info(`status : Признак необходимости расчета Р Газпром 2-2.3-620-2011 для INSPECTION_ID=${params.data.INSPECTION_ID}`);
			let iliPressure = new IliPressure(params.processParameters);
			ds = iliPressure.calc_sto_2_2_3_620_2011(ds, params.processParameters);

			logger.info('proc_start : write_result');
			logger.info('status : Заполнение результата расчета');
			await DB.dbWriter('UTE_SEM.xml#CALC_ILI_CALC_PRESSURE_2', 'insert', ds.Tables.ILI, params, transaction, connection);
			logger.info('proc_end : write_result');

			logger.info('proc_end : calc_sto_2_2_3_620_2011');
		}
		//Не используется, т.к. исключен из расчетов в UTEService
		if(false && params.calc_sto_ltg) {
			logger.info('proc_start : calc_sto_ltg');
			logger.info(`status : Признак необходимости расчета по методике ЛТГ для INSPECTION_ID=${params.data.INSPECTION_ID}`);
			let iliPressure = new IliPressure(params.processParameters);
			ds = iliPressure.calc_sto_ltg(ds, params.processParameters);

			logger.info('proc_start : write_result');
			logger.info('status : Заполнение результата расчета');
			await DB.dbWriter('UTE_SEM.xml#CALC_ILI_CALC_PRESSURE_2', 'insert', ds.Tables.ILI, params, transaction, connection);
			logger.info('proc_end : write_result');

			logger.info('proc_end : calc_sto_ltg');
		}
		logger.info('proc_start : post_calc');
		logger.info('status : Постобработка после выполнения каждого отчета');
		await DB.dbCommand('UTE_SEM.xml#ILI_INTEGR_2_13', 'update', params, transaction, connection);
		logger.info('proc_end : post_calc');

		await DB.commitTransaction(transaction);
		await DB.closeConnection(connection);

		logger.info(`proc_end : process_data`);
	}
}

module.exports = IliPressureService;
