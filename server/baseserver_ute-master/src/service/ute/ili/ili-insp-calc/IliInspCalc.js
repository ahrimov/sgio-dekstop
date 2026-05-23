const Decimal = require('decimal.js');
const DB = require('../../db');

class IliInspCalc {
    static process(ds) {
        const piketTab = ds.Tables.PIKET;
        const dataTab = ds.Tables.DATA;
        let resTab = DB.createEmptyTable();
        let prev = 0;
        let i;
        let prevRow = null;
        const repers = dataTab.rows.filter((e) => e.CONTROL_POINT_LF === 'Y' && parseFloat(e.MEASURE) > 0 && parseFloat(e.ABSOLUTE_ODOMETER) > 0);
        if (repers.length === 0) return resTab;
        // Расчет усредненного коэффициента погрешности
        let sumDd = new Decimal(0);
        for (const row of repers) {
            if (prevRow !== null) {
                const dist = new Decimal(row.MEASURE).minus(prevRow.MEASURE); // decimal dist = (decimal)row["MEASURE"] - (decimal)prevRow["MEASURE"];
                const dd = Decimal.abs(new Decimal(row.ACCURACY).minus(prevRow.ACCURACY)); // decimal dd = Math.Abs((decimal)row["ACCURACY"] - (decimal)prevRow["ACCURACY"]);
                sumDd = sumDd.plus(dd.div(dist.eq(0) ? new Decimal(1) : dist));
            }
            prevRow = row;
        }
        const avgDd = sumDd.div(repers.length);
        // Проход по всем диапазонам между контрольными точками
        for (i = 0; i < dataTab.rows.length; i++) {
            const row = dataTab.rows[i];
            if (row.CONTROL_POINT_LF !== 'Y') continue;
            this.processRange(dataTab, prev, i, avgDd);
            prev = i;
        }
        this.processRange(dataTab, prev, i - 1, avgDd);
        const baseFldNames = ['ILI_DATA_ID', 'ACCURACY', 'MEASURE', 'EVENT_ID'];
        const dataFldNames = ['X', 'Y', 'Z', 'DEPTH', 'STATION'];
        const prevDataFldNames = ['SRV_DISTRICT_GCL', 'COORDINATE_ID', 'LOCATION_ID', 'STATION_ID', 'LINE_ID', 'ROUTE_ID', 'SERIES_ID', 'SERIES'];
        resTab = this.interpolate(dataTab, piketTab, resTab, 'MEASURE', 'NEAREST_DIST', baseFldNames, dataFldNames, prevDataFldNames);// Interpolate(dataTab, piketTab, resTab, "MEASURE", "NEAREST_DIST",new string[] { "ILI_DATA_ID", "ACCURACY", "MEASURE", "EVENT_ID" },new string[] { "X", "Y", "Z", "DEPTH", "STATION" },new string[] { "SRV_DISTRICT_GCL", "COORDINATE_ID", "LOCATION_ID", "STATION_ID", "LINE_ID", "ROUTE_ID", "SERIES_ID", "SERIES" });
        return resTab;
    }

    static getStationRange(tab) {
        if (tab.rows.length === 0) return 'PREVIOUS_EVENT_ID=PREVIOUS_EVENT_ID';
        const stationBegin = tab.rows[0].STATION_ID;
        const stationEnd = tab.rows[tab.rows.length - 1].STATION_ID;
        const stationLength = Number(tab.rows[tab.rows.length - 1].MEASURE) - Number(tab.rows[0].MEASURE);
        // return string.Format("STATION_ID_BEGIN = {0}, STATION_ID_END = {1}, LENGTH = {2}", tab.Rows[0]["STATION_ID"], tab.Rows[tab.Rows.Count-1]["STATION_ID"], Convert.ToDouble(tab.Rows[tab.Rows.Count-1]["MEASURE"])-Convert.ToDouble(tab.Rows[0]["MEASURE"]));
        return `STATION_ID_BEGIN = ${stationBegin}, STATION_ID_END = ${stationEnd}, LENGTH = ${stationLength}`;
    }

    // @redundant
    static fillNext(tab, fromFldNames, toFldNames) {
        if (fromFldNames.length !== toFldNames.length) return;
        for (let i = 0; i < tab.length - 1; i++) {
            for (let j = 0; j < fromFldNames.length; j++) {
                tab[i][toFldNames[j]] = tab[i + 1][fromFldNames[j]];
            }
        }
    }

