const Decimal = require('decimal.js');
const { ErrorHandler, logger } = require('gis-core');
const { lang, errors } = require('../../../../resources');
/**
 * Класс отвечает за пересчет кластеров
 */
class IliCluster {
    constructor(processParameters) {
        this.diameter = Number(processParameters.DIAMETER); // диаметр
        if (this.diameter === 0 || isNaN(this.diameter)) this.diameter = 1420;
        this.inspectionId = processParameters.ILI_INSPECTION_ID || null;// идентификатор обследования
        this.thickness = processParameters.THICKNESS || null;// толщина стенки по документации!!!
        this.clusterTab = null;
        this.defTab = null;
        this.clusterIndex = 0;
        this.iliIndex = -1;
        // Берем одну толщину на весь отчет, из параметров!
        this.toleranceSi = Decimal.mul(this.diameter, this.thickness).sqrt().mul(2).div(1000);
        this.toleranceSk = Decimal.div(this.thickness, this.diameter).sqrt().mul(360);
    }

    resetClusterIndex() {
        this.clusterIndex = 0;
    }

    incrementClusterIndex() {
        this.clusterIndex++;
    }

    resetIliIndex() {
        this.iliIndex = -1;
    }

    decrementIliIndex() {
        this.iliIndex--;
    }

    /**
     * Основная функция расчета кластеров
     * @param ds
     * @param processParameters
     * @returns {null}
     */
    process(ds) {
        this.clusterTab = ds.Tables.CLUSTER;
        this.defTab = ds.Tables.DEFECTS;
        // TODO удалить цикл и решить вопрос с приведением proceed к числу
        for (const row of this.defTab.rows) {
            row.PROCEED = Number(row.proceed);
            delete row.proceed;
        }

        this.resetClusterIndex();
        this.resetIliIndex();
        if (this.clusterTab) this.clusterTab.rows = [];
        while (this.unproccesExists()) {
            for (const defectRow of this.defTab.rows) {
                if (defectRow.CLUSTER_TYPE && defectRow.CLUSTER_TYPE.toString().indexOf('Группа поверхностных дефектов') !== -1) { // if (String.Compare((string)defectRow["CLUSTER_TYPE"], "Группа поверхностных дефектов") == 0)
                    // Группа поверхностных дефектов
                    this.calcSurfaceDefects(defectRow);
                } else // Ремонтное место
                { this.calcRepairPlace(defectRow); }
            }
        }
        this.deleteSingleClusters();
        return ds;
    }

    deleteSingleClusters() {
        const { clusterTab } = this;
        if (clusterTab.rows && clusterTab.rows.length > 0) clusterTab.rows = clusterTab.rows.filter((clusterRow) => clusterRow.ANOMALY_COUNT !== 1);
    }

    calcRepairPlace(defect) {
        if (defect.PROCEED === 1) return;
        let currentClusterIndex;
        defect.PROCEED = 1;
        if (Number(defect.ILI_DATA_ID) > 0) {
            this.createCluster(defect);
            defect.CLUSTER_INDEX = this.clusterIndex;
        }
        currentClusterIndex = Number(defect.CLUSTER_INDEX);
        for (const pretendDefect of this.defTab.rows) {
            if (defect === pretendDefect) continue;
            if (pretendDefect.PROCEED === 1
                || defect.WELD_NUMBER === null
                || pretendDefect.WELD_NUMBER === null) continue;
            if (defect.WELD_NUMBER.toString() !== pretendDefect.WELD_NUMBER.toString())// if ((string)defect["WELD_NUMBER"] != (string)PretendDefect["WELD_NUMBER"])
            { continue; }
            if (pretendDefect.CLUSTER_INDEX != null && Number(defect.CLUSTER_INDEX) === Number(pretendDefect.CLUSTER_INDEX)) continue;
            pretendDefect.PROCEED = 1;
            pretendDefect.CLUSTER_INDEX = defect.CLUSTER_INDEX;
            this.updateRepairCluster(pretendDefect, currentClusterIndex);
        }
    }

