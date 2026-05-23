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
        //<input process_id="030b7de8" root_path="/home/websys53/gis_web77/website/"
        // xml_file_name="Public/Data/UploadedFiles/ооо газпром трансгаз чайковский_ямбург - тула - 1_1420_кс карпинская - кс гремячинская_2020_7_21-2e88a437.xml"
        // data_file_name="ооо газпром трансгаз чайковский_ямбург - тула - 1_1420_кс карпинская - кс гремячинская_2020_7_21-2e88a437.xml"
        // do_calc_inspection="true"
        // pipe="1305491" route_id="" ROUTE_ID="" km_start="1430.6" km_end="1553" date="22.11.2020" format="xml"
        // company="UNKNOWN" ps_idx="false"
        //   />
        const template = {
            processId: '/input/@process_id',
            xml_file_name: '/input/@xml_file_name',
            do_calc_inspection: '/input/@do_calc_inspection',
            ps_idx: '/input/@ps_idx',
            pipe: '/input/@pipe',
            km_start: '/input/@km_start',
            km_end: '/input/@km_end',
            date: '/input/@date',
            format: '/input/@format',
            company: '/input/@company',
            source_gcl: '/input/@source_gcl',
            ref_route_id: '/input/@REF_ROUTE_ID',
            data_file_name: '/input/@data_file_name',
            do_calc_cluster: '/input/@do_calc_cluster',
            do_calc_pressure: '/input/@do_calc_pressure',
            do_calc_sto: '/input/@do_calc_sto',
            do_calc_sto_for_ehz: '/input/@do_calc_sto_for_ehz'
        };
        await this.checkCalcParams(body, template);
        await transform(body.input, template)
            .then(result => {
                jsonData = result;
            });
        return jsonData;
    }
    /**
     * 
     * @param {*} body 
     * @param {*} template 
     * @return {*} 
     */
    static async checkCalcParams(body, template){
        let inputs, templateNames;
        if (body.input.indexOf('|') !== -1 && body.templateName.indexOf('|') !== -1){
            templateNames = body.templateName.split('|');
            inputs = body.input.split('|');
            if (inputs && templateNames && templateNames.length === inputs.length){
                for (let i = 0; i < templateNames.length; i++){
                    let templateName = templateNames[i];
                    switch (templateName) {
                        case 'ILI_ZIP_Imp_55.xml':
                            continue;
                        case 'ILI_Cluster.xml':
                            template['cluster_params'] ={
                                inspection_id: '/input/@inspection_id',
                                pressure: '/input/@pressure',
                                thickness: '/input/@thickness',
                                processId: '/input/@process_id',
                            };
                            break;
                        case 'ILI_Pressure.xml':
                            template['pressure_params'] ={
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
                            break;
                        case 'STO_ILI_INSP_Proc.xml':
                            template['ili_insp_params'] ={
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
                            break;
                        case 'STO_EHZ_INSP_Proc.xml':
                            template['ehz_insp_params'] ={
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
                            break;
                    }
                }
            }
        }
    }
}

module.exports = PrepareService;