const Decimal = require('decimal.js');
const MathUtils = require('../../../../utils/MathUtils');
const DB = require('../../db');

class WorstCorrosion {
    constructor({
        defectId = 0, corrosionDepthMM = 0, corrosionLengthMM = 0, corrosionWidthMM = 0,
        corrosionSpeed = 0, depthTimeFunction = null, depthTimeFunctionPercent = [],
        lengthTimeFunction = [], widthTimeFunction = [], forecastCutSquareTimeFunction = [],
    }) {
        this.defectId = defectId;
        this.corrosionDepthMM = corrosionDepthMM;
        this.corrosionLengthMM = corrosionLengthMM;
        this.corrosionWidthMM = corrosionWidthMM;
        this.corrosionSpeed = corrosionSpeed;
        this.depthTimeFunction = depthTimeFunction;
        this.depthTimeFunctionPercent = depthTimeFunctionPercent;
        this.lengthTimeFunction = lengthTimeFunction;
        this.widthTimeFunction = widthTimeFunction;
        this.forecastCutSquareTimeFunction = forecastCutSquareTimeFunction;
    }
}

class StoEnzInsp {
    constructor(processParameters) {
        this.weldQuantity = 0;
        this.sectorLength = 0;
        this.defectsQuantity = 0;
        this.clusterQuantity = 0;
        this.singleDefectsQuantity = 0;
        this.status = true;
        try {
            this.installDate = new Date(processParameters.INSTALL_DATE); // Дата укладки газопровода
        } catch (ex) {
            this.status = false;
        }
        this.criticalDepthPercent = 15;
        this.crossingBufferDistance = 100;
        this.representativeDepthPercent = 5;
        this.worstCorrosion = new WorstCorrosion({});
    }

