/**
 * SQLite-обёртка для Electron-приложения.
 * Заменяет gis-core/Database + src/service/ute/db/index.js.
 * Переведено на ESM.
 *
 * Сохраняет тот же интерфейс (dbReader, dbCommand, dbWriter, dbScalarReader).
 * Использует better-sqlite3 (синхронный API).
 *
 * Установка: npm install better-sqlite3
 * После установки: npx electron-rebuild -f -w better-sqlite3
 */
import BetterSqlite3 from 'better-sqlite3';
import IOUtils from '../utils/IOUtils.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import config from '../config/index.js';
import { runMigrations } from './migrate.js';

class DB {
    static _db = null;

    /**
     * Инициализация подключения к SQLite.
     * Вызывать один раз при старте приложения.
     * @param {string} [dbPath]
     */
    static init(dbPath) {
        const resolvedPath = dbPath || config.DB_PATH;
        this._db = new BetterSqlite3(resolvedPath);
        this._db.pragma('journal_mode = WAL');
        this._db.pragma('foreign_keys = ON');
        console.log(`[DB] SQLite подключена: ${resolvedPath}`);
        // Автоматически применяем миграции при первом запуске
        runMigrations(this._db);
    }

    /**
     * Получить экземпляр БД (с проверкой инициализации)
     * @returns {import('better-sqlite3').Database}
     */
    static getDb() {
        if (!this._db) {
            throw new ErrorHandler('БД не инициализирована. Вызовите DB.init() перед использованием.');
        }
        return this._db;
    }

    /**
     * Собирает объект биндингов из params.data и params.processParameters
     * @param {Object} params
     * @returns {Object}
     */
    static _buildBindings(params) {
        return {
            ...(params && params.data ? params.data : {}),
            ...(params && params.processParameters ? params.processParameters : {}),
        };
    }

    /**
     * Находит нужный блок запроса в распарсенном XML
     * @param {Object} queryXml
     * @param {string} descrId
     * @param {string} descrType
     * @returns {{ query: string, vars: Array }}
     */
    static _extractQuery(queryXml, descrId, descrType) {
        const id = descrId.split('#')[1];
        if (!queryXml || !queryXml.root) {
            throw new ErrorHandler(`Не найден XML-запрос: ${descrId}`);
        }
        const entry = queryXml.root.find(r => r.id === id);
        if (!entry) {
            throw new ErrorHandler(`Не найден идентификатор запроса: ${id} в файле ${descrId}`);
        }
        const queryBlock = entry[descrType];
        if (!queryBlock || !queryBlock.query) {
            throw new ErrorHandler(`Не найден блок [${descrType}] для запроса: ${id}`);
        }
        return queryBlock;
    }

    /**
     * Чтение данных (SELECT).
     * @param {string} descrId
     * @param {string} descrType
     * @param {Object} params
     * @param {*} [transaction]
     * @param {*} [connection]
     * @returns {Promise<{ columns: Array, rows: Array }>}
     */
    static async dbReader(descrId, descrType, params, transaction = null, connection = null) {
        try {
            const queryXml = await IOUtils.parseXml(descrId);
            const queryBlock = this._extractQuery(queryXml, descrId, descrType);
            const bindings = this._buildBindings(params);

            console.log(`[DB] dbReader: ${descrId}`);
            const stmt = this.getDb().prepare(queryBlock.query);
            const rows = stmt.all(bindings);

            return { columns: rows.length > 0 ? Object.keys(rows[0]) : [], rows };
        } catch (ex) {
            console.error(`[DB] dbReader error [${descrId}]:`, ex.message);
            throw new ErrorHandler('Ошибка чтения данных: ' + ex.message, ex);
        }
    }

    /**
     * Чтение скалярного значения (SELECT → одно поле первой строки).
     * @param {string} descrId
     * @param {string} descrType
     * @param {Object} params
     * @param {string} outputParam
     * @param {*} [transaction]
     * @param {*} [connection]
     * @returns {Promise<*>}
     */
    static async dbScalarReader(descrId, descrType, params, outputParam, transaction = null, connection = null) {
        try {
            const queryXml = await IOUtils.parseXml(descrId);
            const queryBlock = this._extractQuery(queryXml, descrId, descrType);
            const bindings = this._buildBindings(params);

            console.log(`[DB] dbScalarReader: ${descrId}, field: ${outputParam}`);
            const stmt = this.getDb().prepare(queryBlock.query);
            const row = stmt.get(bindings);

            if (row && outputParam && row[outputParam] !== undefined) {
                return row[outputParam];
            }
            return undefined;
        } catch (ex) {
            console.error(`[DB] dbScalarReader error [${descrId}]:`, ex.message);
            throw new ErrorHandler('Ошибка чтения скалярного значения: ' + ex.message, ex);
        }
    }

