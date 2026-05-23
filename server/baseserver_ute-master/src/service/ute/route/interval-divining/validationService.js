const {
    ErrorHandler, logger, config, Utils,
} = require('gis-core');
const { exceptions } = require('gis-core/lib/logging');
const { errors, lang } = require('../../../../resources');

/**
 * Класс валидации и подстановки дефолтных значений для сервиса разбивки отрезка на интрервалы
 */
class ValidationService {
    /**
     * Функция валидации пришедших данных и подствновки параметров по умолчанию
     * @param jsonData
     * @return {{data: {ROUTE_ID: string}, processId: (string|*)}}
     */
    static validate(jsonData) {
        if (!jsonData || !jsonData.route_id) {
            throw new ErrorHandler(errors.gis_core_2);
        }
        // генерируем идентификатор процесса, если он не пришел от клиента.
        const processId = (jsonData.processId) ? jsonData.processId : Utils.generateProcessId();
        if (jsonData.regular_intervals === '') {
            throw new ErrorHandler(`${errors.gis_core_2}regular_intervals`);
        }
        if (jsonData.regular_intervals_distance === '') {
            throw new ErrorHandler(`${errors.gis_core_2}regular_intervals_distance`);
        }
        const uteParams = {
            data: {
                ROUTE_ID: jsonData.route_id,
                FEATURE_TYPES: jsonData.feature_types,
                REGULAR_INTERVALS_DISTANCE: jsonData.regular_intervals_distance,
                CONSTRUCTION_ELEMENT_QUERY: jsonData.construction_element_query,
            },
            regularIntervals: jsonData.regular_intervals === 'true',
            processId, // ЭТУ СТРОКУ НЕ ТРОГАЕМ. СЛУЖЕБНЫЙ ПАРАМЕТР
        };
        // TODO Перенести в отдельную функцию
        uteParams.data['config.main.PODS_USER'] = config.PODS_USER;
        return uteParams;
    }
}
module.exports = ValidationService;
