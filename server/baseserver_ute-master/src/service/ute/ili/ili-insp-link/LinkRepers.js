const Decimal = require('decimal.js');
const DB = require('../../db');

class ReperInfo {
    constructor(objId, lineCoord, objClsId) {
        this.objId = objId;
        this.lineCoord = lineCoord;
        this.objClsId = objClsId;
        this.dists = [];
        this.lnkObjId = Number.MIN_VALUE;
        this.d = 0;
    }
}
class LinkRepers {
    static process(ds) {
        const repTab = ds.Tables.REP;
        const gpTab = ds.Tables.GP;
        const resTab = DB.createEmptyTable();
        if ((repTab.rows.filter((e) => e.OBJ_CLS_ID === '1')).length < 2 || (gpTab.rows.filter((e) => e.OBJ_CLS_ID === '1')).length < 2) { // if(rep.Select("OBJ_CLS_ID='1'").Length < 2 || gp.Select("OBJ_CLS_ID='1'").Length < 2)
            return resTab;
        }
        // Превращение таблиц в словари
        const repDict = this.fillDict_(repTab);
        const gpDict = this.fillDict_(gpTab);
        // Заполнение дистанций между реперами
        this.fillDists_(repDict);
        this.fillDists_(gpDict);
        // Вычисление корреляции дистанций
        this.fillDistrib_(repDict, gpDict);
        // Нормализация значения d
        this.normalizeD_(repDict);
        // Удаление не лучших реперов, имеющих связи с одним пикетом
        this.keepBest_(repDict, gpDict);
        // Вычисление коэффициентов и заполнение результирующий таблицы
        this.calcCoeff_(resTab, repDict, gpDict);
        return resTab;
    }

    static calcCoeff_(resTab, repDict, gpDict) {
        for (const repInfo of repDict.values()) {
            let maxLc1 = new Decimal(Number.MIN_VALUE);
            let maxLc2 = new Decimal(Number.MIN_VALUE);
            let minLc1 = new Decimal(Number.MAX_VALUE);
            let minLc2 = new Decimal(Number.MAX_VALUE);
            for (const otherRepInfo of repDict.values()) {
                if (otherRepInfo.d <= repInfo.d) continue;
                if (otherRepInfo.lineCoord.lessThan(repInfo.lineCoord)) {
                    maxLc1 = Decimal.max(maxLc1, otherRepInfo.lineCoord); // maxLc1 = Math.Max(maxLc1, otherRepInfo.line_coord);
                    maxLc2 = Decimal.max(maxLc2, gpDict.get(otherRepInfo.lnkObjId).lineCoord); // maxLc2 = Math.Max(maxLc2, gpDict[otherRepInfo.lnkObjId].line_coord);
                } else {
                    minLc1 = Decimal.min(minLc1, otherRepInfo.lineCoord); // minLc1 = Math.Min(minLc1, otherRepInfo.line_coord);
                    minLc2 = Decimal.min(minLc2, gpDict.get(otherRepInfo.lnkObjId).lineCoord); // minLc2 = Math.Min(minLc2, gpDict[otherRepInfo.lnkObjId].line_coord);
                }
            }
            let lCoeff = new Decimal(0);
            let rCoeff = new Decimal(0);
            if (!maxLc1.equals(new Decimal(Number.MIN_VALUE))) {
                const d1 = repInfo.lineCoord.minus(maxLc1);
                const d2 = gpDict.get(repInfo.lnkObjId).lineCoord.minus(maxLc2);
                lCoeff = (d1.minus(d2)).div((d1.plus(d2)));
            }
            if (!minLc1.equals(new Decimal(Number.MAX_VALUE))) {
                const d1 = minLc1.minus(repInfo.lineCoord);
                const d2 = minLc2.minus(gpDict.get(repInfo.lnkObjId).lineCoord);
                rCoeff = (d1.minus(d2)).div((d1.plus(d2)));
            }
            const coeff = Decimal.abs(lCoeff.minus(rCoeff));
            if (coeff.lessThanOrEqualTo(0.01) && Decimal.abs(lCoeff).lessThan(0.5)) {
                const row = {};
                row.REPER_ID = repInfo.objId.toString(); // row["REPER_ID"] = repInfo.ObjId;
                row.FACILITY_ID = repInfo.lnkObjId.toString(); // row["FACILITY_ID"] = repInfo.lnkObjId;
                row.COEFF = coeff.toString(); // row["COEFF"] = coeff;
                resTab.rows.push(row); // res.Rows.Add(row);
            }
        }
    }