    /**
     * Выполнение команды (INSERT/UPDATE/DELETE) с поддержкой OUTPUT-параметров.
     * @param {string} descrId
     * @param {string} descrType
     * @param {Object} params
     * @param {*} [transaction]
     * @param {*} [connection]
     * @returns {Promise<{ queryData: *, outputParams: Object }>}
     */
    static async dbCommand(descrId, descrType, params, transaction = null, connection = null) {
        try {
            const queryXml = await IOUtils.parseXml(descrId);
            const queryBlock = this._extractQuery(queryXml, descrId, descrType);
            const bindings = this._buildBindings(params);

            console.log(`[DB] dbCommand: ${descrId}`);
            const stmt = this.getDb().prepare(queryBlock.query);
            const queryData = stmt.run(bindings);

            // OUTPUT-параметры: vars с атрибутом default содержат SQL для получения значения
            const outputParams = {};
            if (queryBlock.vars) {
                for (const variable of queryBlock.vars) {
                    if (variable.default) {
                        try {
                            const outRow = this.getDb().prepare(variable.default).get(bindings);
                            if (outRow) outputParams[variable.name] = Object.values(outRow)[0];
                        } catch (outEx) {
                            console.warn(`[DB] Не удалось получить output-параметр [${variable.name}]:`, outEx.message);
                        }
                    }
                }
            }

            return { queryData, outputParams };
        } catch (ex) {
            console.error(`[DB] dbCommand error [${descrId}]:`, ex.message);
            throw new ErrorHandler('Ошибка выполнения команды: ' + ex.message, ex);
        }
    }

    /**
     * Запись таблицы данных построчно (INSERT для каждой строки).
     * @param {string} descrId
     * @param {string} descrType
     * @param {{ rows: Array }} dataTable
     * @param {Object} params
     * @param {*} [transaction]
     * @param {*} [connection]
     * @returns {Promise<{ queryData: *, outputParams: Object }>}
     */
    static async dbWriter(descrId, descrType, dataTable, params, transaction = null, connection = null) {
        try {
            const queryXml = await IOUtils.parseXml(descrId);
            const queryBlock = this._extractQuery(queryXml, descrId, descrType);
            const baseBindings = this._buildBindings(params);

            console.log(`[DB] dbWriter: ${descrId}, rows: ${dataTable?.rows?.length ?? 0}`);

            let queryData = null;
            const outputParams = {};

            if (dataTable?.rows?.length > 0) {
                const stmt = this.getDb().prepare(queryBlock.query);

                // Пакетная вставка в транзакции SQLite для производительности
                const insertMany = this.getDb().transaction((rows) => {
                    let lastResult = null;
                    let prevPcnt = 0;
                    for (let i = 0; i < rows.length; i++) {
                        const rowBindings = { ...baseBindings, ...rows[i] };
                        lastResult = stmt.run(rowBindings);

                        const pcnt = Math.floor((i + 1) * 100 / rows.length);
                        if (pcnt !== prevPcnt && pcnt % 5 === 0) {
                            console.log(`[DB] dbWriter progress: ${pcnt}%`);
                            prevPcnt = pcnt;
                        }
                    }
                    return lastResult;
                });

                queryData = insertMany(dataTable.rows);

                // OUTPUT-параметры
                if (queryBlock.vars) {
                    for (const variable of queryBlock.vars) {
                        if (variable.default) {
                            try {
                                const outRow = this.getDb().prepare(variable.default).get(baseBindings);
                                if (outRow) outputParams[variable.name] = Object.values(outRow)[0];
                            } catch (outEx) {
                                console.warn(`[DB] Не удалось получить output-параметр [${variable.name}]:`, outEx.message);
                            }
                        }
                    }
                }
            }

            return { queryData, outputParams };
        } catch (ex) {
            console.error(`[DB] dbWriter error [${descrId}]:`, ex.message);
            throw new ErrorHandler('Ошибка записи данных: ' + ex.message, ex);
        }
    }

    /**
     * Начало транзакции (маркер для совместимости с сигнатурой сервисов).
     * В better-sqlite3 транзакции управляются через db.transaction(fn).
     * @returns {Promise<Object>}
     */
    static async beginTransaction() {
        console.log('[DB] beginTransaction');
        return { active: true };
    }

    /**
     * Фиксация транзакции (no-op для совместимости).
     * @param {Object} transaction
     */
    static async commitTransaction(transaction) {
        console.log('[DB] commitTransaction');
        if (transaction) transaction.active = false;
    }

    /**
     * Откат транзакции (no-op для совместимости).
     * @param {Object} transaction
     */
    static async rollbackTransaction(transaction) {
        console.log('[DB] rollbackTransaction');
        if (transaction) transaction.active = false;
    }

    /**
     * Создание соединения (no-op для совместимости).
     * @returns {null}
     */
    static createConnection() {
        return null;
    }

    /**
     * Закрытие соединения (no-op для совместимости).
     * @returns {Promise<void>}
     */
    static async closeConnection() {}

    /**
     * Создаёт пустую таблицу { columns: [], rows: [] }
     * @returns {{ columns: Array, rows: Array }}
     */
    static createEmptyTable() {
        return { columns: [], rows: [] };
    }

    /**
     * Закрыть БД (вызывать при завершении приложения)
     */
    static close() {
        if (this._db) {
            this._db.close();
            this._db = null;
            console.log('[DB] SQLite соединение закрыто');
        }
    }
}

export default DB;
