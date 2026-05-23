/**
 * Бизнес-логика обработки данных ВТД.
 * Адаптировано из src/service/ute/ili/ili-import-xml/IliImportXml.js.
 * Переведено на ESM.
 *
 * Изменения:
 *   - DB.createEmptyTable() → createEmptyTable() из tableUtils
 *   - gis-core/logger → console.log
 *   - gis-core/ErrorHandler → локальный errorHandler
 *   - setSrvDistrictId: данные ЛПУ читаются из локальной SQLite
 */
import Decimal from 'decimal.js';
import gdal from 'gdal';
import { createEmptyTable } from '../../utils/tableUtils.js';
import MathUtils from '../../utils/MathUtils.js';
import DB from '../../db/index.js';

export default class IliImportXml {
    /**
     * Простановка идентификаторов ЛПУ для каждого дефекта.
     * Данные ЛПУ загружаются из локальной SQLite (таблица SRV_DISTRICT_G).
     * @param {{ rows: Array }} iliData
     * @param {*} [transaction]
     * @param {*} [connection]
     * @returns {Promise<{ rows: Array }>}
     */
    async setSrvDistrictId(iliData, transaction = null, connection = null) {
        const db = DB.getDb();
        const lpuRows = db.prepare('SELECT GID AS LPU_ID, WKB_GEOMETRY FROM SRV_DISTRICT_G').all();

        for (const iliRow of iliData.rows) {
            let srvDistrictId = '0';
            if (iliRow.X && iliRow.X.length > 0 && iliRow.Y && iliRow.Y.length > 0) {
                const iliPoint = new gdal.Point(parseFloat(iliRow.X), parseFloat(iliRow.Y));
                for (const lpu of lpuRows) {
                    if (!lpu.WKB_GEOMETRY) continue;
                    try {
                        const geo = gdal.Geometry.fromWKB(lpu.WKB_GEOMETRY);
                        if (geo && geo.contains(iliPoint)) {
                            srvDistrictId = String(lpu.LPU_ID);
                            break;
                        }
                    } catch (e) {
                        // Пропускаем некорректные геометрии
                    }
                }
            }
            iliRow.SRV_DISTRICT_GCL = srvDistrictId;
        }
        return iliData;
    }

    /**
     * Проверка типов аномалий по справочнику.
     * @param {{ rows: Array }} iliData
     * @param {{ rows: Array }} types
     * @returns {boolean|string}
     */
    checkTypes(iliData, types) {
        const rgx = /[*.?]|\s+/gi;
        let result = true;
        let defaultAnomalyDescription = 'НЕИЗВЕСТНО,НЕИЗВЕСТНО';

        for (const typeRow of types.rows) {
            const codeDescription = (typeRow.CODE !== undefined) ? typeRow.CODE : '0';
            if (codeDescription == '0') {
                defaultAnomalyDescription = typeRow.EXTENDED_DESCRIPTION;
                break;
            }
        }

        for (const iliRow of iliData.rows) {
            const iliDescription = iliRow.ANOMALY_TYPE_CL.toString().toUpperCase();
            if (iliRow.SOURCE === 'WLD') continue;
            if (iliDescription === '') return false;

            let foundType = false;
            const patternMatch = iliDescription.replace(rgx, '.*');
            for (const typeRow of types.rows) {
                const typeDescription = typeRow.EXTENDED_DESCRIPTION.toUpperCase();
                if (rgx.test(typeDescription, patternMatch)) {
                    foundType = true;
                    break;
                }
            }
            if (!foundType) {
                console.log(`[IliImportXml] Bad data description: [${iliDescription}]`);
                iliRow.ANOMALY_TYPE_CL = defaultAnomalyDescription;
                console.log(`[IliImportXml] Установлено значение по умолчанию [${defaultAnomalyDescription}]`);
            }
        }
        return result;
    }

