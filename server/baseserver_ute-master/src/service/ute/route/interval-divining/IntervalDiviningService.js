const {lang, errors} = require("../../../../resources");
const {ErrorHandler, config, logger} = require("gis-core");
const DB = require("../../db");
/**
 * Класс для разбивки отрезка на интрервалы 
 */
class IntervalDiviningService {
	/**
	 *
	 * @param {*} req
	 * @returns
	 */
	static async call(req) {
		logger.info(`proc_start : process_data`);
		const params = req.uteParams;

		let connection = DB.createConnection();
		let transaction = await DB.beginTransaction(connection);

		if (params.regularIntervals) {
			logger.info(`proc_start : clear_old`);
			logger.info('status : Очистка старой нарезки');
			await DB.dbCommand('UTE_SEM.xml#INTERVALS_INTERVAL_DIVINING_UTE_REGULAR_C_2', 'update', params, transaction, connection);
			logger.info(`proc_end : clear_old`);

			logger.info(`proc_start : divide_route`);
			logger.info('status : Нарезка участка между на регулярные интервалы');
			await DB.dbCommand('UTE_SEM.xml#INTERVALS_INTERVAL_DIVINING_UTE_REGULAR_C_1', 'update', params, transaction, connection);
			logger.info(`proc_end : divide_route`);
		} else {
			logger.info(`proc_start : clear_old`);
			logger.info('status : Очистка старой нарезки');
			await DB.dbCommand('UTE_SEM.xml#INTERVALS_INTERVAL_DIVINING_UTE_JUNCTIONS_C_2', 'update', params, transaction, connection);
			logger.info(`proc_end : clear_old`);

			logger.info(`proc_start : divide_route`);
			logger.info('status : Нарезка участка между конструктивными элементами');
			await DB.dbCommand('UTE_SEM.xml#INTERVALS_INTERVAL_DIVINING_UTE_JUNCTIONS_C_1', 'update', params, transaction, connection);
			logger.info(`proc_end : divide_route`);
		}

		await DB.commitTransaction(transaction);
		await DB.closeConnection(connection);

		logger.info(`proc_end : process_data`);
		return {status: 200};
	}
}
module.exports = IntervalDiviningService;
