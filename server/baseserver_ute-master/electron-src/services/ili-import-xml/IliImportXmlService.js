/**
 * Главный сервис импорта XML-отчётов ВТД.
 * Адаптировано из src/service/ute/ili/ili-import-xml/IliImportXmlService.js.
 * Переведено на ESM.
 *
 * Изменения:
 *   - метод call(req) → call(params): убрана зависимость от Express req
 *   - iconv shell-команда → iconv-lite (npm)
 *   - gis-core/logger → console.log
 *   - gis-core/ErrorHandler → локальный errorHandler
 *   - gis-core/config → config/index.js
 *   - DB → SQLite-обёртка
 *   - убрано удаление XML-файла (пользователь управляет файлами сам)
 *   - убраны дочерние расчёты cluster/pressure/sto (можно добавить позже)
 */
import path from 'path';
import fs from 'fs';
import { transform } from 'camaro';
import iconv from 'iconv-lite';
import { ErrorHandler } from '../../utils/errorHandler.js';
import config from '../../config/index.js';
import DB from '../../db/index.js';
import IliImportXml from './IliImportXml.js';
import LinkRepersService from '../ili-insp-link/LinkRepersService.js';
import IliInspCalcService from '../ili-insp-calc/IliInspCalcService.js';

export default class IliImportXmlService {
    /**
     * Основной метод импорта XML-отчёта ВТД.
     *
     * @param {Object} params - параметры запуска:
     *   {
     *     xmlFileName: string,       // путь к XML-файлу ВТД
     *     do_calc_inspection: bool,  // выполнять привязку реперов и расчёт координат
     *     ps_idx: bool,
     *     data: {
     *       ROUTE: string,           // ID трубопровода
     *       KM_START: string,
     *       KM_END: string,
     *       DATE: string,
     *       COMPANY: string,
     *       FORMAT: string,
     *       SOURCE_GCL: string,
     *       'config.main.PODS_USER': string,
     *       'config.main.COORD_TOLERANCE': number,
     *       'config.main.LINK_RADIUS': number,
     *     }
     *   }
     * @returns {Promise<{ status: number, inspectionId: number|null }>}
     */
    static async call(params) {
        console.log('[IliImportXmlService] proc_start : process_data');

        const transaction = await DB.beginTransaction();
        const connection = DB.createConnection();

        const iliImportXml = new IliImportXml();
        const ds = { Tables: {} };

        // --- load_types: загрузка справочника аномалий ---
        console.log('[IliImportXmlService] proc_start : load_types');
        console.log('[IliImportXmlService] status : Загружаю справочник аномалий');
        ds.Tables.ILI_ANOMALY_TYPE_CL = await DB.dbReader(
            'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_9', 'select', params, null, connection
        );
        console.log('[IliImportXmlService] proc_end : load_types');

        ds.Tables.PODS_ILI_DATA = DB.createEmptyTable();

        // --- sub_template: парсинг XML-файла ВТД ---
        console.log('[IliImportXmlService] proc_start : sub_template');
        const iliFileName = path.isAbsolute(params.xmlFileName)
            ? params.xmlFileName
            : path.join(config.ROOT_PATH, params.xmlFileName);

        console.log(`[IliImportXmlService] status : Чтение файла ${iliFileName}`);
        const defects = await this.parseSourceFile(iliFileName);
        if (defects?.root?.length > 0) {
            ds.Tables.PODS_ILI_DATA.rows = defects.root[0].defects;
        }
        console.log('[IliImportXmlService] proc_end : sub_template');

        // --- check_anomaly_types ---
        console.log('[IliImportXmlService] proc_start : check_anomaly_types');
        const checkAnomalyTypes = iliImportXml.checkAnomalyTypes(
            ds.Tables.PODS_ILI_DATA, ds.Tables.ILI_ANOMALY_TYPE_CL
        );
        console.log('[IliImportXmlService] proc_end : check_anomaly_types');

        // --- set_weld_nums ---
        console.log('[IliImportXmlService] proc_start : set_weld_nums');
        ds.Tables.PODS_ILI_DATA = iliImportXml.setWeldNums(ds.Tables.PODS_ILI_DATA);
        console.log('[IliImportXmlService] proc_end : set_weld_nums');

        // --- set_srv_district_id ---
        if (checkAnomalyTypes) {
            console.log('[IliImportXmlService] proc_start : set_srv_district_id');
            await iliImportXml.setSrvDistrictId(ds.Tables.PODS_ILI_DATA, null, connection);
            console.log('[IliImportXmlService] proc_end : set_srv_district_id');
        } else {
            console.log('[IliImportXmlService] status : Пропускается [set_srv_district_id]');
        }

        // --- upload_report ---
        console.log('[IliImportXmlService] proc_start : upload_report');

        if (checkAnomalyTypes) {
            // get_first_weld_number
            console.log('[IliImportXmlService] proc_start : get_first_weld_number');
            const firstWeldNumber = iliImportXml.getFirstWeldNumber(ds.Tables.PODS_ILI_DATA);
            if (params?.data) {
                // Используем чистые имена для SQLite-биндингов (без точек)
                params.data.FIRST_WELD_NUMBER = firstWeldNumber;
            }
            console.log('[IliImportXmlService] proc_end : get_first_weld_number');

            // create_report
            console.log('[IliImportXmlService] proc_start : create_report');
            if (params?.data) {
                params.data.ROUTE_ID = params.data.ROUTE;
                params.data.EVENT_ID = -50;
            }
            const queryData = await DB.dbCommand(
                'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_7', 'update', params, transaction, connection
            );
            if (params?.data) {
                params.data.EVENT_ID = queryData.outputParams.ILI_INSPECTION_ID
                    ? queryData.outputParams.EVENT_ID
                    : params.data.EVENT_ID;
                params.data.ILI_INSPECTION_ID = queryData.outputParams.ILI_INSPECTION_ID;
                // Алиас для совместимости с последующими запросами
                params.data.P_REPORT_ID = queryData.outputParams.ILI_INSPECTION_ID;
                console.log(`[IliImportXmlService] status : ILI_INSPECTION_ID=[${queryData.outputParams.ILI_INSPECTION_ID}]`);
            }
            console.log('[IliImportXmlService] proc_end : create_report');

            // load_ili_data
            console.log('[IliImportXmlService] proc_start : load_ili_data');
            await DB.dbWriter(
                'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_8', 'insert',
                ds.Tables.PODS_ILI_DATA, params, transaction, connection
            );
            console.log('[IliImportXmlService] proc_end : load_ili_data');
        } else {
            console.log('[IliImportXmlService] status : Пропускается [upload_report]');
        }

        console.log('[IliImportXmlService] proc_end : upload_report');

        // --- postprocess_report ---
        console.log('[IliImportXmlService] proc_start : postprocess_report');

        if (checkAnomalyTypes) {
            console.log('[IliImportXmlService] proc_start : prepare_data');
            await DB.dbCommand(
                'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_1', 'update', params, transaction, connection
            );
            console.log('[IliImportXmlService] proc_end : prepare_data');

            console.log('[IliImportXmlService] proc_start : set_weld_nums_old');
            await DB.dbCommand(
                'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_4', 'update', params, transaction, connection
            );
            console.log('[IliImportXmlService] proc_end : set_weld_nums_old');

            console.log('[IliImportXmlService] proc_start : prepare_pipe_len');
            await DB.dbCommand(
                'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_5', 'update', params, transaction, connection
            );
            console.log('[IliImportXmlService] proc_end : prepare_pipe_len');
        } else {
            console.log('[IliImportXmlService] status : Пропускается [postprocess_report]');
        }

        console.log('[IliImportXmlService] proc_end : postprocess_report');

        // --- calc_report (do_calc_inspection) ---
        if (params.do_calc_inspection) {
            const routeId = await DB.dbScalarReader(
                'UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_0', 'select', params, 'ROUTE_ID', transaction, connection
            );
            if (routeId === undefined) {
                throw new ErrorHandler('Не хватает данных для расчета: ROUTE_ID');
            }
            params.data.ROUTE_ID_NEW = routeId;

            console.log('[IliImportXmlService] proc_start : calc_report');

            // set_params: нормализуем ключи для SQLite-биндингов
            if (params?.data) {
                if (params.data.ROUTE_ID_NEW) {
                    params.data.P_ROUTE_ID = params.data.ROUTE_ID_NEW;
                    console.log(`[IliImportXmlService] status : P_ROUTE_ID=${params.data.P_ROUTE_ID}`);
                }
                // P_REPORT_ID уже установлен в create_report через queryData.outputParams.ILI_INSPECTION_ID
                if (params.data.ILI_INSPECTION_ID && !params.data.P_REPORT_ID) {
                    params.data.P_REPORT_ID = params.data.ILI_INSPECTION_ID;
                }
                console.log(`[IliImportXmlService] status : P_REPORT_ID=${params.data.P_REPORT_ID}`);
                params.data.P_PS_IDX = params.ps_idx ? 1 : 0;
            }

            // ili-insp-link: привязка реперов
            console.log('[IliImportXmlService] proc_start : ili-insp-link');
            await LinkRepersService.process(params, transaction, connection);
            console.log('[IliImportXmlService] proc_end : ili-insp-link');

            // ili-insp-calc: расчёт координат
            console.log('[IliImportXmlService] proc_start : ili-insp-calc');
            await IliInspCalcService.process(params, transaction, connection);
            console.log('[IliImportXmlService] proc_end : ili-insp-calc');

            console.log('[IliImportXmlService] proc_end : calc_report');
        } else {
            console.log('[IliImportXmlService] status : Пропускается [do_calc_inspection]');
        }

        await DB.commitTransaction(transaction);
        await DB.closeConnection(connection);

        console.log('[IliImportXmlService] proc_end : process_data');

        return {
            status: 200,
            inspectionId: params.data?.ILI_INSPECTION_ID ?? null,
        };
    }