    calcSurfaceDefects(defect) {
        if (defect.PROCEED === 1) return;
        let currentClusterIndex;
        let defStartTolerantedAreaSi; let defEndTolerantedAreaSi; let defStartTolerantedAreaSk; let defEndTolerantedAreaSk;
        let defLengtn; let defWidth; let defOdometer; let defOrientataion; let defStartOrientataion; let defEndOrientataion;
        let defStartOdometer; let
            defEndOdometer;
        defect.PROCEED = 1;
        try {
            defLengtn = new Decimal(defect.LENGTH);
            defWidth = new Decimal(defect.WIDTH);
            defOdometer = new Decimal(defect.ABSOLUTE_ODOMETER);
            defOrientataion = new Decimal(defect.ORIENTATION_DEG);
        } catch (ex) {
            throw new ErrorHandler(errors.gis_calc_cluster_1);
        }
        defStartOdometer = defOdometer;
        defEndOdometer = defStartOdometer.plus(Decimal.div(defLengtn, 1000));// new Decimal(defStartOdometer + defLengtn/1000);
        const mulD = defWidth.mul(360).div(Decimal.mul(Math.PI, this.diameter)).div(2);
        const defOrientataionStartDecimal = defOrientataion.minus(mulD);// this.normalizeDegrees(defOrientataion - (360 * defWidth / (3.14 * this.diameter) / 2), false);//
        const defOrientataionEndDecimal = defOrientataion.plus(mulD);// this.normalizeDegrees(defOrientataion + (360 * defWidth / (3.14 * this.diameter) / 2), false);//
        defStartOrientataion = this.normalizeDegrees(defOrientataionStartDecimal, true);
        defEndOrientataion = this.normalizeDegrees(defOrientataionEndDecimal, true);

        // Длина  дефекта с учетом допуска с обоих сторон
        defStartTolerantedAreaSi = defStartOdometer.minus(Decimal.div(this.toleranceSi, 2));
        defEndTolerantedAreaSi = defEndOdometer.plus(Decimal.div(this.toleranceSi, 2));
        // Ширина дефекта с учетом допуска с обоих сторон
        defStartTolerantedAreaSk = this.normalizeDegrees(defStartOrientataion.minus(this.toleranceSk.div(2)), true);
        defEndTolerantedAreaSk = this.normalizeDegrees(defEndOrientataion.plus(this.toleranceSk.div(2)), true);

        if ((Number(defect.ILI_DATA_ID)) > 0) {
            defect.START_ORIENTATION_DEG = defStartOrientataion.toString();
            defect.END_ORIENTATION_DEG = defEndOrientataion.toString();
            this.createCluster(defect);
            defect.CLUSTER_INDEX = this.clusterIndex;
        }
        currentClusterIndex = defect.CLUSTER_INDEX; // currentClusterIndex = (decimal)defect["CLUSTER_INDEX"];
        for (const pretendDefect of this.defTab.rows) {
            if (defect === pretendDefect) continue;
            if (pretendDefect.PROCEED === 1) continue;
            if (defect.WELD_NUMBER !== null && defect.WELD_NUMBER !== undefined
                && pretendDefect.WELD_NUMBER !== null && pretendDefect.WELD_NUMBER !== undefined
                && defect.WELD_NUMBER.toString() !== pretendDefect.WELD_NUMBER.toString()) continue;
            if (pretendDefect.CLUSTER_INDEX !== null && pretendDefect.CLUSTER_INDEX !== undefined && Number(defect.CLUSTER_INDEX) === Number(pretendDefect.CLUSTER_INDEX)) continue;
            let pretendStartOdometer; let pretendEndOdometer; let pretendLength;
            let pretendOrientataion; let pretendStartOrientataion; let pretendEndOrientataion; let pretendWidth;
            let pretendStartTolerantedAreaSi; let pretendEndTolerantedAreaSi;
            let pretendStartTolerantedAreaSk; let
                pretendEndTolerantedAreaSk;

            pretendStartOdometer = new Decimal(pretendDefect.ABSOLUTE_ODOMETER);
            pretendLength = new Decimal(pretendDefect.LENGTH);
            pretendOrientataion = new Decimal(pretendDefect.ORIENTATION_DEG);
            pretendWidth = new Decimal(pretendDefect.WIDTH);

            pretendEndOdometer = pretendStartOdometer.plus(Decimal.div(pretendLength, 1000));
            const pretendMulD = pretendWidth.mul(360).div(Decimal.mul(Math.PI, this.diameter)).div(2);
            pretendStartOrientataion = this.normalizeDegrees(pretendOrientataion.minus(pretendMulD), true);
            pretendEndOrientataion = this.normalizeDegrees(pretendOrientataion.plus(pretendMulD), true);
            // Длина  дефекта с учетом допуска с обоих сторон
            pretendStartTolerantedAreaSi = pretendStartOdometer.minus(Decimal.div(this.toleranceSi, 2));
            pretendEndTolerantedAreaSi = pretendEndOdometer.plus(Decimal.div(this.toleranceSi, 2));
            // Ширина дефекта с учетом допуска с обоих сторон
            pretendStartTolerantedAreaSk = this.normalizeDegrees(pretendStartOrientataion.minus(this.toleranceSk.div(2)), true);
            pretendEndTolerantedAreaSk = this.normalizeDegrees(pretendEndOrientataion.plus(this.toleranceSk.div(2)), true);
            if (defStartTolerantedAreaSi.lessThanOrEqualTo(pretendEndTolerantedAreaSi)
                && defEndTolerantedAreaSi.greaterThanOrEqualTo(pretendStartTolerantedAreaSi)) {
                // Проверка, что дефекты пересекаются по ширине с учетом допуска
                if (defStartTolerantedAreaSk.lessThanOrEqualTo(pretendEndTolerantedAreaSk)
                    && defEndTolerantedAreaSk.greaterThanOrEqualTo(pretendStartTolerantedAreaSk)) {
                    pretendDefect.PROCEED = 1;
                    pretendDefect.CLUSTER_INDEX = defect.CLUSTER_INDEX;
                    pretendDefect.START_ORIENTATION_DEG = pretendStartOrientataion.toString();
                    pretendDefect.END_ORIENTATION_DEG = pretendEndOrientataion.toString();
                    this.updateSurfaceCluster(pretendDefect, currentClusterIndex);
                }
            }
        }
    }

