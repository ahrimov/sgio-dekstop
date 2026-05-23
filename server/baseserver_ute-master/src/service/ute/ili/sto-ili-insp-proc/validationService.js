const {
    ErrorHandler, logger, config, Utils,
} = require('gis-core');
const { errors, lang } = require('../../../../resources');

/**
 * Класс валидации и подстановки дефолтных значений для сервиса пересчета линейной дистанции
 */
class ValidationService {
    /**
     * Функция валидации пришедших данных и подствновки параметров по умолчанию
     * @param jsonData
     * @returns {{data: {ROUTE_ID: string}, processId: (string|*)}}
     */
    static validate(jsonData) {
        if (!jsonData || !jsonData.inspection_id) throw new ErrorHandler(errors.gis_core_2);
        // генерируем идентификатор процесса, если он не пришел от клиента.
        const processId = (jsonData.processId) ? jsonData.processId : Utils.generateProcessId();
        // ЗДЕСЬ УСТАНАВЛИВАЕМ ЗНАЧЕНИЯ ИЗ СТРОКИ 3 EXCEL
        const defaultParams = {
            pressure: '7.36',
            breaking_point: '588',
            safety_factor_of_internal_pressure: '1.1',
            safety_factor_of_working_conditions: '0.9',
            safety_factor_of_material: '1',
            safety_factor_of_destination: '1.34',
            thickness: '16',
            lifetime: '25',
            average_cost_of_responding: '150',
            cost_of_replacing_a_pipe: '0.6',
            cost_of_the_ILI_per_km: '0.1',
            cost_per_hole: '0.2',
            cost_of_repair_per_km: '23.8',
            calc_sto_2_2_3_292_2007: 'true',
            calc_sto_2_2_3_401_2003: 'true',
            calc_sto_2_2_3_095_2007: 'true',
            calc_sto_xxx: 'true',
        };
        if (jsonData.calc_line_events === '') throw new ErrorHandler(errors.gis_core_2 + jsonData.calc_line_events);
        if (jsonData.line_events_query === '') throw new ErrorHandler(errors.gis_core_2 + jsonData.line_events_query);
        if (jsonData.calc_regular_intervals === '') throw new ErrorHandler(errors.gis_core_2 + jsonData.calc_regular_intervals);
        if (jsonData.regular_intervals_distance === '') throw new ErrorHandler(errors.gis_core_2 + jsonData.regular_intervals_distance);
        if (jsonData.calc_construction_intervals === '') throw new ErrorHandler(errors.gis_core_2 + jsonData.calc_construction_intervals);
        if (jsonData.construction_element_query === '') throw new ErrorHandler(errors.gis_core_2 + jsonData.construction_element_query);
        jsonData.pressure = jsonData.pressure || defaultParams.pressure;
        jsonData.breaking_point = jsonData.breaking_point || defaultParams.breaking_point;
        jsonData.safety_factor_of_internal_pressure = jsonData.safety_factor_of_internal_pressure || defaultParams.safety_factor_of_internal_pressure;
        jsonData.safety_factor_of_working_conditions = jsonData.safety_factor_of_working_conditions || defaultParams.safety_factor_of_working_conditions;
        jsonData.safety_factor_of_material = jsonData.safety_factor_of_material || defaultParams.safety_factor_of_material;
        jsonData.safety_factor_of_destination = jsonData.safety_factor_of_destination || defaultParams.safety_factor_of_destination;
        jsonData.thickness = jsonData.thickness || defaultParams.thickness;
        jsonData.lifetime = jsonData.lifetime || defaultParams.lifetime;
        jsonData.average_cost_of_responding = jsonData.average_cost_of_responding || defaultParams.average_cost_of_responding;
        jsonData.cost_of_replacing_a_pipe = jsonData.cost_of_replacing_a_pipe || defaultParams.cost_of_replacing_a_pipe;
        jsonData.cost_of_the_ILI_per_km = jsonData.cost_of_the_ILI_per_km || defaultParams.cost_of_the_ILI_per_km;
        jsonData.cost_per_hole = jsonData.cost_per_hole || defaultParams.cost_per_hole;
        jsonData.cost_of_repair_per_km = jsonData.cost_of_repair_per_km || defaultParams.cost_of_repair_per_km;
        jsonData.calc_sto_2_2_3_292_2007 = jsonData.calc_sto_2_2_3_292_2007 || defaultParams.calc_sto_2_2_3_292_2007;
        jsonData.calc_sto_2_2_3_401_2003 = jsonData.calc_sto_2_2_3_401_2003 || defaultParams.calc_sto_2_2_3_401_2003;
        jsonData.calc_sto_2_2_3_095_2007 = jsonData.calc_sto_2_2_3_095_2007 || defaultParams.calc_sto_2_2_3_095_2007;
        jsonData.calc_sto_xxx = jsonData.calc_sto_xxx || defaultParams.calc_sto_xxx;
        const uteParams = {
            data: {
                INSPECTION_ID: jsonData.inspection_id,
                CALC_LINE_EVENTS: jsonData.calc_line_events === 'true',
                LINE_EVENTS_QUERY: jsonData.line_events_query,
                CALC_CONSTRUCTION_INTERVALS: jsonData.calc_construction_intervals === 'true',
                CONSTRUCTION_ELEMENT_QUERY: jsonData.construction_element_query,
                CALC_REGULAR_INTERVALS: jsonData.calc_regular_intervals === 'true',
                REGULAR_INTERVALS_DISTANCE: jsonData.regular_intervals_distance,
                ROOT_PATH: jsonData.root_path,
                CALC_TYPE: 'STO_INSP_Proc.xml', // используется для post_calc
            },
            processId, // ЭТУ СТРОКУ НЕ ТРОГАЕМ. СЛУЖЕБНЫЙ ПАРАМЕТР
            processParameters: {
                PRESSURE: jsonData.pressure,
                BREAKING_POINT: jsonData.breaking_point,
                SAFETY_FACTOR_OF_INTERNAL_PRESSURE: jsonData.safety_factor_of_internal_pressure,
                SAFETY_FACTOR_OF_WORKING_CONDITIONS: jsonData.safety_factor_of_working_conditions,
                SAFETY_FACTOR_OF_MATERIAL: jsonData.safety_factor_of_material,
                SAFETY_FACTOR_OF_DESTINATION: jsonData.safety_factor_of_destination,
                THICKNESS: jsonData.thickness,
                LIFETIME: jsonData.lifetime,
                AVERAGE_COST_OF_RESPONDING: jsonData.average_cost_of_responding,
                COST_OF_REPLACING_A_PIPE: jsonData.cost_of_replacing_a_pipe,
                COST_OF_THE_ILI_PER_KM: jsonData.cost_of_the_ILI_per_km,
                COST_PER_HOLE: jsonData.cost_per_hole,
                COST_OF_REPAIR_PER_KM: jsonData.cost_of_repair_per_km,
            },
            // флаги пересчетов
            calc_regular_intervals: jsonData.calc_regular_intervals === 'true',
            calc_construction_intervals: jsonData.calc_construction_intervals === 'true',
            calc_line_events: jsonData.calc_line_events === 'true',
            calc_sto_2_2_3_292_2007: jsonData.calc_sto_2_2_3_292_2007 === 'true',
            calc_sto_2_2_3_401_2003: jsonData.calc_sto_2_2_3_401_2003 === 'true',
            calc_sto_2_2_3_095_2007: jsonData.calc_sto_2_2_3_095_2007 === 'true',
            calc_sto_xxx: jsonData.calc_sto_xxx === 'true',
        };
        // ДОБАВЛЯЕМ НЕОБХОДИМЫЕ ПАРАМЕТРЫ ИЗ WEB.CONFIG
        uteParams.data['config.main.PODS_USER'] = config.PODS_USER;
        return uteParams;
    }
}

module.exports = ValidationService;
