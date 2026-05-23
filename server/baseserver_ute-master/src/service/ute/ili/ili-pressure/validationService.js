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
     * @returns {{calc_sto_ltg: ((function(*, *=): *)|*|string), calc_sto_2_2_3_620_2011: ((function(*, *=): *)|*|string), data: {CALC_TYPE: string, INSPECTION_ID: (string|*)}, processId: (*|string), calc_sto_2_2_3_112_2007: (*|boolean), calc_sto_2_2_3_292_2009: (*|boolean), calc_sto_2_2_3_595_2011: (*|boolean), calc_sto_2_2_3_173_2007: (*|boolean), processParameters: {PRESSURE: (*|string), SAFETY_FACTOR_OF_DESTINATION: (*|string), RESILIENCE: string, YIELDING_LIMIT: (*|string), SAFETY_FACTOR_OF_MATERIAL: (*|string), BREAKING_POINT: (*|string), ROUTE_CATEGORY: (*|string), SAFETY_FACTOR_OF_WORKING_CONDITIONS: (*|string), THICKNESS: (*|string), ELASTIC_MODULUS: string, SAFETY_FACTOR_OF_INTERNAL_PRESSURE: (*|string)}, calc_sto_2_2_3_401_2009: (*|boolean)}}
     */
    static validate(jsonData) {
        if (!jsonData || !jsonData.inspection_id) throw new ErrorHandler(errors.gis_core_2);
        // генерируем идентификатор процесса, если он не пришел от клиента.
        const processId = (jsonData.processId) ? jsonData.processId : Utils.generateProcessId();
        const defaultParams = {
            pressure: 7.36,
            breaking_point: 588,
            yielding_limit: 490,
            safety_factor_of_internal_pressure: 1.1,
            safety_factor_of_working_conditions: 0.9,
            safety_factor_of_material: 1,
            safety_factor_of_destination: 1.34,
            thickness: 16,
            route_category: 4,
            calc_sto_2_2_3_112_2007: 'true',
            calc_sto_2_2_3_173_2007: 'true',
            calc_sto_2_2_3_292_2009: 'true',
            calc_sto_2_2_3_401_2009: 'true',
            calc_sto_2_2_3_595_2011: 'true',
        };
        jsonData.pressure = jsonData.pressure || defaultParams.pressure;
        jsonData.breaking_point = jsonData.breaking_point || defaultParams.breaking_point;
        jsonData.yielding_limit = jsonData.yielding_limit || defaultParams.yielding_limit;
        jsonData.safety_factor_of_internal_pressure = jsonData.safety_factor_of_internal_pressure || defaultParams.safety_factor_of_internal_pressure;
        jsonData.safety_factor_of_working_conditions = jsonData.safety_factor_of_working_conditions || defaultParams.safety_factor_of_working_conditions;
        jsonData.safety_factor_of_material = jsonData.safety_factor_of_material || defaultParams.safety_factor_of_material;
        jsonData.safety_factor_of_destination = jsonData.safety_factor_of_destination || defaultParams.safety_factor_of_destination;
        jsonData.thickness = jsonData.thickness || defaultParams.thickness;
        jsonData.route_category = jsonData.route_category || defaultParams.route_category;
        jsonData.calc_sto_2_2_3_112_2007 = jsonData.calc_sto_2_2_3_112_2007 || defaultParams.calc_sto_2_2_3_112_2007;
        jsonData.calc_sto_2_2_3_173_2007 = jsonData.calc_sto_2_2_3_173_2007 || defaultParams.calc_sto_2_2_3_173_2007;
        jsonData.calc_sto_2_2_3_292_2009 = jsonData.calc_sto_2_2_3_292_2009 || defaultParams.calc_sto_2_2_3_292_2009;
        jsonData.calc_sto_2_2_3_401_2009 = jsonData.calc_sto_2_2_3_401_2009 || defaultParams.calc_sto_2_2_3_401_2009;
        jsonData.calc_sto_2_2_3_595_2011 = jsonData.calc_sto_2_2_3_595_2011 || defaultParams.calc_sto_2_2_3_595_2011;
        const uteParams = {
            data: {
                INSPECTION_ID: jsonData.inspection_id,
                CALC_TYPE: 'ILI_Pressure.xml', // используется для post_calc
            },
            processParameters: {
                PRESSURE: jsonData.pressure, // давление
                BREAKING_POINT: jsonData.breaking_point, // Предел прочности, МПа
                YIELDING_LIMIT: jsonData.yielding_limit, // Нормативный предел текучести материала, МПа
                ELASTIC_MODULUS: jsonData.elastic_modulus, // Модуль упругости, МПа
                RESILIENCE: jsonData.resilience, // Ударная вязкость, Дж/см2
                SAFETY_FACTOR_OF_INTERNAL_PRESSURE: jsonData.safety_factor_of_internal_pressure, // коэффициент надежности по давлению
                SAFETY_FACTOR_OF_WORKING_CONDITIONS: jsonData.safety_factor_of_working_conditions, // коэффициент условий работы
                SAFETY_FACTOR_OF_MATERIAL: jsonData.safety_factor_of_material, // по материалу
                SAFETY_FACTOR_OF_DESTINATION: jsonData.safety_factor_of_destination, // по назначению
                ROUTE_CATEGORY: jsonData.route_category, // Категория участка
                THICKNESS: jsonData.thickness, // толщина
            },
            processId,
            // флаги пересчетов
            calc_sto_2_2_3_112_2007: jsonData.calc_sto_2_2_3_112_2007 === 'true',
            calc_sto_2_2_3_173_2007: jsonData.calc_sto_2_2_3_173_2007 === 'true',
            calc_sto_2_2_3_292_2009: jsonData.calc_sto_2_2_3_292_2009 === 'true',
            calc_sto_2_2_3_401_2009: jsonData.calc_sto_2_2_3_401_2009 === 'true',
            calc_sto_2_2_3_595_2011: jsonData.calc_sto_2_2_3_595_2011 === 'true',
            calc_sto_2_2_3_620_2011: jsonData.calc_sto_2_2_3_620_2011 === 'true',
            calc_sto_ltg: jsonData.calc_sto_ltg,
        };
        uteParams.data['config.main.PODS_USER'] = config.PODS_USER;
        return uteParams;
    }
}

module.exports = ValidationService;
