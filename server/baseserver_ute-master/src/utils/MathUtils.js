const Decimal = require('decimal.js');

/**
 * Класс для выполения математических вычислений
 *
 */
class MathUtils {
	/**
     * Функция округления для эмуляции Math.Round у C#.
     * @example Math.Round(12.145,2) = 12.14
     *
     * @see https://stackoverflow.com/questions/46470724/how-to-apply-c-sharp-equivalent-rounding-method-in-javascript
     * @param num
     * @param decimalPlaces
     * @returns {number|number}
     */
    static evenRound(num, decimalPlaces) {
        let d = decimalPlaces || 0;
        let m = 10**d;
        let n = +(d ? num * m : num).toFixed(8); // Avoid rounding errors
        let i = Math.floor(n); let 
f = n - i;
        let e = 1e-8; // Allow for rounding errors in f
        let r = (f > 0.5 - e && f < 0.5 + e)
			? ((i % 2 === 0) ? i : i + 1) : Math.round(n);
        return d ? r / m : r;
    }

    /**
     * Функция перевода часовых углов в градусы
     * @param orientationMinHours
     * @returns {string|number}
     */
    static hourToDeg(orientationMinHours) {
        const result = '';
        const deg = orientationMinHours * 30; // 12-ч??   1h = 15deg
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
            // covert type to number
            // void 0, null, true, false, 'abc', [], {} => NaN
            // [0] => 0
            value = parseFloat(value);
        }
        if (isNaN(value)) {
            // check NaN
            value = null;
        }
        if (!isFinite(value)) {
            // check Infinity and -Infinity
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
module.exports = MathUtils;