    static normalizeD_(dict) {
        let maxD = 0;
        for (const info of dict.values()) {
            maxD = Math.max(maxD, info.d);// maxD = Math.Max(maxD, info.d);
        }
        if (maxD === 0) return;
        for (const info of dict.values()) {
            info.d /= maxD;
        }
    }

    static keepBest_(repDict, gpDict) {
        const repInfoArr = [...repDict.values()];
        for (const repInfo of repInfoArr) {
            if (repInfo.lnkObjId === Number.MIN_VALUE) {
                repDict.delete(repInfo.objId); // repDict.Remove(repInfo.ObjId);
                continue;
            }
            const gpInfo = gpDict.get(repInfo.lnkObjId);
            if (gpInfo.d > repInfo.d) repDict.delete(repInfo.objId); // repDict.Remove(repInfo.ObjId);
            else {
                if (gpInfo.lnkObjId !== Number.MIN_VALUE) repDict.delete(gpInfo.lnkObjId); // repDict.Remove(gpInfo.lnkObjId)
                gpInfo.d = repInfo.d;
                gpInfo.lnkObjId = repInfo.objId;
            }
        }
    }

    static fillDistrib_(repDict, gpDict) {
        for (const repInfo of repDict.values()) {
            repInfo.d = 0;
            for (const gpInfo of gpDict.values()) {
                if (repInfo.objClsId !== gpInfo.objClsId) continue;
                let sumD = 0;
                for (const gpDist of gpInfo.dists) {
                    let maxD = 0;
                    for (const repDist of repInfo.dists) {
                        if (Math.abs(repDist - gpDist) > 4000) continue;
                        // double d = Math.Exp((-(repDist - gpDist) * (repDist - gpDist) / Math.Abs(repDist / 30+ 0.0001) / Math.Abs(gpDist / 30 + 0.0001))) / Math.Sqrt(Math.Abs(repDist / 7000)+ 1);
                        const d = Math.exp((-(repDist - gpDist) * (repDist - gpDist) / Math.abs(repDist / 30 + 0.0001) / Math.abs(gpDist / 30 + 0.0001))) / Math.sqrt(Math.abs(repDist / 7000) + 1);
                        maxD = Math.max(maxD, d);
                    }
                    sumD += maxD;
                }
                if (sumD > repInfo.d) {
                    repInfo.d = sumD;
                    repInfo.lnkObjId = gpInfo.objId;
                }
            }
        }
    }

    static fillDict_(tab) {
        const dict = new Map();
        for (const row of tab.rows) {
            const id = row.OBJ_ID;// decimal id = (decimal)row["obj_id"] измененно по причине того,что из БД приходит атрибут в верхнем регистре.
            dict.set(id, new ReperInfo(id, new Decimal(row.LINE_COORD), row.OBJ_CLS_ID.toString()));// dict[id] = new ReperInfo(id, (decimal)row["linecoord"], (string)row["obj_cls_id"]);
        }
        return dict;
    }

    static fillDists_(dict) {
        for (const reper of dict.values()) {
            for (const valve of dict.values()) {
                if (valve.objClsId !== '1') continue;
                reper.dists.push(reper.lineCoord.minus(valve.lineCoord).toNumber());
            }
        }
    }
}
module.exports = LinkRepers;
