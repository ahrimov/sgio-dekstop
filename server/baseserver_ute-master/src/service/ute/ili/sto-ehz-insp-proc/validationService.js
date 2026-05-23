const {
    ErrorHandler, logger, config, Utils,
} = require('gis-core');
const { exceptions } = require('gis-core/lib/logging');
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
        const defaultParams = {
            install_date: '06.08.2002',
            calc_sto_xxx: 'true',
        };
        if (jsonData.calc_line_events === '') throw new ErrorHandler(`${errors.gis_core_2}calc_line_events`);
        if (jsonData.line_events_query === '') throw new ErrorHandler(`${errors.gis_core_2}line_events_query`);
        if (jsonData.calc_regular_intervals === '') throw new ErrorHandler(`${errors.gis_core_2}calc_regular_intervals`);
        if (jsonData.regular_intervals_distance === '') throw new ErrorHandler(`${errors.gis_core_2}regular_intervals_distance`);
        if (jsonData.calc_construction_intervals === '') throw new ErrorHandler(`${errors.gis_core_2}calc_construction_intervals`);
        if (jsonData.construction_element_query === '') throw new ErrorHandler(`${errors.gis_core_2}construction_element_query`);
        jsonData.install_date = jsonData.install_date || defaultParams.install_date;
        jsonData.calc_sto_xxx = jsonData.calc_sto_xxx || defaultParams.calc_sto_xxx;
        const uteParams = {
            data: {
                INSPECTION_ID: jsonData.inspection_id,
                LINE_EVENTS_QUERY: jsonData.line_events_query,
                CONSTRUCTION_ELEMENT_QUERY: jsonData.construction_element_query,
                REGULAR_INTERVALS_DISTANCE: jsonData.regular_intervals_distance,
                CALC_TYPE: 'STO_EHZ_INSP_Proc.xml', // используется для post_calc
                CALC_REGULAR_INTERVALS: jsonData.calc_regular_intervals,
                CALC_CONSTRUCTION_INTERVALS: jsonData.calc_construction_intervals,
                CALC_LINE_EVENTS: jsonData.calc_line_events,
            },
            processParameters: {
                INSTALL_DATE: jsonData.install_date,
            },
            processId,
            calc_sto_xxx: jsonData.calc_sto_xxx,
            calc_regular_intervals: jsonData.calc_regular_intervals === 'true',
            calc_construction_intervals: jsonData.calc_construction_intervals === 'true',
            calc_line_events: jsonData.calc_line_events === 'true',
        };
        uteParams.data['config.main.PODS_USER'] = config.PODS_USER;
        return uteParams;
    }
}
module.exports = ValidationService;
