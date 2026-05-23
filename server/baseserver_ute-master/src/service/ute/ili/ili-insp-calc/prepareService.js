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
	static async parseRequest(body){
		const { transform } = require("camaro");
		let jsonData;
		if(!body.input){
			throw new ErrorHandler(errors.gis_core_2, "input");
		}
		logger.info(`${body.input}`);
		const template = {
			ps_idx: '/input/@ps_idx',
			processId: '/input/@process_id',
			inspection_id: '/input/@inspection_id',
		};
		await transform(body.input, template)
			.then(result => {
				jsonData = result;
			});
		return jsonData;
	}
}

module.exports = PrepareService;