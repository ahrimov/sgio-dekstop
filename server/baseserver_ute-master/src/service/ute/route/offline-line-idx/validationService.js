const {
    ErrorHandler, logger, config, Utils,
} = require('gis-core');
const { errors, lang } = require('../../../../resources');

/**
 * Класс валидации и подстановки дефолтных значений для сервиса привязки вдольтрассовых объектов
 */
class ValidationService {
    /**
     * Функция валидации пришедших данных и подствновки параметров по умолчанию
     * @param jsonData
     * @return {{data: {LINE_ID: string}, processId: (string|*)}}
     */
    static validate(jsonData) {
        if (!jsonData) {
            if (!jsonData.line_id) {
                throw new ErrorHandler(`${errors.gis_core_2} line_id`);
            }
            if (!jsonData.buffer_width) {
                throw new ErrorHandler(`${errors.gis_core_2} buffer_width`);
            }
            if (!jsonData.event_type) {
                throw new ErrorHandler(`${errors.gis_core_2} event_type`);
            }
        }
        // генерируем идентификатор процесса, если он не пришел от клиента.
        const processId = (jsonData.processId) ? jsonData.processId : Utils.generateProcessId();
        const uteParams = {
            data: {
                LINE_ID: jsonData.line_id,
                OFFLINE_EVENT_TYPE_CL: jsonData.event_type,
                FEATURE_ID: jsonData.feature_id,
                LINK_RADIUS: 1,
            },
            processId,
            bufferWidth: jsonData.buffer_width,
        };
        uteParams.data['call_method.RES_FEATURE_ID'] = uteParams.data.FEATURE_ID.replace(/\|/g, ',');
        return uteParams;
    }
}
module.exports = ValidationService;
