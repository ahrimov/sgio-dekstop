/**
 * Сервис расчёта координат дефектов.
 * Адаптировано из src/service/ute/ili/ili-insp-calc/IliInspCalcService.js.
 * Переведено на ESM.
 *
 * Изменения:
 *   - убран метод call(req) — HTTP-вариант не нужен в Electron
 *   - gis-core/logger → console.log
 *   - gis-core/ErrorHandler → локальный errorHandler
 *   - DB → SQLite-обёртка
 */
import { ErrorHandler } from '../../utils/errorHandler.js';
import DB from '../../db/index.js';
import IliInspCalc from './IliInspCalc.js';

export default class IliInspCalcService {
    /**
     * Расчёт координат дефектов.
     * Вызывается из IliImportXmlService внутри транзакции.
     *
     * @param {Object} params - uteParams
     * @param {Object} transaction - маркер транзакции (совместимость)
     * @param {*} connection - не используется в SQLite
     * @returns {Promise<void>}
     */
    static async process(params, transaction, connection) {
        if (!transaction) throw new ErrorHandler('Отсутствует транзакция.');

        console.log('[IliInspCalcService] proc_start : process_data');
        const ds = { Tables: {} };

        // Загрузка дефектов с реперами и пикетов
        console.log('[IliInspCalcService] proc_start : load_def');
        ds.Tables.DATA = await DB.dbReader(
            'UTE_SEM.xml#CALC_CALC_DEF_1', 'select', params, transaction, connection
        );
        ds.Tables.PIKET = await DB.dbReader(
            'UTE_SEM.xml#CALC_CALC_DEF_2', 'select', params, transaction, connection
        );
        console.log('[IliInspCalcService] proc_end : load_def');

        // Расчёт координат (чистая математика)
        console.log('[IliInspCalcService] proc_start : calc_def');
        ds.Tables.RES = IliInspCalc.process(ds);

        // Перевод старых EVENT_RANGE в неактуальное состояние
        console.log('[IliInspCalcService] proc_start : update_prev_event');
        await DB.dbCommand(
            'UTE_SEM.xml#CALC_CALC_DEF_8', 'update', params, transaction, connection
        );
        console.log('[IliInspCalcService] proc_end : update_prev_event');

        // Запись дефектов с координатами
        console.log('[IliInspCalcService] proc_start : write_def');
        await DB.dbWriter(
            'UTE_SEM.xml#CALC_CALC_DEF_3', 'insert', ds.Tables.RES, params, transaction, connection
        );
        console.log('[IliInspCalcService] proc_end : write_def');

        // Загрузка и запись длин труб
        console.log('[IliInspCalcService] proc_start : update_prev_len_event');
        ds.Tables.PIPE_LEN = await DB.dbReader(
            'UTE_SEM.xml#CALC_CALC_DEF_5', 'select', params, transaction, connection
        );
        console.log('[IliInspCalcService] proc_end : update_prev_len_event');

        console.log('[IliInspCalcService] proc_start : write_len_event');
        const queryData = await DB.dbWriter(
            'UTE_SEM.xml#CALC_CALC_DEF_6', 'insert', ds.Tables.PIPE_LEN, params, transaction, connection
        );
        if (params?.data && queryData.outputParams) {
            params.data['EVENT_ID'] = queryData.outputParams.EVENT_ID;
        }
        console.log('[IliInspCalcService] proc_end : write_len_event');

        console.log('[IliInspCalcService] proc_start : update_pipe_len');
        await DB.dbWriter(
            'UTE_SEM.xml#CALC_CALC_DEF_7', 'insert', ds.Tables.PIPE_LEN, params, transaction, connection
        );
        console.log('[IliInspCalcService] proc_end : update_pipe_len');

        // Обнуление ссылок на старые записи
        console.log('[IliInspCalcService] proc_start : unlink_prev_event');
        await DB.dbCommand(
            'UTE_SEM.xml#CALC_CALC_DEF_10', 'update', params, transaction, connection
        );
        console.log('[IliInspCalcService] proc_end : unlink_prev_event');

        console.log('[IliInspCalcService] proc_start : unlink_prev_len_event');
        await DB.dbCommand(
            'UTE_SEM.xml#CALC_CALC_DEF_11', 'update', params, transaction, connection
        );
        console.log('[IliInspCalcService] proc_end : unlink_prev_len_event');

        // Диапазон станций и обновление отчёта
        console.log('[IliInspCalcService] proc_start : get_station_range');
        const stationRange = IliInspCalc.getStationRange(ds.Tables.RES);
        if (params?.data) {
            // Сохраняем под оригинальным ключом для совместимости
            params.data['call_complex_method.STATION_RANGE'] = stationRange;
            // Также под нормализованным ключом для SQLite-биндинга в CALC_CALC_DEF_12
            params.data['station_range'] = stationRange;
        }
        console.log('[IliInspCalcService] proc_end : get_station_range');

        console.log('[IliInspCalcService] proc_start : update_report');
        await DB.dbCommand(
            'UTE_SEM.xml#CALC_CALC_DEF_12', 'update', params, transaction, connection
        );
        console.log('[IliInspCalcService] proc_end : update_report');

        console.log('[IliInspCalcService] proc_start : reset_is_dirty');
        await DB.dbCommand(
            'UTE_SEM.xml#CALC_CALC_DEF_13', 'update', params, transaction, connection
        );
        console.log('[IliInspCalcService] proc_end : reset_is_dirty');

        console.log('[IliInspCalcService] proc_end : calc_def');
        console.log('[IliInspCalcService] proc_end : process_data');
    }
}
