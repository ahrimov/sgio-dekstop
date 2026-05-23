/**
 * Утилиты для математических вычислений.
 * Скопировано из src/utils/MathUtils.js, переведено на ESM.
 */
import Decimal from 'decimal.js';

export default class MathUtils {
    /**
     * Функция округления для эмуляции Math.Round у C#.
     * @example Math.Round(12.145,2) = 12.14
     * @param {number} num
     * @param {number} decimalPlaces
     * @returns {number}
     */
    static evenRound(num, decimalPlaces) {
        let d = decimalPlaces || 0;
        let m = 10 ** d;
        let n = +(d ? num * m : num).toFixed(8);
        let i = Math.floor(n);
        let f = n - i;
        let e = 1e-8;
        let r = (f > 0.5 - e && f < 0.5 + e)
            ? ((i % 2 === 0) ? i : i + 1) : Math.round(n);
        return d ? r / m : r;
    }

    /**
     * Функция перевода часовых углов в градусы
     * @param {number} orientationMinHours
     * @returns {string|number}
     */
    static hourToDeg(orientationMinHours) {
        const result = '';
        const deg = orientationMinHours * 30;
        if (!isNaN(deg)) return deg;
        return result;
    }

    static convertToDouble(data) {
        let result = NaN;
        if (data !== null) result = new Decimal(data).toNumber();
        return result;
    }

    static toNumber(value, fractionDigits) {
        if (typeof value !== 'number') {
            value = parseFloat(value);
        }
        if (isNaN(value)) {
            value = null;
        }
        if (!isFinite(value)) {
            value = null;
        }
        if (value !== null) {
            try {
                if (fractionDigits !== undefined) value = value.toFixed(fractionDigits);
            } catch (ex) {}
        }
        return value;
    }

    static toString(value) {
        if (value === undefined || value === null || value === 'NULL' || value === 'null') {
            value = null;
        }
        return value;
    }

    static toDateTime(value) {
        if (value === undefined || value === null || value === 'NULL' || value === 'null') {
            value = null;
        }
        return value;
    }
}