    calc_sto_xxx(ds) {
        if (!this.status) {
            console.error('Дату передали в не известном формате, ожидается dd.mm.yyyy [06.11.2002]');
            return ds;
        }
        // Данные для расчета
        const inspTab = ds.Tables.INSPECTION;
        const iliTab = ds.Tables.ILI;
        const crossingTab = ds.Tables.CROSSING;
        const weldsTab = ds.Tables.WELDS;

        // Проход по участкам разбитого обследования для оценки
        for (const inspRow of inspTab.rows) {
            // Входные данные
            const measureBegin = MathUtils.convertToDouble(inspRow.MEASURE_BEGIN); // Начало участка в метрах (линейная дистанция)
            const measureEnd = MathUtils.convertToDouble(inspRow.MEASURE_END); // Конец участка в метрах (линейная дистанция)
            const reportDate = new Date(inspRow.BEGIN_DATE); // Дата отчета
            this.setSectorInfo_(measureBegin, measureEnd, iliTab, weldsTab, inspRow);

            let years = MathUtils.evenRound((reportDate - this.installDate) / 31536000000, 1);// 31536000000= 1000*60*60*24*365 (из миллесекунд в год)
            if (inspRow.INSTALL_DATE !== null && inspRow.INSTALL_DATE !== undefined) years = MathUtils.evenRound((reportDate - Date.parse(inspRow.INSTALL_DATE)) / 31536000000, 1);
            years = Math.abs(years);
            const segmentLength = this.sectorLength * 1000;
            let dangerDegree = this.getDangerDegreePhaseOne_(iliTab, measureBegin, measureEnd);
            let dangerDegreeSegmentType = '';
            if (dangerDegree) // Если результат есть по глубине дефектов, то выставляю значение поля
            { dangerDegreeSegmentType = 'Подтвержден данными ВТД'; }
            const corrAverageDepth = this.getCorrAverageDepth_(iliTab, measureBegin, measureEnd); // Пункт 8.4.2
            let corrAverageSpeed = NaN;

            if (years !== 0) corrAverageSpeed = corrAverageDepth / years; // Пункт 8.4.3
            if (corrAverageSpeed < 0.1 && dangerDegree !== 'ПКО' && dangerDegree !== 'ВКО') dangerDegree = 'УКО';

            if (corrAverageSpeed >= 0.1 && corrAverageSpeed <= 0.3 && dangerDegree !== 'ПКО' && dangerDegree !== 'ВКО') dangerDegree = 'ПКО';

            if (corrAverageSpeed >= 0.3 && dangerDegree !== 'ВКО') dangerDegree = 'ВКО';

            if (this.checkIsCrossingNear_(crossingTab, measureBegin, measureEnd) && dangerDegree !== 'ПКО' && dangerDegree !== 'ВКО') {
                dangerDegree = 'ПКО';
                dangerDegreeSegmentType = 'Потенциально опасен';
            }

            const corrCriticalDepth = this.getMinWallThickness_(iliTab, measureBegin, measureEnd) * 0.65; // Пункт 8.4.4
            let timeToCriticalCorrDepth = NaN;
            if (corrAverageSpeed !== 0) timeToCriticalCorrDepth = (corrCriticalDepth - corrAverageDepth) / corrAverageSpeed; // Пункт 8.4.5

            let segmentIntensiveDegreeRate = NaN;
            if (segmentLength !== 0) segmentIntensiveDegreeRate = this.defectsQuantity / segmentLength; // Пункт 8.3.1

            const defectQuantityPer100m = segmentIntensiveDegreeRate / (segmentLength / 100); // Пункт 8.3.4
            let segmentIntensive = '';
            if (defectQuantityPer100m > 10) segmentIntensive = 'Большая';
            if (defectQuantityPer100m >= 3 && defectQuantityPer100m <= 10) segmentIntensive = 'Средняя';
            if (defectQuantityPer100m < 3) segmentIntensive = 'Небольшая';

            const {
                timeToDanger, depthAtDanger, lengthAtDanger, widthAtDanger, squareAtDanger,
            } = this.getTimeToDanger_(iliTab, measureBegin, measureEnd, years);

            if (!dangerDegree) dangerDegree = 'УКО'; // Бочков в письме указал делать так
            let segmentCategory = ''; // 8.3.5
            if (dangerDegree === 'ВКО' && segmentIntensive === 'Большая') segmentCategory = 'Первая категория'; // 8.3.6
            if ((dangerDegree === 'ВКО' && segmentIntensive === 'Средняя')
				|| (dangerDegree === 'ПКО' && segmentIntensive === 'Большая')) segmentCategory = 'Вторая категория'; // 8.3.7
            if ((dangerDegree === 'ВКО' && segmentIntensive === 'Небольшая')
				|| (dangerDegree === 'ПКО' && segmentIntensive === 'Средняя')) segmentCategory = 'Третья категория'; // 8.3.7

            // Помещаю результат в таблицу
            if (dangerDegree) //   Степень коррозионной опастности
            { inspRow.DANGER_DEG = dangerDegree; }
            if (dangerDegreeSegmentType) // Тип выявленной коррозионной опасности участка
            { inspRow.DANGER_DEG_SEGMENT_TYPE = dangerDegreeSegmentType; }
            if (segmentCategory) // Степень коррозионной опастности
            { inspRow.SEGMENT_CATEGORY = segmentCategory; } // Категория коррозионной опасности
            if (!isNaN(corrAverageDepth)) {
                inspRow.CORR_AVER_DEPTH = MathUtils.evenRound(corrAverageDepth, 2);
            }// В C# и в JS функции Math.round() отличимы по результату, поэтому используеться нестандартная функция.
            if (!isNaN(corrAverageSpeed)) {
                inspRow.CORR_AVER_SPEED = MathUtils.evenRound(corrAverageSpeed, 2);
            }
            if (!isNaN(corrCriticalDepth)) {
                inspRow.CORR_CRITICAL_DEPTH = MathUtils.evenRound(corrCriticalDepth, 2);
            }
            if (!isNaN(timeToCriticalCorrDepth)) {
                inspRow.CORR_TIME_TO_CRITICAL_DEPTH = MathUtils.evenRound(timeToCriticalCorrDepth, 1);
            }
            if (!isNaN(segmentIntensiveDegreeRate)) {
                inspRow.SEGMENT_INTENSIVE_DEG_RATE = MathUtils.evenRound(segmentIntensiveDegreeRate, 2);
            }
            if (segmentIntensive) inspRow.SEGMENT_INTENSIVITY = segmentIntensive;
            if (!isNaN(timeToDanger)) {
                inspRow.TIME_TO_DANGER = MathUtils.evenRound(timeToDanger, 2);
            }
            if (!isNaN(depthAtDanger)) {
                inspRow.DEPTH_TO_DANGER = MathUtils.evenRound(depthAtDanger, 2);
            }
            if (!isNaN(lengthAtDanger)) {
                inspRow.LENGTH_TO_DANGER = MathUtils.evenRound(lengthAtDanger, 2);
            }
            if (!isNaN(widthAtDanger)) {
                inspRow.WIDTH_TO_DANGER = MathUtils.evenRound(widthAtDanger, 2);
            }
            if (!isNaN(squareAtDanger)) {
                inspRow.SQUARE_TO_DANGER = MathUtils.evenRound(squareAtDanger, 2);
            }
        }

        return ds;
    }

