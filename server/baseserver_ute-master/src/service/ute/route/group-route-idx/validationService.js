const {
    ErrorHandler, logger, config, Utils,
} = require('gis-core');
const { exceptions } = require('gis-core/lib/logging');
const { errors, lang } = require('../../../../resources');

/**
 * Класс валидации и подстановки дефолтных значений для сервиса группировки пересекаемых объектов
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
        if (jsonData.group_name === '') {
            jsonData.group_name = 'Крановая площадка->конструктивный элемент';
        }
        if (jsonData.feature_id === '') {
            jsonData.feature_id = 'VALVE';
        }
        const uteParams = {
            data: {
                ROUTE_ID: jsonData.route_id,
                FEATURE_ID: jsonData.feature_id,
                GROUP_NAME: jsonData.group_name,
            },
            processId,
        };
        uteParams.data['call_method.RES_OBJ_FEATURE_ID'] = uteParams.data.FEATURE_ID.replace(/\|/g, ',');
        return uteParams;
    }
}
module.exports = ValidationService;
