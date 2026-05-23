/**
 * Конфигурация Electron-приложения.
 * Заменяет gis-core/config.
 *
 * TODO: при интеграции в Electron заменить пути на:
 *   import { app } from 'electron';
 *   const USER_DATA = app.getPath('userData');
 */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = {
    /**
     * Путь к папке с XML-файлами SQL-запросов (UTE_SEM.xml и др.)
     * По умолчанию: electron-src/config/ (рядом с этим файлом)
     * В Electron: можно переопределить через process.env.QUERY_PATH
     *   или скопировать UTE_SEM.xml в app.getPath('userData')
     */
    QUERY_PATH: process.env.QUERY_PATH || __dirname,

    /**
     * Путь к корневой папке приложения (для временных файлов, загрузок)
     */
    ROOT_PATH: process.env.ROOT_PATH || join(__dirname, '../../data'),

    /**
     * Путь к файлу SQLite базы данных
     * В Electron: заменить на join(app.getPath('userData'), 'ute.sqlite')
     */
    DB_PATH: process.env.DB_PATH || join(__dirname, '../../data/ute.sqlite'),

    /**
     * Параметры расчёта (ранее приходили из Oracle-конфига)
     */
    PODS_USER: process.env.PODS_USER || 'PODS',
    COORD_TOLERANCE: parseFloat(process.env.COORD_TOLERANCE) || 1,
    LINK_RADIUS: parseFloat(process.env.LINK_RADIUS) || 5,
};

export default config;
