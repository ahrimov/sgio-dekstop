const {
    ErrorHandler, logger, config, Utils,
} = require('gis-core');
const { errors } = require('../../../../resources');
const ValidationServiceCluster = require('../ili-cluster/validationService');
const ValidationServicePressure = require('../ili-pressure/validationService');
const ValidationServiceIliInsp = require('../sto-ili-insp-proc/validationService');
const ValidationServiceEhzInsp = require('../sto-ehz-insp-proc/validationService');
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
        if (!jsonData || Object.keys(jsonData).length === 0) throw new ErrorHandler(errors.gis_core_2);
        if (!jsonData.data_file_name) throw new ErrorHandler(errors.gis_import_xml_3);
        if (jsonData.ref_route_id === errors.gis_import_xml_1) throw new ErrorHandler(errors.gis_import_xml_2);
        // генерируем идентификатор процесса, если он не пришел от клиента.
        const processId = (jsonData.processId) ? jsonData.processId : Utils.generateProcessId();
        const defaultParams = {
            ps_idx: false,
            do_calc_inspection: true,
        };
        jsonData.ps_idx = jsonData.ps_idx || defaultParams.ps_idx;
        jsonData.do_calc_inspection = jsonData.do_calc_inspection || defaultParams.do_calc_inspection;
        const uteParams = {
            data: {
                ROUTE: jsonData.pipe,
                KM_START: jsonData.km_start,
                KM_END: jsonData.km_end,
                DATE: jsonData.date,
                COMPANY: jsonData.company,
                FORMAT: jsonData.format,
                SOURCE_GCL: jsonData.source_gcl,
            },
            do_calc_inspection: jsonData.do_calc_inspection === 'true' || jsonData.do_calc_inspection === 'True',
            do_calc_cluster: jsonData.do_calc_cluster === 'true' || jsonData.do_calc_cluster === 'True',
            do_calc_pressure: jsonData.do_calc_pressure === 'true' || jsonData.do_calc_pressure === 'True',
            do_calc_sto: jsonData.do_calc_sto === 'true' || jsonData.do_calc_sto === 'True',
            do_calc_sto_for_ehz: jsonData.do_calc_sto_for_ehz === 'true' || jsonData.do_calc_sto_for_ehz === 'True',
            ps_idx: jsonData.ps_idx === 'true' || jsonData.ps_idx === 'True',
            xmlFileName: jsonData.xml_file_name,
            processId,
        };
        // параметры для запуска других задач
        try {
            if (jsonData.cluster_params) uteParams.cluster_params = ValidationServiceCluster.validate(jsonData.cluster_params);
            if (jsonData.pressure_params) uteParams.pressure_params = ValidationServicePressure.validate(jsonData.pressure_params);
            if (jsonData.ili_insp_params) uteParams.ili_insp_params = ValidationServiceIliInsp.validate(jsonData.ili_insp_params);
            if (jsonData.ehz_insp_params) uteParams.ehz_insp_params = ValidationServiceEhzInsp.validate(jsonData.ehz_insp_params);
        } catch (ex) {
            throw new ErrorHandler(errors.gis_core_2);
        }
        uteParams.data['config.main.PODS_USER'] = config.PODS_USER;
        uteParams.data['config.main.COORD_TOLERANCE'] = config.COORD_TOLERANCE || 1;
        uteParams.data['config.main.LINK_RADIUS'] = config.LINK_RADIUS || 5;
        return uteParams;
    }
}

module.exports = ValidationService;
