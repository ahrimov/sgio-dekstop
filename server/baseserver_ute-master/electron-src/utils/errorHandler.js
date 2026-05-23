/**
 * Простой ErrorHandler для Electron-приложения.
 * Заменяет gis-core/ErrorHandler.
 */
export class ErrorHandler extends Error {
    /**
     * @param {string} message - Сообщение об ошибке
     * @param {*} [details] - Дополнительные детали (оригинальная ошибка, данные)
     */
    constructor(message, details) {
        super(typeof message === 'string' ? message : (message && message.message) || 'Unknown error');
        this.name = 'ErrorHandler';
        this.details = details;
        if (details && details.stack) {
            this.originalStack = details.stack;
        }
    }
}
