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
            psIdx: false,
        };
        // ПРОВЕРЯЕМ И ФОРМИРУЕМ КОРРЕКТНЫЙ ОБЪЕКТ С ПАРАМЕТРАМИ ДЛЯ РАСЧЕТОВ, КОТОРЫЕ СФОРМИРОВАЛАСЬ НА ЭТАПЕ ПОДГОТОВКИ ДАННЫХ В prepareService
        if (jsonData.ps_idx === '') {
            jsonData.ps_idx = defaultParams.psIdx;
            logger.info(`${lang.gis_core_2_1}PS_IDX`);
        }
        const uteParams = {
            data: {
                INSPECTION_ID: jsonData.inspection_id,
                P_REPORT_ID: jsonData.inspection_id,
            },
            psIdx: jsonData.ps_idx,
            processId, // ЭТУ СТРОКУ НЕ ТРОГАЕМ. СЛУЖЕБНЫЙ ПАРАМЕТР
        };
        uteParams.data['config.main.PODS_USER'] = config.PODS_USER;
        uteParams.data['config.main.COORD_TOLERANCE'] = config.COORD_TOLERANCE || 1;
        uteParams.data['config.main.LINK_RADIUS'] = config.LINK_RADIUS || 5;
        return uteParams;
    }
}

module.exports = ValidationService;
