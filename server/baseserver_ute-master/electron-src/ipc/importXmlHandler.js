/**
 * IPC-обработчик для импорта XML-отчётов ВТД.
 * Заменяет HTTP-контроллер src/controllers/ute.js (метод iliImportXml).
 *
 * Регистрируется в main-процессе Electron:
 *   import { registerImportXmlHandler } from './ipc/importXmlHandler.js';
 *   registerImportXmlHandler();
 *
 * Вызывается из renderer-процесса:
 *   const result = await ipcRenderer.invoke('import-xml', params);
 */
import { ipcMain, dialog } from 'electron';
import DB from '../db/index.js';
import IliImportXmlService from '../services/ili-import-xml/IliImportXmlService.js';
import config from '../config/index.js';

/**
 * Регистрирует IPC-обработчик 'import-xml'.
 * Вызывать один раз при старте приложения после DB.init().
 */
export function registerImportXmlHandler() {
    ipcMain.handle('import-xml', async (event, params) => {
        try {
            validateParams(params);
            const uteParams = buildUteParams(params);
            const result = await IliImportXmlService.call(uteParams);
            return { success: true, ...result };
        } catch (err) {
            console.error('[importXmlHandler] Ошибка:', err.message, err.stack);
            return {
                success: false,
                error: err.message || 'Неизвестная ошибка',
                details: err.details ?? null,
            };
        }
    });

    /**
     * Вспомогательный обработчик: открыть диалог выбора XML-файла.
     * Вызывается из renderer: ipcRenderer.invoke('open-xml-dialog')
     */
    ipcMain.handle('open-xml-dialog', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Выберите XML-файл ВТД',
            filters: [{ name: 'XML файлы', extensions: ['xml'] }],
            properties: ['openFile'],
        });
        if (canceled || filePaths.length === 0) return null;
        return filePaths[0];
    });

    console.log('[importXmlHandler] IPC-обработчики зарегистрированы');
}

/**
 * Валидация входных параметров от renderer.
 * @param {Object} params
 */
function validateParams(params) {
    if (!params) throw new Error('Параметры не переданы');
    if (!params.xmlFileName) throw new Error('Не выбран файл XML (xmlFileName)');
    if (!params.pipe) throw new Error('Не указан ID трубопровода (pipe)');
    if (!params.date) throw new Error('Не указана дата (date)');
}

/**
 * Строит объект uteParams из параметров UI.
 * Аналог ValidationService.validate() из оригинального сервера.
 *
 * @param {Object} params - параметры из renderer:
 *   {
 *     xmlFileName: string,          // абсолютный путь к XML-файлу
 *     pipe: string,                 // ID трубопровода
 *     km_start: string,
 *     km_end: string,
 *     date: string,                 // дата в формате DD.MM.YYYY
 *     company: string,
 *     format: string,               // 'xml'
 *     source_gcl: string,
 *     do_calc_inspection: boolean,
 *     ps_idx: boolean,
 *   }
 * @returns {Object} uteParams
 */
function buildUteParams(params) {
    return {
        xmlFileName: params.xmlFileName,
        processId: params.processId || generateProcessId(),
        do_calc_inspection: params.do_calc_inspection === true || params.do_calc_inspection === 'true',
        ps_idx: params.ps_idx === true || params.ps_idx === 'true',
        data: {
            ROUTE: params.pipe,
            KM_START: params.km_start ?? '',
            KM_END: params.km_end ?? '',
            DATE: params.date,
            COMPANY: params.company ?? 'UNKNOWN',
            FORMAT: params.format ?? 'xml',
            SOURCE_GCL: params.source_gcl ?? 'UNKNOWN',
            // Конфигурационные параметры расчёта (чистые имена для SQLite-биндингов)
            PODS_USER: config.PODS_USER,
            COORD_TOLERANCE: config.COORD_TOLERANCE,
            LINK_RADIUS: config.LINK_RADIUS,
        },
    };
}

/**
 * Генерирует уникальный идентификатор процесса (8 hex-символов).
 * @returns {string}
 */
function generateProcessId() {
    return Math.random().toString(16).slice(2, 10);
}
