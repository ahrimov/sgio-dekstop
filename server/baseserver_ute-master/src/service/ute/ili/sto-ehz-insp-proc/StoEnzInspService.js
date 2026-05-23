const {lang, errors} = require("../../../../resources");
const {ErrorHandler, config, logger} = require("gis-core");
const StoEnzInsp = require('./StoEnzInsp');
const DB = require('../../db');
/**
 * Сервис оценки участков ВТД по СТО
 * 4. Расчет линейных показателей в соответствии с инструкцией ВНИИГАЗ 2004
 */
class StoEnzInspService {
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

		logger.info(`proc_start : process_data`);
		//UTEService process=
		// begin_transaction|
			// clear_old_calc|
			// make_regular_intervals|
			// make_construction_intervals|
			// make_line_events|
		// commit_transaction|
		// load_data|
		// calc_sto_xxx|
		// post_calc

		let connection = DB.createConnection();
		logger.info('proc_start : clear_old_calc');
		logger.info('status : Очистка старых расчетов');
		await DB.dbCommand('UTE_SEM.xml#CALC_EHZ_INSP_CALC_STO_6', 'update', params, null, connection);
		logger.info('proc_end : clear_old_calc');

		if(params.calc_regular_intervals) {
			logger.info('proc_start : make_regular_intervals');
			logger.info('status : Нарезка участка между на регулярные интервалы');
			await DB.dbCommand('UTE_SEM.xml#CALC_EHZ_INSP_CALC_STO_9', 'update', params, null, connection);
			logger.info('proc_end : make_regular_intervals');
		}
		if(params.calc_construction_intervals) {
			logger.info('proc_start : make_construction_intervals');
			logger.info('status : Нарезка участка между конструктивными элементами');
			await DB.dbCommand('UTE_SEM.xml#CALC_EHZ_INSP_CALC_STO_8', 'update', params, null, connection);
			logger.info('proc_end : make_construction_intervals');
		}
		if(params.calc_line_events){
			logger.info('proc_start : make_line_events');
			logger.info('status : Создание записей для линейных объектов');
			await DB.dbCommand('UTE_SEM.xml#CALC_EHZ_INSP_CALC_STO_7', 'update', params, null, connection);
			logger.info('proc_end : make_line_events');
		}

		let ds = {
			Tables:{}
		};

		logger.info('proc_start : load_data');
		logger.info('status : Загрузка данных по отчету и интервалам.');
		let insp = await DB.dbReader('UTE_SEM.xml#CALC_EHZ_INSP_CALC_STO_1','select',  params, null, connection);
		ds.Tables.INSPECTION = insp;

		logger.info('status : Загрузка дефектов.');
		let ili = await DB.dbReader('UTE_SEM.xml#CALC_EHZ_INSP_CALC_STO_3','select',  params, null, connection);
		ds.Tables.ILI = ili;

		logger.info('status : Загрузка данных по пересечениям.');
		let crossing = await DB.dbReader('UTE_SEM.xml#CALC_EHZ_INSP_CALC_STO_4','select',  params, null, connection);
		ds.Tables.CROSSING = crossing;

		logger.info('status : Загрузка данных по швам.');
		let welds = await DB.dbReader('UTE_SEM.xml#CALC_EHZ_INSP_CALC_STO_5','select',  params, null, connection);
		ds.Tables.WELDS = welds;
		logger.info('proc_end : load_data');

		let transaction = await DB.beginTransaction(connection);
		if(params.calc_sto_xxx){
			logger.info('proc_start : calc_sto_xxx');
			logger.info(`status : calc_sto_xxx for ${params.data.INSPECTION_ID}`);
			//РАСЧЕТ
			let stoEnzInsp = new StoEnzInsp(params.processParameters);
			ds = stoEnzInsp.calc_sto_xxx(ds);

			logger.info('proc_start : write_result');
			logger.info('status : Заполнение результата расчета');
			await DB.dbWriter('UTE_SEM.xml#CALC_EHZ_INSP_CALC_STO_2', 'insert', ds.Tables.INSPECTION, params, transaction, connection);
			logger.info('proc_end : write_result');
			logger.info('proc_end : calc_sto_xxx');
		}

		logger.info(`proc_start : post_calc`);
		logger.info('status : Постобработка после выполнения каждого отчета');
		await DB.dbCommand('UTE_SEM.xml#ILI_INTEGR_2_13', 'update', params, transaction, connection);
		logger.info(`proc_end : post_calc`);
		
		await DB.commitTransaction(transaction);
		await DB.closeConnection(connection);

		logger.info(`proc_end : process_data`);
	}
}
module.exports = StoEnzInspService;