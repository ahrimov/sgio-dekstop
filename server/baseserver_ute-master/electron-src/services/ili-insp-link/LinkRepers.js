/**
 * Математика привязки реперов к пикетам.
 * Адаптировано из src/service/ute/ili/ili-insp-link/LinkRepers.js.
 * Переведено на ESM.
 *
 * Изменения:
 *   - DB.createEmptyTable() → createEmptyTable() из tableUtils
 *   - убран import DB
 *
 * Вся математическая логика — без изменений.
 */
import Decimal from 'decimal.js';
import { createEmptyTable } from '../../utils/tableUtils.js';

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

export default class LinkRepers {
    /**
     * Основной метод привязки реперов.
     * @param {{ Tables: { REP: { rows: Array }, GP: { rows: Array } } }} ds
     * @returns {{ columns: Array, rows: Array }}
     */
    static process(ds) {
        const repTab = ds.Tables.REP;
        const gpTab = ds.Tables.GP;
        const resTab = createEmptyTable();

        if (
            repTab.rows.filter(e => e.OBJ_CLS_ID === '1').length < 2 ||
            gpTab.rows.filter(e => e.OBJ_CLS_ID === '1').length < 2
        ) {
            return resTab;
        }

        const repDict = this.fillDict_(repTab);
        const gpDict = this.fillDict_(gpTab);
        this.fillDists_(repDict);
        this.fillDists_(gpDict);
        this.fillDistrib_(repDict, gpDict);
        this.normalizeD_(repDict);
        this.keepBest_(repDict, gpDict);
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
                    maxLc1 = Decimal.max(maxLc1, otherRepInfo.lineCoord);
                    maxLc2 = Decimal.max(maxLc2, gpDict.get(otherRepInfo.lnkObjId).lineCoord);
                } else {
                    minLc1 = Decimal.min(minLc1, otherRepInfo.lineCoord);
                    minLc2 = Decimal.min(minLc2, gpDict.get(otherRepInfo.lnkObjId).lineCoord);
                }
            }

            let lCoeff = new Decimal(0);
            let rCoeff = new Decimal(0);

            if (!maxLc1.equals(new Decimal(Number.MIN_VALUE))) {
                const d1 = repInfo.lineCoord.minus(maxLc1);
                const d2 = gpDict.get(repInfo.lnkObjId).lineCoord.minus(maxLc2);
                lCoeff = d1.minus(d2).div(d1.plus(d2));
            }
            if (!minLc1.equals(new Decimal(Number.MAX_VALUE))) {
                const d1 = minLc1.minus(repInfo.lineCoord);
                const d2 = minLc2.minus(gpDict.get(repInfo.lnkObjId).lineCoord);
                rCoeff = d1.minus(d2).div(d1.plus(d2));
            }

            const coeff = Decimal.abs(lCoeff.minus(rCoeff));
            if (coeff.lessThanOrEqualTo(0.01) && Decimal.abs(lCoeff).lessThan(0.5)) {
                resTab.rows.push({
                    REPER_ID: repInfo.objId.toString(),
                    FACILITY_ID: repInfo.lnkObjId.toString(),
                    COEFF: coeff.toString(),
                });
            }
        }
    }

    static normalizeD_(dict) {
        let maxD = 0;
        for (const info of dict.values()) maxD = Math.max(maxD, info.d);
        if (maxD === 0) return;
        for (const info of dict.values()) info.d /= maxD;
    }

    static keepBest_(repDict, gpDict) {
        for (const repInfo of [...repDict.values()]) {
            if (repInfo.lnkObjId === Number.MIN_VALUE) {
                repDict.delete(repInfo.objId);
                continue;
            }
            const gpInfo = gpDict.get(repInfo.lnkObjId);
            if (gpInfo.d > repInfo.d) {
                repDict.delete(repInfo.objId);
            } else {
                if (gpInfo.lnkObjId !== Number.MIN_VALUE) repDict.delete(gpInfo.lnkObjId);
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
                        const d = Math.exp(
                            -(repDist - gpDist) * (repDist - gpDist) /
                            Math.abs(repDist / 30 + 0.0001) /
                            Math.abs(gpDist / 30 + 0.0001)
                        ) / Math.sqrt(Math.abs(repDist / 7000) + 1);
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
            dict.set(row.OBJ_ID, new ReperInfo(
                row.OBJ_ID,
                new Decimal(row.LINE_COORD),
                row.OBJ_CLS_ID.toString()
            ));
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
