/**
 * Сервис привязки реперов к пикетам.
 * Адаптировано из src/service/ute/ili/ili-insp-link/LinkRepersService.js.
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
import LinkRepers from './LinkRepers.js';
import IliInspCalcService from '../ili-insp-calc/IliInspCalcService.js';

export default class LinkRepersService {
    /**
     * Привязка реперов и расчёт координат дефектов.
     * Вызывается из IliImportXmlService внутри транзакции.
     *
     * @param {Object} params - uteParams
     * @param {Object} transaction - маркер транзакции (совместимость)
     * @param {*} connection - не используется в SQLite
     * @returns {Promise<void>}
     */
    static async process(params, transaction, connection) {
        if (!transaction) throw new ErrorHandler('Отсутствует транзакция.');

        console.log('[LinkRepersService] proc_start : process_data');
        const ds = { Tables: {} };

        // Загрузка реперов
        console.log('[LinkRepersService] proc_start : load_repers');
        ds.Tables.REP = await DB.dbReader(
            'UTE_SEM.xml#CALC_LINK_REPERS_1', 'select', params, transaction, connection
        );
        ds.Tables.GP = await DB.dbReader(
            'UTE_SEM.xml#CALC_LINK_REPERS_2', 'select', params, transaction, connection
        );
        console.log('[LinkRepersService] proc_end : load_repers');

        // Привязка реперов (чистая математика)
        console.log('[LinkRepersService] proc_start : link_repers');
        ds.Tables.RES_REP = LinkRepers.process(ds);

        // Запись контрольных точек
        console.log('[LinkRepersService] proc_start : update_control_points');
        if (ds.Tables.RES_REP && ds.Tables.RES_REP.rows.length > 0) {
            await DB.dbWriter(
                'UTE_SEM.xml#CALC_LINK_REPERS_3', 'insert',
                ds.Tables.RES_REP, params, transaction, connection
            );
        }
        console.log('[LinkRepersService] proc_end : update_control_points');
        console.log('[LinkRepersService] proc_end : link_repers');
        console.log('[LinkRepersService] proc_end : process_data');
    }
}
