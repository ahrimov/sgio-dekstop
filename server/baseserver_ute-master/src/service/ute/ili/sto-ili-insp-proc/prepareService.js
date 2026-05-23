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
			calc_line_events: '/input/@calc_line_events',
			line_events_query: '/input/@line_events_query',
			calc_construction_intervals: '/input/@calc_construction_intervals',
			construction_element_query: '/input/@construction_element_query',
			calc_regular_intervals: '/input/@calc_regular_intervals',
			regular_intervals_distance: '/input/@regular_intervals_distance',
			pressure: '/input/@pressure',
			breaking_point: '/input/@breaking_point',
			safety_factor_of_internal_pressure: '/input/@safety_factor_of_internal_pressure',
			safety_factor_of_working_conditions: '/input/@safety_factor_of_working_conditions',
			safety_factor_of_material: '/input/@safety_factor_of_material',
			safety_factor_of_destination: '/input/@safety_factor_of_destination',
			thickness: '/input/@thickness',
			lifetime: '/input/@lifetime',
			average_cost_of_responding: '/input/@average_cost_of_responding',
			cost_of_replacing_a_pipe: '/input/@cost_of_replacing_a_pipe',
			cost_of_the_ILI_per_km: '/input/@cost_of_the_ILI_per_km',
			cost_per_hole: '/input/@cost_per_hole',
			cost_of_repair_per_km: '/input/@cost_of_repair_per_km',
			calc_sto_2_2_3_292_2007: '/input/@calc_sto_2_2_3_292_2007',
			calc_sto_2_2_3_401_2003: '/input/@calc_sto_2_2_3_401_2003',
			calc_sto_2_2_3_095_2007: '/input/@calc_sto_2_2_3_095_2007',
			calc_sto_xxx: '/input/@calc_sto_xxx',
			root_path: '/input/@root_path',
		};
		await transform(body.input, template)
			.then(result => {
				jsonData = result;
			});
		return jsonData;
	}
}

module.exports = PrepareService;