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
        const defaultParams = {
            pressure: 7.36,
            thickness: 10,
        };
        jsonData.pressure = jsonData.pressure || defaultParams.pressure;
        jsonData.thickness = jsonData.thickness || defaultParams.thickness;
        const uteParams = {
            data: {
                INSPECTION_ID: jsonData.inspection_id,
                CALC_TYPE: 'ILI_Cluster.xml', // используется для post_calc
            },
            processParameters: {
                PRESSURE: jsonData.pressure,
                THICKNESS: jsonData.thickness,
                ILI_INSPECTION_ID: jsonData.inspection_id,
                INSPECTION_ID: jsonData.inspection_id,
            },
            processId,
        };
        uteParams.data['config.main.PODS_USER'] = config.PODS_USER;
        return uteParams;
    }
}

module.exports = ValidationService;