    setSectorInfo_(beginMeasure, endMeasure, dataTab, weldTab, inspRow) {
        this.sectorLength = MathUtils.convertToDouble(inspRow.SECTOR_LENGTH) / 1000;
        this.weldQuantity = 0;
        this.defectsQuantity = 0;
        this.clusterQuantity = 0;
        this.singleDefectsQuantity = 0;
        for (const row of dataTab.rows) {
            const measure = MathUtils.convertToDouble(row.MEASURE);//  линейная дистанция
            // Проверяю, что дефект/кластер внутри обрабатываемого участка
            if (measure >= beginMeasure && measure <= endMeasure) this.defectsQuantity++;
        }
        this.defectsQuantity = this.singleDefectsQuantity + this.clusterQuantity;
        for (const row of weldTab.rows) {
            const measure = MathUtils.convertToDouble(row.MEASURE); // линейная дистанция
            // Проверяю, что шов внутри обрабатываемого участка
            if (measure >= beginMeasure && measure <= endMeasure) this.weldQuantity++;
        }
    }

    getMinWallThickness_(iliTab, beginMeasure, endMeasure) {
        let minWallThickness = 1e9;
        // Проход по дефектам определяю минимальную толщину стенки на участке в миллиметрах
        for (const iliRow of iliTab.rows) {
            const measure = MathUtils.convertToDouble(iliRow.MEASURE); // линейная дистанция
            // Проверяю, что дефект внутри обрабатываемого участка
            if (measure >= beginMeasure && measure <= endMeasure) {
                if (iliRow.NOMINAL_WALL_THICKNESS !== null && iliRow.NOMINAL_WALL_THICKNESS !== undefined) {
                    const nominalWallThickness = MathUtils.convertToDouble(iliRow.NOMINAL_WALL_THICKNESS);// Номинальная толщина стенки в мм
                    if (nominalWallThickness < minWallThickness) minWallThickness = nominalWallThickness;
                }
            }
        }
        if (minWallThickness === 1e9) minWallThickness = NaN;
        return minWallThickness;
    }

    pushDownWorstCorrosion_(worstCorrosions, fromPosition) {
        let swapCorrosion;
        let pushingCorrosion = worstCorrosions[fromPosition];
        for (let k = fromPosition + 1; k < worstCorrosions.length; k++) {
            if (isNaN(worstCorrosions[k].corrosionDepthMM)) {
                // Массив еще пустой, просто заполняем эту ячейку и выходим
                worstCorrosions[k] = pushingCorrosion;
                break;
            }
            // Есть значимое значение, необходимо сверить и сдвигать
            if (worstCorrosions[k].corrosionDepthMM >= pushingCorrosion.corrosionDepthMM) {
                [pushingCorrosion, worstCorrosions[k]] = [worstCorrosions[k], pushingCorrosion];
                /* swapCorrosion = worstCorrosions[k];
				worstCorrosions[k] = pushingCorrosion;
				pushingCorrosion = swapCorrosion; */
            }
        }
    }

