const {ErrorHandler, logger} = require('gis-core');
const {errors} = require('../../../../resources');

/**
 * Класс подготовки пришедших данных от клиента для сервиса разбивки отрезка на интрервалы 
 * @param body
 * @return {Promise<*>}
 */
class PrepareService {
	/**
     * Функция парсинга пришедших данных в атрибуте <input>
     * @param body
     * @return {Promise<*>}
     */
	static async parseRequest(body) {
		const {transform} = require('camaro');
		let jsonData;
		if (!body.input) {
			throw new ErrorHandler(errors.gis_core_2, 'input');
		}
		logger.info(`${body.input}`);
		const template = {
			route_id: '/input/@route_id',
			processId: '/input/@process_id',
			regular_intervals: '/input/@regular_intervals',
			regular_intervals_distance: '/input/@regular_intervals_distance',
			construction_element_query: '/input/@construction_element_query',
			feature_types: '/input/@feature_types',
		};
		await transform(body.input, template)
			.then((result) => {
				jsonData = result;
			});
		return jsonData;
	}
}
module.exports = PrepareService;