    /**
     * Парсинг XML-файла ВТД.
     * Конвертирует кодировку cp1251→utf8 через iconv-lite (без shell).
     * Извлекает DEF (дефекты), PLOBJ (линейные объекты), WLD (швы).
     *
     * @param {string} filePath - абсолютный путь к XML-файлу
     * @returns {Promise<Object>} - распарсенные данные
     */
    static async parseSourceFile(filePath) {
        let xml;
        try {
            // Конвертация cp1251 → utf8 через iconv-lite (без shell-команды iconv)
            const buf = fs.readFileSync(filePath);
            xml = iconv.decode(buf, 'cp1251');
        } catch (e) {
            throw new ErrorHandler('Ошибка чтения XML-файла ВТД', e);
        }

        const convertArrayToObject = (array, key, value) =>
            array.reduce((obj, item) => ({ ...obj, [item[key]]: item[value] }), {});

        const hourToDeg = (orientationMinHours) => {
            const deg = orientationMinHours * 30;
            return !isNaN(deg) ? String(deg) : '';
        };

        const convertNaNToNull = (value) => (isNaN(value) ? null : value);

        // XPath-шаблон — без изменений по сравнению с оригиналом
        const recipeTemplate = {
            root: ['/IPL_INSPECT', {
                defects: ['DEFECTS/DEF | LINEOBJS/PLOBJ | WELDS/WLD', {
                    WELD_NUMBER: '@NUM_TUBE',
                    ABSOLUTE_ODOMETER: 'number(@ODOMETER) div 100',
                    AVERAGE_DEPTH: '@V_MAX_OTCH',
                    LENGTH: '@L_OTCH',
                    WIDTH: '@W_OTCH',
                    ORIENTATION_DEG: 'number(@ORIENT1)',
                    BPR_PIG: '@KBD',
                    MILEPOST: '@L_LCH',
                    NOMINAL_WALL_THICKNESS: '@THICK',
                    X: '@B',
                    Y: '@L',
                    Z: '@H',
                    SOURCE: 'name()',
                    US_WELD_ODOMETER: 'NULL',
                    DS_WELD_ODOMETER: 'NULL',
                    US_WELD_NUMBER: 'NULL',
                    ANOMALY_TYPE_CL: '@IDTYPEOBJ',
                    FEATURE_DESCRIPTION: '@IDTYPEOBJ',
                    DL_TUBE: 'number(@DL_TUBE) div 100',
                    REM: '@REM',
                    NAME_MARKER: '@NAME_MARKER',
                }],
                types: ['TYPEOBJS/TYPEOBJ', {
                    TITLE: 'TITLE',
                    IDTYPEOBJ: '@IDTYPEOBJ',
                }],
            }],
        };

        const jsonData = await transform(xml, recipeTemplate);

        let jsonDataTypeArr = [];
        if (jsonData?.root?.length > 0) {
            jsonDataTypeArr = jsonData.root[0].types;
        }

        const jsonDataTypeObjs = convertArrayToObject(jsonDataTypeArr, 'IDTYPEOBJ', 'TITLE');

        if (jsonData?.root?.length > 0) {
            jsonData.root[0].defects.forEach(item => {
                if (item.ANOMALY_TYPE_CL) {
                    if (jsonDataTypeObjs[item.ANOMALY_TYPE_CL])
                        item.ANOMALY_TYPE_CL = jsonDataTypeObjs[item.ANOMALY_TYPE_CL];
                    if (jsonDataTypeObjs[item.FEATURE_DESCRIPTION])
                        item.FEATURE_DESCRIPTION = jsonDataTypeObjs[item.FEATURE_DESCRIPTION];
                }
                if (item.SOURCE === 'PLOBJ') {
                    item.DESCRIPTION = item.NAME_MARKER;
                    item.COMMENTS = item.REM;
                }
                if (item.SOURCE === 'DEF' || item.SOURCE === 'WLD') {
                    item.DESCRIPTION = item.REM;
                }
                item.ORIENTATION_DEG = hourToDeg(item.ORIENTATION_DEG);
                item.DL_TUBE = convertNaNToNull(item.DL_TUBE);
            });
        }

        return jsonData;
    }
}