    unproccesExists() {
        if (this.defTab) {
            for (const defRow of this.defTab.rows) {
                if (defRow.PROCEED === 0) {
                    return true;
                }
            }
        }
        return false;
    }

    createCluster(baseDefect) {
        let startOdometer; let endOdometer; let effectiveLength; let effectiveWidth; let
            effectiveArea;
        startOdometer = new Decimal(baseDefect.ABSOLUTE_ODOMETER);
        effectiveLength = new Decimal(baseDefect.LENGTH);
        effectiveWidth = new Decimal(baseDefect.WIDTH);
        endOdometer = startOdometer.plus(Decimal.div(effectiveLength, 1000));
        effectiveArea = effectiveLength.mul(effectiveWidth);
        this.incrementClusterIndex();
        const clusterRow = {
            ANOMALY_COUNT: 1,
            CLUSTER_INDEX: this.clusterIndex,
            CLUSTER_TYPE: baseDefect.CLUSTER_TYPE,
            START_ABSOLUTE_ODOMETER: startOdometer.toString(),
            END_ABSOLUTE_ODOMETER: endOdometer.toString(),
            EFFECTIVE_LENGTH: effectiveLength.toString(),
            EFFECTIVE_WIDTH: effectiveWidth.toString(),
            EFFECTIVE_AREA: effectiveArea.toString(),
            ILI_INSPECTION_ID: this.inspectionId,
            START_ORIENTATION_DEG: baseDefect.ORIENTATION_DEG,
            END_ORIENTATION_DEG: baseDefect.ORIENTATION_DEG,
        };
        this.clusterTab.rows.push(clusterRow);
        this.decrementIliIndex();
        const newDefRow = {
            CLUSTER_TYPE: baseDefect.CLUSTER_TYPE,
            LENGTH: effectiveLength.toString(),
            WIDTH: effectiveWidth.toString(),
            ABSOLUTE_ODOMETER: baseDefect.ABSOLUTE_ODOMETER,
            WELD_NUMBER: baseDefect.WELD_NUMBER,
            ILI_DATA_ID: this.iliIndex,
            ORIENTATION_DEG: baseDefect.ORIENTATION_DEG,
            NOMINAL_WALL_THICKNESS: baseDefect.NOMINAL_WALL_THICKNESS,
            CLUSTER_INDEX: this.clusterIndex,
            PROCEED: 0,
            START_ORIENTATION_DEG: baseDefect.START_ORIENTATION_DEG,
            END_ORIENTATION_DEG: baseDefect.END_ORIENTATION_DEG,
        };
        this.defTab.rows.push(newDefRow);
    }

    fill(ds) {
        const defTab = ds.Tables.DEFECTS;
        const clusterTab = ds.Tables.CLUSTER;
        const iliTab = ds.Tables.ILI_DATA;
        for (const defRow of defTab.rows) {
            if (defRow.CLUSTER_INDEX === null) continue;
            for (const clusterRow of clusterTab.rows) {
                if (defRow.CLUSTER_INDEX === clusterRow.CLUSTER_INDEX) {
                    const iliRow = {
                        ILI_CLUSTER_ID: clusterRow.ILI_CLUSTER_ID,
                        ILI_DATA_ID: defRow.ILI_DATA_ID,
                    };
                    iliTab.rows.push(iliRow);
                    break;
                }
            }
        }
        return ds;
    }

    normalizeDegrees(degree, isDecimal = false) {
        let result = degree;
        if (isDecimal) {
            if (degree.greaterThan(360)) result = degree.minus(360);
            if (degree.lessThan(0)) result = degree.plus(360);
            return result;
        }
        if (degree > 360) result = degree - 360;
        if (degree < 0) result = degree + 360;
        return result;
    }

