/**
 * Утилита для работы с табличными данными.
 * Заменяет DB.createEmptyTable() из gis-core.
 */

/**
 * Создаёт пустую таблицу в формате { columns: [], rows: [] }
 * @returns {{ columns: Array, rows: Array }}
 */
export function createEmptyTable() {
    return { columns: [], rows: [] };
}