    /**
     *
     * @param tab
     * @param from
     * @param to
     * @param dd
     */
    static processRange(tab, from, to, dd) {
        if (to <= from) return;
        const fromRow = tab.rows[from];
        const toRow = tab.rows[to];
        const isFromRep = fromRow.CONTROL_POINT_LF === 'Y';
        const isToRep = toRow.CONTROL_POINT_LF === 'Y';
        if (!isFromRep && !isToRep) return;
        const fromOdom = new Decimal(fromRow.ABSOLUTE_ODOMETER);
        const toOdom = new Decimal(toRow.ABSOLUTE_ODOMETER);
        let fromMes = isFromRep ? new Decimal(fromRow.MEASURE) : new Decimal(0);
        let toMes = isToRep ? new Decimal(toRow.MEASURE) : new Decimal(0);
        let fromAccur = isFromRep ? new Decimal(fromRow.ACCURACY) : new Decimal(0);
        let toAccur = isToRep ? new Decimal(toRow.ACCURACY) : new Decimal(0);
        let dOdom = toOdom.minus(fromOdom);
        if (dOdom.eq(0)) dOdom = new Decimal(0.00001);
        if (!isFromRep) {
            fromMes = toMes.minus(dOdom);
            fromAccur = toAccur;
        }
        if (!isToRep) {
            toMes = fromMes.plus(dOdom);
            toAccur = fromAccur;
        }
        const dMes = toMes.minus(fromMes);
        for (let i = (isFromRep ? from + 1 : from); i <= (isToRep ? to - 1 : to); i++) {
            const row = tab.rows[i];
            const odom = new Decimal(row.ABSOLUTE_ODOMETER);
            row.MEASURE = fromMes.plus(odom.minus(fromOdom).mul(dMes).div(dOdom)).toString(); // fromMes + (odom - fromOdom) * dMes / dOdom;
            row.ACCURACY = fromAccur.plus(odom.minus(fromOdom).mul(toAccur.minus(fromAccur)).div(dOdom)).plus(Decimal.min(odom.minus(fromOdom), toOdom.minus(odom)).mul(dd)).toString(); // fromAccur + (odom - fromOdom) * (toAccur - fromAccur) / dOdom + Math.Min(odom - fromOdom, toOdom - odom) * dd;
        }
    }

    /**
     * Заполнение таблицы resTab значениями из baseTab, дополненными интерполированными значаниями из dataTab
     * Интерполяция идет по полю measureFldName
     * @param baseTab
     * @param dataTab
     * @param resTab
     * @param measureFldName
     * @param nearestDistFieldName
     * @param baseFldNames
     * @param dataFldNames
     * @param prevDataFldNames
     */
    static interpolate(baseTab, dataTab, resTab, measureFldName, nearestDistFieldName, baseFldNames, dataFldNames, prevDataFldNames) {
        let nextPiketIdx = 0;
        for (const baseRow of baseTab.rows) {
            const resRow = {}; // DataRow resRow = resTab.NewRow();
            const measure = new Decimal(baseRow[measureFldName]);
            for (const fldName of baseFldNames) resRow[fldName] = baseRow[fldName];
            for (; nextPiketIdx < dataTab.rows.length; nextPiketIdx++) {
                const nextPiketRow = dataTab.rows[nextPiketIdx];
                const nextMeasure = new Decimal(nextPiketRow[measureFldName]);
                if (nextMeasure.greaterThanOrEqualTo(measure)) {
                    if (nextMeasure.eq(measure)) {
                        for (const fldName of dataFldNames) resRow[fldName] = nextPiketRow[fldName];
                        for (const fldName of prevDataFldNames) resRow[fldName] = nextPiketRow[fldName];
                        if (nearestDistFieldName) // if (!string.IsNullOrEmpty(nearestDistFieldName))
                        { resRow[nearestDistFieldName] = 0; }
                        resTab.rows.push(resRow); // resTab.Rows.Add(resRow);
                        break;
                    }
                    if (nextPiketIdx === 0) break;
                    const prevPiketRow = dataTab.rows[nextPiketIdx - 1];
                    const prevMeasure = new Decimal(prevPiketRow[measureFldName]);
                    const coeff = measure.minus(prevMeasure).div(nextMeasure.minus(prevMeasure));
                    const nearestPiketRow = (coeff.lessThanOrEqualTo(0.5)) ? prevPiketRow : nextPiketRow;
                    const nearestDist = Decimal.min(Decimal.abs(coeff.lessThanOrEqualTo(0.5) ? measure.minus(prevMeasure) : nextMeasure.minus(measure)), 999); // decimal nearestDist = Math.Min(Math.Abs((coeff <= 0.5M) ? (measure - prevMeasure) : (nextMeasure - measure)), 999);
                    if (nearestDistFieldName) resRow[nearestDistFieldName] = nearestDist.toString();
                    for (const fldName of dataFldNames) {
                        if (prevPiketRow[fldName] === null || nextPiketRow[fldName] === null) continue;
                        const prevVal = new Decimal(prevPiketRow[fldName]);
                        const nextVal = new Decimal(nextPiketRow[fldName]);
                        resRow[fldName] = prevVal.plus(nextVal.minus(prevVal).mul(coeff)).toString();
                    }
                    for (const fldName of prevDataFldNames) {
                        resRow[fldName] = nearestPiketRow[fldName];
                    }
                    resTab.rows.push(resRow);
                    break;
                }
            }
        }
        return resTab;
    }
}
module.exports = IliInspCalc;