    getTimeToDanger_(iliTab, beginMeasure, endMeasure, years) {
        // инициализирую массив
        const worstCorrosions = [];
        for (let i = 0; i < 10; i++) {
            const corrosionSpeed = NaN; const corrosionDepthMM = NaN; const defectId = NaN; const corrosionLengthMM = NaN; const
                corrosionWidthMM = NaN;
            worstCorrosions.push(new WorstCorrosion({
                corrosionSpeed, corrosionDepthMM, corrosionLengthMM, corrosionWidthMM,
            }));
        }
        // Проход по дефектам определяю 10 наихудших.
        for (const iliRow of iliTab.rows) {
            const measure = MathUtils.convertToDouble(iliRow.MEASURE); // линейная дистанция
            // Проверяю, что дефект внутри обрабатываемого участка
            if (measure >= beginMeasure && measure <= endMeasure) {
                const depthPercents = MathUtils.convertToDouble(iliRow.AVERAGE_DEPTH); // Глубина дефекта в процентах
                const wallThickness = MathUtils.convertToDouble(iliRow.NOMINAL_WALL_THICKNESS); // Толщина стенки трубопровода
                const depthMM = depthPercents / 100 * wallThickness; // Глубина дефекта в мм
                for (let i = 0; i < worstCorrosions.length; i++) {
                    const worstCorrosion = worstCorrosions[i];
                    if (isNaN(worstCorrosion.corrosionDepthMM) || worstCorrosion.corrosionDepthMM < depthMM) {
                        if (!isNaN(worstCorrosion.corrosionDepthMM)) // тут уже было что-то заполненное, нужно переметить конкретную коррозию в списке худших
                        { this.pushDownWorstCorrosion_(worstCorrosions, i); }
                        worstCorrosion.corrosionDepthMM = depthMM;
                        worstCorrosion.corrosionLengthMM = MathUtils.convertToDouble(iliRow.LENGTH); // Длина в мм
                        worstCorrosion.corrosionWidthMM = MathUtils.convertToDouble(iliRow.WIDTH); // Ширина в мм
                        worstCorrosion.defectId = MathUtils.convertToDouble(iliRow.ID); // Идентификатор дефекта
                        worstCorrosion.corrosionSpeed = worstCorrosion.corrosionDepthMM / years; // Формула (40)
                        worstCorrosion.depthTimeFunction = new Array(40).fill(0);
                        worstCorrosion.lengthTimeFunction = new Array(40).fill(0);
                        worstCorrosion.widthTimeFunction = new Array(40).fill(0);
                        worstCorrosion.forecastCutSquareTimeFunction = new Array(40).fill(0);
                        worstCorrosion.depthTimeFunctionPercent = new Array(40).fill(0);
                        for (let j = 0; j < 40; j++) {
                            const year = j + 1;
                            worstCorrosion.depthTimeFunction[j] = worstCorrosion.corrosionDepthMM + worstCorrosion.corrosionSpeed * year;// Формула (41)
                            worstCorrosion.depthTimeFunctionPercent[j] = worstCorrosion.depthTimeFunction[j] / wallThickness * 100; // Сохраню в процентах
                            worstCorrosion.lengthTimeFunction[j] = worstCorrosion.corrosionLengthMM * worstCorrosion.depthTimeFunction[j] / worstCorrosion.corrosionDepthMM; // Формула (42)
                            worstCorrosion.widthTimeFunction[j] = worstCorrosion.corrosionWidthMM * worstCorrosion.depthTimeFunction[j] / worstCorrosion.corrosionDepthMM;
                            worstCorrosion.forecastCutSquareTimeFunction[j] = worstCorrosion.corrosionDepthMM * worstCorrosion.corrosionLengthMM * worstCorrosion.lengthTimeFunction[j] * worstCorrosion.depthTimeFunction[j] / (worstCorrosion.corrosionLengthMM * worstCorrosion.corrosionDepthMM);
                        }
                        break;
                    }
                }
            }
        }
        // Get results
        let timeToDanger = NaN;
        let depthAtDanger = NaN;
        let lengthAtDanger = NaN;
        let widthAtDanger = NaN;
        let squareAtDanger = NaN;
        for (let i = 0; i < worstCorrosions.length; i++) {
            for (let j = 0; j < 40; j++) {
                // Если массив предсказаний пустой, то перехожу к следующему худшему дефекту
                if (worstCorrosions[i].depthTimeFunction === null) break;
                if (!isNaN(worstCorrosions[i].depthTimeFunction[j])// Кандидат вообще есть
                    && worstCorrosions[i].depthTimeFunctionPercent[j] > this.criticalDepthPercent // и кандидат хуже критической глубины
                    && (!isNaN(worstCorrosions[i].depthTimeFunction[j]) // Результат пока не заполнен
                        && isNaN(depthAtDanger))
                    || (!isNaN(depthAtDanger) // Или результат заполнен чем-то
                        && worstCorrosions[i].depthTimeFunction[i] < depthAtDanger // и кандидат хуже результата
                        && ((j + 1) < timeToDanger || isNaN(timeToDanger)))) { // и прогнозируется более ранний срок достижения критической глубины поражения
                    timeToDanger = j + 1;
                    depthAtDanger = worstCorrosions[i].depthTimeFunction[j];
                    lengthAtDanger = worstCorrosions[i].lengthTimeFunction[j];
                    widthAtDanger = worstCorrosions[i].widthTimeFunction[j];
                    squareAtDanger = worstCorrosions[i].forecastCutSquareTimeFunction[j];
                }
            }
        }
        return {
            timeToDanger, depthAtDanger, lengthAtDanger, widthAtDanger, squareAtDanger,
        };
    }

