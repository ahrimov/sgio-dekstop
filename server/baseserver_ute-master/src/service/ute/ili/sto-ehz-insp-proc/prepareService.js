const { ErrorHandler, logger } = require("gis-core");
const { errors } = require("../../../../resources");

/**
 * Класс подготовки пришедших данных от клиента для сервиса пересчета линейной дистанции
 * @param body
 * @returns {Promise<*>}
 */
class PrepareService {
	/**
     * Функция парсинга пришедших данных в атрибуте <input>
     * @param body
     * @returns {Promise<*>}
     */
	static async parseRequest(body) {
		const { transform } = require("camaro");
		let jsonData;
		if (!body.input) {
			throw new ErrorHandler(errors.gis_core_2, "input");
		}
		logger.info(`${body.input}`);
		const template = {
			inspection_id: '/input/@inspection_id',
			processId: '/input/@process_id',
			calc_line_events: '/input/@calc_line_events',
			line_events_query: '/input/@line_events_query',
			calc_construction_intervals: '/input/@calc_construction_intervals',
			construction_element_query: '/input/@construction_element_query',
			calc_regular_intervals: '/input/@calc_regular_intervals',
			regular_intervals_distance: '/input/@regular_intervals_distance',
			install_date: '/input/@install_date',
			calc_sto_xxx: '/input/@calc_sto_xxx',
		};
		await transform(body.input, template)
			.then(result => {
				jsonData = result;
			});
		return jsonData;
	}
}

module.exports = PrepareService;