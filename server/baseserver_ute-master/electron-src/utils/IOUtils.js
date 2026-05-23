/**
 * Утилиты для работы с файловой системой и XML-запросами.
 * Адаптировано из src/utils/IOUtils.js, переведено на ESM.
 *
 * Изменения:
 *   - убрана зависимость от gis-core/config → используется config/index.js
 *   - убрана зависимость от gis-core/ErrorHandler → локальный errorHandler.js
 */
import fs from 'fs';
import path from 'path';
import { transform } from 'camaro';
import { ErrorHandler } from './errorHandler.js';
import config from '../config/index.js';

export default class IOUtils {
    /**
     * Чтение данных из JSON-файла
     * @param {string} fileName
     * @returns {*}
     */
    static read(fileName) {
        try {
            const data = fs.readFileSync(fileName, 'utf8');
            const obj = JSON.parse(data);
            for (const fskey in obj) {
                return obj[fskey];
            }
        } catch (err) {
            throw new Error(err.message);
        }
    }

    /**
     * Запись данных в JSON-файл
     * @param {*} data
     * @param {string} filePath
     */
    static write(data, filePath) {
        const result = JSON.stringify(data);
        fs.writeFile(filePath, result, err => {
            if (err) throw new Error(err.message);
        });
    }

    /**
     * Чтение файла с SQL-запросами по идентификатору.
     * Формат fileRequest: "FILE_NAME.xml#IDENTIFIER"
     * @param {string} fileRequest
     * @returns {Promise<Object>}
     */
    static async parseXml(fileRequest) {
        if (!fileRequest)
            throw new ErrorHandler('Возникла при чтении файла запроса: descrId = ' + fileRequest);

        const queryReqArray = fileRequest.split('#');
        let xml;
        try {
            xml = fs.readFileSync(path.join(config.QUERY_PATH, queryReqArray[0])).toString();
        } catch (e) {
            throw new ErrorHandler('Ошибка чтения файла запроса', e);
        }

        const textOrDefault = (defaultValue) => `concat(
            @call,
            substring(
                "${defaultValue}",
                1,
                number(not(@call)) * string-length("${defaultValue}")
            )
        )`;

        const recipeTemplate = {
            root: ['/root/data', {
                id: '@id',
                select: {
                    query: 'select/dbQuery/query',
                    vars: ['select/dbQuery/var', {
                        name: '@name',
                        type: '@type',
                        default: '@default',
                        direction: '@direction',
                    }],
                    params: ['select/dbQuery/param', {
                        name: '@name',
                        type: '@type',
                        default: '@default',
                    }],
                    ute_commands: {
                        start: ['select/dbQuery/start_ute_command/ute_command', textOrDefault('false')],
                        end: ['select/dbQuery/end_ute_command/ute_command', textOrDefault('false')],
                    },
                },
                insert: {
                    query: 'insert/dbCommand/query',
                    vars: ['insert/dbCommand/var', {
                        name: '@name',
                        type: '@type',
                        default: '@default',
                        direction: '@direction',
                    }],
                    params: ['insert/dbCommand/param', {
                        name: '@name',
                        type: '@type',
                        default: '@default',
                    }],
                    ute_commands: {
                        start: ['insert/dbCommand/start_ute_command/ute_command', textOrDefault('false')],
                        end: ['insert/dbCommand/end_ute_command/ute_command', textOrDefault('false')],
                    },
                },
                update: {
                    query: 'update/dbCommand/query',
                    vars: ['update/dbCommand/var', {
                        name: '@name',
                        type: '@type',
                        default: '@default',
                        direction: '@direction',
                    }],
                    params: ['update/dbCommand/param', {
                        name: '@name',
                        type: '@type',
                        default: '@default',
                    }],
                    ute_commands: {
                        start: ['update/dbCommand/start_ute_command/ute_command', textOrDefault('false')],
                        end: ['update/dbCommand/end_ute_command/ute_command', textOrDefault('false')],
                    },
                },
                delete: {
                    query: 'delete/dbCommand/query',
                    vars: ['delete/dbCommand/var', {
                        name: '@name',
                        type: '@type',
                        default: '@default',
                        direction: '@direction',
                    }],
                    params: ['delete/dbCommand/param', {
                        name: '@name',
                        type: '@type',
                        default: '@default',
                    }],
                    ute_commands: {
                        start: ['delete/dbCommand/start_ute_command/ute_command', textOrDefault('false')],
                        end: ['delete/dbCommand/end_ute_command/ute_command', textOrDefault('false')],
                    },
                },
            }],
        };

        return await transform(xml, recipeTemplate);
    }

    /**
     * Удаляет файл если он существует
     * @param {string} file
     */
    static unlink(file) {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        } catch (ex) {
            console.error('Возникла ошибка во время удаления файла:', ex.message);
        }
    }
}