    getCorrAverageDepth_(iliTab, beginMeasure, endMeasure) {
        let sumDepthMm = 0;
        let countDefects = 0;
        let result = NaN;
        // Проход по дефектам определяю среднюю глубину коррозионных поражений в миллиметрах
        for (const iliRow of iliTab.rows) {
            const measure = MathUtils.convertToDouble(iliRow.MEASURE); // линейная дистанция
            // Проверяю, что дефект внутри обрабатываемого участка
            if (measure >= beginMeasure && measure <= endMeasure) {
                if (iliRow.AVERAGE_DEPTH !== null && iliRow.AVERAGE_DEPTH !== undefined) {
                    const depthPercents = MathUtils.convertToDouble(iliRow.AVERAGE_DEPTH); // Глубина дефекта в процентах
                    if (depthPercents >= this.representativeDepthPercent) {
                        const wallThickness = MathUtils.convertToDouble(iliRow.NOMINAL_WALL_THICKNESS); // Толщина стенки трубопровода
                        const depthMm = depthPercents / 100 * wallThickness; // Глубина дефекта в мм
                        countDefects++;
                        sumDepthMm += depthMm;
                    }
                }
            }
        }
        if (countDefects !== 0) result = sumDepthMm / countDefects;
        return result;
    }

    checkIsCrossingNear_(crossingTab, beginMeasure, endMeasure) {
        let result = false;
        for (const crossingRow of crossingTab.rows) {
            if (crossingRow.MEASURE_BEGIN !== null && crossingRow.MEASURE_BEGIN !== undefined
				&& crossingRow.MEASURE_END !== null && crossingRow.MEASURE_END !== undefined) {
                const bufferedStartCrossingMeasure = MathUtils.convertToDouble(crossingRow.MEASURE_BEGIN) - this.crossingBufferDistance;
                const bufferedEndCrossingMeasure = MathUtils.convertToDouble(crossingRow.MEASURE_END) + this.crossingBufferDistance;
                if (endMeasure >= bufferedStartCrossingMeasure && beginMeasure <= bufferedEndCrossingMeasure) result = true;
            }
        }
        return result;
    }

    getDangerDegreePhaseOne_(iliTab, beginMeasure, endMeasure) {
        let maxDepthPercents = -1;
        let result = '';
        // Проход по дефектам определяю максимальную глубину коррозионных поражений
        for (const iliRow of iliTab.rows) {
            const measure = MathUtils.convertToDouble(iliRow.MEASURE); // линейная дистанция
            // Проверяю, что дефект внутри обрабатываемого участка
            if (measure >= beginMeasure && measure <= endMeasure) {
                if (iliRow.AVERAGE_DEPTH !== null && iliRow.AVERAGE_DEPTH !== undefined) {
                    const depthPercents = MathUtils.convertToDouble(iliRow.AVERAGE_DEPTH); // Глубина дефекта в процентах
                    if (depthPercents > maxDepthPercents) maxDepthPercents = depthPercents;
                }
            }
        }
        if (maxDepthPercents >= 0) result = 'УКО';
        if (maxDepthPercents >= 5) result = 'ПКО';
        if (maxDepthPercents > 15) result = 'ВКО';
        return result;
    }
}
module.exports = StoEnzInsp;
