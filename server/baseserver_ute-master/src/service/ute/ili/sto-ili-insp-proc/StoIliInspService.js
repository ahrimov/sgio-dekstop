const {lang, errors} = require("../../../../resources");
const {ErrorHandler, config, logger} = require("gis-core");
const StoIliInsp = require('./StoIliInsp');
const DB = require('../../db');
/**
 * Сервис оценки участков ВТД по СТО
 * 3. Расчет линейных показателей в соответствии с СТО 095, 292, 401
 */
class StoIliInspService {
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
		// calc_sto_2_2_3_292_2007|
		// load_data|
		// calc_sto_2_2_3_401_2003|
		// load_data|
		// calc_sto_xxx|
		// load_data|
		// calc_sto_2_2_3_095_2007|
		// post_calc

		let connection = DB.createConnection();
		logger.info('proc_start : clear_old_calc');
		logger.info('status : Очистка старых расчетов');
		await DB.dbCommand('UTE_SEM.xml#CALC_ILI_INSP_CALC_STO_6', 'update', params, null, connection);
		logger.info('proc_end : clear_old_calc');

		if(params.calc_regular_intervals) {
			logger.info('proc_start : make_regular_intervals');
			logger.info('status : Нарезка участка между на регулярные интервалы');
			await DB.dbCommand('UTE_SEM.xml#CALC_ILI_INSP_CALC_STO_9', 'update', params, null, connection);
			logger.info('proc_end : make_regular_intervals');
		}
		if(params.calc_construction_intervals) {
			logger.info('proc_start : make_construction_intervals');
			logger.info('status : Нарезка участка между конструктивными элементами');
			await DB.dbCommand('UTE_SEM.xml#CALC_ILI_INSP_CALC_STO_8', 'update', params, null, connection);
			logger.info('proc_end : make_construction_intervals');
		}
		if(params.calc_line_events){
			logger.info('proc_start : make_line_events');
			logger.info('status : Создание записей для линейных объектов');
			await DB.dbCommand('UTE_SEM.xml#CALC_ILI_INSP_CALC_STO_7', 'update', params, null, connection);
			logger.info('proc_end : make_line_events');
		}
		let ds = {
			Tables:{}
		};

		ds = await this.loadData_(ds, params, null, connection);
		let transaction = await DB.beginTransaction(connection);

		if(params.calc_sto_2_2_3_292_2007){
			logger.info('proc_start : calc_sto_2_2_3_292_2007');
			logger.info(`status : calc_sto_2_2_3_292_2007 for ${params.data.INSPECTION_ID}`);
			//РАСЧЕТ
			let stoIliInsp = new StoIliInsp(params.processParameters);
			let inspTab = stoIliInsp.calc_sto_2_2_3_292_2007(ds);

			logger.info('proc_start : write_result');
			logger.info('status : Заполнение результата расчета');
			await DB.dbWriter('UTE_SEM.xml#CALC_ILI_INSP_CALC_STO_3', 'insert', inspTab, params, transaction, connection);
			logger.info('proc_end : write_result');

			logger.info('proc_end : calc_sto_2_2_3_292_2007');
		}

		ds = await this.loadData_(ds, params, transaction, connection);

		if(params.calc_sto_2_2_3_401_2003) {
			logger.info('proc_start : calc_sto_2_2_3_401_2003');
			logger.info(`status : calc_sto_2_2_3_401_2003 for ${params.data.INSPECTION_ID}`);
			//РАСЧЕТ
			let stoIliInsp = new StoIliInsp(params.processParameters);
			let inspTab = stoIliInsp.calc_sto_2_2_3_401_2003(ds);

			logger.info('proc_start : write_result');
			logger.info('status : Заполнение результата расчета');
			await DB.dbWriter('UTE_SEM.xml#CALC_ILI_INSP_CALC_STO_3', 'insert', inspTab, params, transaction, connection);
			logger.info('proc_end : write_result');

			logger.info('proc_end : calc_sto_2_2_3_401_2003');
		}

		ds = await this.loadData_(ds, params, transaction, connection);

		if(params.calc_sto_xxx){
			logger.info('proc_start : calc_sto_xxx');
			logger.info(`status : calc_sto_xxx for ${params.data.INSPECTION_ID}`);
			//РАСЧЕТ
			let stoIliInsp = new StoIliInsp(params.processParameters);
			let inspTab = stoIliInsp.calc_sto_xxx(ds);

			logger.info('proc_start : write_result');
			logger.info('status : Заполнение результата расчета');
			await DB.dbWriter('UTE_SEM.xml#CALC_ILI_INSP_CALC_STO_3', 'insert', inspTab, params, transaction, connection);
			logger.info('proc_end : write_result');

			logger.info('proc_end : calc_sto_xxx');
		}

		ds = await this.loadData_(ds, params, transaction, connection);

		if(params.calc_sto_2_2_3_095_2007){
			logger.info('proc_start : calc_sto_2_2_3_095_2007');
			logger.info(`status : calc_sto_2_2_3_095_2007 for ${params.data.INSPECTION_ID}`);
			//РАСЧЕТ
			let stoIliInsp = new StoIliInsp(params.processParameters);
			let inspTab = stoIliInsp.calc_sto_2_2_3_095_2007(ds);

			logger.info('proc_start : write_result');
			logger.info('status : Заполнение результата расчета');
			await DB.dbWriter('UTE_SEM.xml#CALC_ILI_INSP_CALC_STO_3', 'insert', inspTab, params, transaction, connection);
			logger.info('proc_end : write_result');

			logger.info('proc_end : calc_sto_2_2_3_095_2007');
		}
		logger.info(`proc_start : post_calc`);
		logger.info('status : Постобработка после выполнения каждого отчета');
		await DB.dbCommand('UTE_SEM.xml#ILI_INTEGR_2_13', 'update', params, transaction, connection);
		logger.info(`proc_end : post_calc`);
		
		await DB.commitTransaction(transaction);
		await DB.closeConnection(connection);

		logger.info(`proc_end : process_data`);

	}

	static async loadData_(ds, params, transaction = null, connection = null){
		logger.info('proc_start : load_data');
		let welds = await DB.dbReader('UTE_SEM.xml#CALC_ILI_INSP_CALC_STO_4','select',  params, transaction, connection);
		ds.Tables.WELDS = welds;
		let inspection = await DB.dbReader('UTE_SEM.xml#CALC_ILI_INSP_CALC_STO_2','select',  params, transaction, connection);
		ds.Tables.INSP = inspection;
		let ili = await DB.dbReader('UTE_SEM.xml#CALC_ILI_INSP_CALC_STO_5','select',  params, transaction, connection);
		ds.Tables.ILI = ili;
		logger.info('proc_end : load_data');
		return ds;
	}

}

module.exports = StoIliInspService;
