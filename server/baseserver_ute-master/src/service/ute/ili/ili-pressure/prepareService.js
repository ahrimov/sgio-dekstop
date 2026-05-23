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
			inspection_id: '/input/@inspection_id',
			processId: '/input/@process_id',
			pressure: '/input/@pressure',
			breaking_point: '/input/@breaking_point',
			yielding_limit: '/input/@yielding_limit',
			elastic_modulus: '/input/@elastic_modulus',
			safety_factor_of_internal_pressure: '/input/@safety_factor_of_internal_pressure',
			safety_factor_of_working_conditions: '/input/@safety_factor_of_working_conditions',
			safety_factor_of_material: '/input/@safety_factor_of_material',
			safety_factor_of_destination: '/input/@safety_factor_of_destination',
			route_category: '/input/@route_category', 
			thickness: '/input/@thickness',
			calc_sto_2_2_3_112_2007: '/input/@calc_sto_2_2_3_112_2007',
			calc_sto_2_2_3_173_2007: '/input/@calc_sto_2_2_3_173_2007',
			calc_sto_2_2_3_292_2009: '/input/@calc_sto_2_2_3_292_2009', 
			calc_sto_2_2_3_401_2009: '/input/@calc_sto_2_2_3_401_2009', 
			calc_sto_2_2_3_595_2011: '/input/@calc_sto_2_2_3_595_2011', 
			calc_sto_2_2_3_620_2011: '/input/@calc_sto_2_2_3_620_2011', 
			calc_sto_ltg: '/input/@calc_sto_ltg',
			resilience: '/input/@resilience', 
		};
		await transform(body.input, template)
			.then(result => {
				jsonData = result;
			});
		return jsonData;
	}
}
module.exports = PrepareService;