    moveDefectsFromClusterToCluster(fromCluster, endCluster) {
        if (this.defTab && this.defTab.rows) {
            this.defTab.rows.forEach((defectRow) => {
                if (defectRow.CLUSTER_INDEX != null
                    && defectRow.CLUSTER_INDEX === fromCluster) defectRow.CLUSTER_INDEX = endCluster;
            });
        }
        if (this.clusterTab && this.clusterTab.rows) {
            this.clusterTab.rows = this.clusterTab.rows.filter((clusterRow) => clusterRow.CLUSTER_INDEX !== null
                && clusterRow.CLUSTER_INDEX === fromCluster);
        }
    }

    updateSurfaceCluster(additionDefect, clusterIndex) {
        for (const clusterRow of this.clusterTab.rows) {
            if (clusterRow.CLUSTER_INDEX !== clusterIndex) continue;
            const absoluteOdometer = new Decimal(additionDefect.ABSOLUTE_ODOMETER);
            clusterRow.ANOMALY_COUNT += 1;
            clusterRow.START_ABSOLUTE_ODOMETER = Decimal.min(absoluteOdometer, clusterRow.START_ABSOLUTE_ODOMETER).toString();
            clusterRow.END_ABSOLUTE_ODOMETER = Decimal.max(absoluteOdometer.plus(Decimal.div(additionDefect.LENGTH, 1000)), clusterRow.END_ABSOLUTE_ODOMETER).toString();
            const startAbsoluteOdometer = new Decimal(clusterRow.START_ABSOLUTE_ODOMETER);
            const endAbsoluteOdometer = new Decimal(clusterRow.END_ABSOLUTE_ODOMETER);
            clusterRow.EFFECTIVE_LENGTH = Decimal.abs(endAbsoluteOdometer.minus(startAbsoluteOdometer)).mul(1e3).toString();
            clusterRow.START_ORIENTATION_DEG = this.normalizeDegrees(Decimal.min(additionDefect.ORIENTATION_DEG, clusterRow.START_ORIENTATION_DEG), true).toString();
            clusterRow.END_ORIENTATION_DEG = this.normalizeDegrees(Decimal.max(additionDefect.ORIENTATION_DEG, clusterRow.END_ORIENTATION_DEG), true).toString();
            const endOrientationDeg = new Decimal(clusterRow.END_ORIENTATION_DEG);
            const absOrient = Decimal.abs(endOrientationDeg.minus(clusterRow.START_ORIENTATION_DEG));
            clusterRow.EFFECTIVE_WIDTH = Decimal.mul(Math.PI, this.diameter).mul(absOrient).div(360).toString();
            clusterRow.EFFECTIVE_AREA = Decimal.mul(clusterRow.EFFECTIVE_WIDTH, clusterRow.EFFECTIVE_LENGTH).toString();
            // Если оказалось, что дефект, который я добавляю к кластеру, не является настоящим дефектом,
            // а является кластером, то нужно перевесить все дефекты с него на текущий кластер
            // Сам старый кластер надо удалить
            if (Number(additionDefect.ILI_DATA_ID) < 0) this.moveDefectsFromClusterToCluster(additionDefect.CLUSTER_INDEX, clusterIndex);
        }
    }

    updateRepairCluster(additionDefect, clusterIndex) {
        for (let k = 0; k < this.clusterTab.rows.length; k++) {
            const clusterRow = this.clusterTab.rows[k];
            if (clusterRow.CLUSTER_INDEX !== clusterIndex) continue;
            clusterRow.ANOMALY_COUNT += 1;
            const absoluteOdometer = new Decimal(additionDefect.ABSOLUTE_ODOMETER);
            clusterRow.START_ABSOLUTE_ODOMETER = Decimal.min(absoluteOdometer, clusterRow.START_ABSOLUTE_ODOMETER).toString();
            clusterRow.END_ABSOLUTE_ODOMETER = Decimal.max(absoluteOdometer.plus(Decimal.div(additionDefect.LENGTH, 1000)), clusterRow.END_ABSOLUTE_ODOMETER).toString();
            const startAbsoluteOdometer = new Decimal(clusterRow.START_ABSOLUTE_ODOMETER);
            const endAbsoluteOdometer = new Decimal(clusterRow.END_ABSOLUTE_ODOMETER);
            clusterRow.EFFECTIVE_LENGTH = Decimal.abs(endAbsoluteOdometer.minus(startAbsoluteOdometer)).mul(1e3).toString();
            if (Number(additionDefect.ILI_DATA_ID) < 0) this.moveDefectsFromClusterToCluster(additionDefect.CLUSTER_INDEX, clusterIndex);
        }
    }
}
module.exports = IliCluster;
