const {
    ErrorHandler, logger, config, Utils,
} = require('gis-core');
const { errors } = require('../../../../resources');

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
        if (!jsonData || !jsonData.routeId) throw new ErrorHandler(errors.gis_core_2);
        // генерируем идентификатор процесса, если он не пришел от клиента.
        // ЭТУ СТРОКУ НЕ МЕНЯЕМ
        const processId = (jsonData.processId) ? jsonData.processId : Utils.generateProcessId();
        // ЗДЕСЬ УСТАНАВЛИВАЕМ ЗНАЧЕНИЯ ИЗ СТРОКИ 3 EXCEL
        /* let defaultParams = {
            psIdx: true,
            calcSto_2_2_3_112_2007: true,
        } */
        // ПРОВЕРЯЕМ И ФОРМИРУЕМ КОРРЕКТНЫЙ ОБЪЕКТ С ПАРАМЕТРАМИ ДЛЯ РАСЧЕТОВ, КОТОРЫЕ СФОРМИРОВАЛАСЬ НА ЭТАПЕ ПОДГОТОВКИ ДАННЫХ В prepareService
        const uteParams = {
            data: {
                ROUTE_ID: jsonData.routeId,
            },
            processId, // ЭТУ СТРОКУ НЕ ТРОГАЕМ. СЛУЖЕБНЫЙ ПАРАМЕТР
        };
        // ДОБАВЛЯЕМ НЕОБХОДИМЫЕ ПАРАМЕТРЫ ИЗ WEB.CONFIG
        // uteParams.data.PODS_USER = config.PODS_USER;
        return uteParams;
    }
}

module.exports = ValidationService;