    /**
     * Расстановка номеров швов на дефектах и особенностях.
     * Чистая JS-логика — без изменений по сравнению с оригиналом.
     * @param {{ rows: Array }} iliData
     * @returns {{ columns: Array, rows: Array }}
     */
    setWeldNums(iliData) {
        const tempIliData = iliData;
        iliData = createEmptyTable();
        iliData.rows = [...tempIliData.rows];

        // Сортировка: по одометру, WLD идут первыми при равном значении
        iliData.rows = iliData.rows.sort((a, b) => {
            if (a.ABSOLUTE_ODOMETER === b.ABSOLUTE_ODOMETER)
                return (a.SOURCE === 'WLD') ? -1 : 1;
            return (a.ABSOLUTE_ODOMETER > b.ABSOLUTE_ODOMETER) ? 1 : -1;
        });

        // Проход 1: WELD_NUMBER и NOMINAL_WALL_THICKNESS
        let prevWeldNum = null;
        let nominalWallThickness = NaN;
        const isFirstWLD = iliData.rows.length > 0 && iliData.rows[0].SOURCE === 'WLD';

        if (!isFirstWLD) {
            for (const row of iliData.rows) {
                if (row.SOURCE === 'WLD') {
                    prevWeldNum = row.WELD_NUMBER;
                    nominalWallThickness = parseFloat(row.NOMINAL_WALL_THICKNESS);
                    break;
                }
            }
        }

        for (const row of iliData.rows) {
            if (row.SOURCE === 'WLD') {
                prevWeldNum = row.WELD_NUMBER;
                nominalWallThickness = parseFloat(row.NOMINAL_WALL_THICKNESS);
                continue;
            }
            row.WELD_NUMBER = prevWeldNum;
            row.NOMINAL_WALL_THICKNESS = MathUtils.toNumber(nominalWallThickness);
        }

        // Проход 2: US_WELD_NUMBER и US_WELD_ODOMETER
        prevWeldNum = null;
        let prevAbsOdometer = null;
        for (const row of iliData.rows) {
            const lc = row.ABSOLUTE_ODOMETER;
            if (row.SOURCE === 'WLD') {
                if (prevWeldNum !== null) row.US_WELD_NUMBER = prevWeldNum;
                row.US_WELD_ODOMETER = prevAbsOdometer !== null ? prevAbsOdometer : null;
                prevWeldNum = row.WELD_NUMBER;
                prevAbsOdometer = MathUtils.toNumber(lc);
                continue;
            }
            row.US_WELD_NUMBER = prevWeldNum;
            row.US_WELD_ODOMETER = prevAbsOdometer;
        }

        // Проход 3: DS_WELD_ODOMETER
        let nextAbsOdometer = null;
        for (let i = 0; i < iliData.rows.length; i++) {
            const row = iliData.rows[i];
            for (let j = i + 1; j < iliData.rows.length; j++) {
                if (iliData.rows[j].SOURCE === 'WLD') {
                    nextAbsOdometer = iliData.rows[j].ABSOLUTE_ODOMETER;
                    break;
                }
            }
            row.DS_WELD_ODOMETER = nextAbsOdometer;
            if (MathUtils.toNumber(nextAbsOdometer) === null) continue;
            if (row.SOURCE === 'WLD') nextAbsOdometer = null;
        }

        return iliData;
    }

    /**
     * Проверка типов аномалий (обёртка над checkTypes).
     * @param {{ rows: Array }} iliData
     * @param {{ rows: Array }} types
     * @returns {boolean|string}
     */
    checkAnomalyTypes(iliData, types) {
        const result = this.checkTypes(iliData, types);
        if (!result) {
            console.log('[IliImportXml] Bad data description: [Empty]');
            return 'Bad data description: [Empty]';
        }
        return result;
    }

    /**
     * Получение номера первого шва (минимальный одометр).
     * @param {{ rows: Array }} data
     * @returns {string|null}
     */
    getFirstWeldNumber(data) {
        let firstRow = null;
        let minLc = Number.MAX_VALUE;
        for (const row of data.rows) {
            const lc = parseFloat(row.ABSOLUTE_ODOMETER);
            const weldNumber = row.WELD_NUMBER ? row.WELD_NUMBER.toString() : '';
            if (lc < minLc && weldNumber) {
                firstRow = row;
                minLc = lc;
            }
        }
        return firstRow === null ? null : firstRow.WELD_NUMBER.toString().replace(/\D/g, '');
    }
}
