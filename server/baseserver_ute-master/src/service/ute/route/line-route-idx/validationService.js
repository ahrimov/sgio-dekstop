const {
    ErrorHandler, logger, config, Utils,
} = require('gis-core');
const { exceptions } = require('gis-core/lib/logging');
const { errors, lang } = require('../../../../resources');

/**
 * Класс валидации и подстановки дефолтных значений для сервиса привязки трассовых объектов
 */
class ValidationService {
    /**
     * Функция валидации пришедших данных и подствновки параметров по умолчанию
     * @param jsonData
     * @return {{data: {ROUTE_ID: string}, processId: (string|*)}}
     */
    static validate(jsonData) {
        if (!jsonData) {
            if (!jsonData.route_id) {
                throw new ErrorHandler(`${errors.gis_core_2} route_id`);
            }
            if (!jsonData.buffer_width) {
                throw new ErrorHandler(`${errors.gis_core_2} buffer_width`);
            }
        }
        // генерируем идентификатор процесса, если он не пришел от клиента.
        const processId = (jsonData.processId) ? jsonData.processId : Utils.generateProcessId();
        const uteParams = {
            data: {
                ROUTE_ID: jsonData.route_id,
                FEATURE_ID: jsonData.feature_id,
            },
            processId,
            bufferWidth: jsonData.buffer_width,
        };
        uteParams.data['call_method.RES_FEATURE_ID'] = uteParams.data.FEATURE_ID.replace(/\|/g, ',');
        return uteParams;
    }
}
module.exports = ValidationService;
