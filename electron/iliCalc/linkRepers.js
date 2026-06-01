import Decimal from 'decimal.js';

/**
 * LinkRepers algorithm — matches ILI repers to route reference points.
 *
 * Ported from server/baseserver_ute-master/src/service/ute/ili/ili-insp-link/LinkRepers.js
 *
 * Input:  ds.Tables.REP — repers from ILI data (OBJ_ID, LINE_COORD, OBJ_CLS_ID)
 *         ds.Tables.GP  — reference points from route (OBJ_ID, LINE_COORD, OBJ_CLS_ID)
 * Output: { rows: [{REPER_ID, FACILITY_ID, COEFF}, ...] }
 */

class ReperInfo {
	constructor(objId, lineCoord, objClsId) {
		this.objId = objId;
		this.lineCoord = lineCoord; // Decimal
		this.objClsId = objClsId;
		this.dists = [];
		this.lnkObjId = Number.MIN_VALUE;
		this.d = 0;
	}
}

export class LinkRepers {
	static process(ds) {
		const repTab = ds.Tables.REP;
		const gpTab = ds.Tables.GP;
		const resTab = { rows: [] };

		const repCls1 = repTab.rows.filter(e => e.OBJ_CLS_ID === '1');
		const gpCls1 = gpTab.rows.filter(e => e.OBJ_CLS_ID === '1');

		if (repCls1.length < 2 || gpCls1.length < 2) {
			console.log(`[LinkRepers] Not enough control points: REP cls1=${repCls1.length}, GP cls1=${gpCls1.length}`);
			return resTab;
		}

		// Convert tables to Maps of ReperInfo objects
		const repDict = this._fillDict(repTab);
		const gpDict = this._fillDict(gpTab);

		// Calculate distances between all repers of type '1' (valves)
		this._fillDists(repDict);
		this._fillDists(gpDict);

		// Correlate ILI repers with route reference points
		this._fillDistrib(repDict, gpDict);

		// Normalize correlation scores
		this._normalizeD(repDict);

		// Keep only the best matches
		this._keepBest(repDict, gpDict);

		// Calculate quality coefficients and build result table
		this._calcCoeff(resTab, repDict, gpDict);

		console.log(`[LinkRepers] Matched ${resTab.rows.length} repers`);
		return resTab;
	}

	static _fillDict(tab) {
		const dict = new Map();
		for (const row of tab.rows) {
			const id = row.OBJ_ID;
			dict.set(id, new ReperInfo(id, new Decimal(row.LINE_COORD), String(row.OBJ_CLS_ID)));
		}
		return dict;
	}

	static _fillDists(dict) {
		for (const reper of dict.values()) {
			for (const valve of dict.values()) {
				if (valve.objClsId !== '1') continue;
				reper.dists.push(reper.lineCoord.minus(valve.lineCoord).toNumber());
			}
		}
	}

	static _fillDistrib(repDict, gpDict) {
		for (const repInfo of repDict.values()) {
			repInfo.d = 0;
			for (const gpInfo of gpDict.values()) {
				if (repInfo.objClsId !== gpInfo.objClsId) continue;
				let sumD = 0;
				for (const gpDist of gpInfo.dists) {
					let maxD = 0;
					for (const repDist of repInfo.dists) {
						if (Math.abs(repDist - gpDist) > 4000) continue;
						const d =
							Math.exp(
								(-(repDist - gpDist) * (repDist - gpDist)) /
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

	static _normalizeD(dict) {
		let maxD = 0;
		for (const info of dict.values()) {
			maxD = Math.max(maxD, info.d);
		}
		if (maxD === 0) return;
		for (const info of dict.values()) {
			info.d /= maxD;
		}
	}

	static _keepBest(repDict, gpDict) {
		const repInfoArr = [...repDict.values()];
		for (const repInfo of repInfoArr) {
			if (repInfo.lnkObjId === Number.MIN_VALUE) {
				repDict.delete(repInfo.objId);
				continue;
			}
			const gpInfo = gpDict.get(repInfo.lnkObjId);
			if (!gpInfo) {
				repDict.delete(repInfo.objId);
				continue;
			}
			if (gpInfo.d > repInfo.d) {
				repDict.delete(repInfo.objId);
			} else {
				if (gpInfo.lnkObjId !== Number.MIN_VALUE) {
					repDict.delete(gpInfo.lnkObjId);
				}
				gpInfo.d = repInfo.d;
				gpInfo.lnkObjId = repInfo.objId;
			}
		}
	}

	static _calcCoeff(resTab, repDict, gpDict) {
		for (const repInfo of repDict.values()) {
			let maxLc1 = new Decimal(Number.MIN_VALUE);
			let maxLc2 = new Decimal(Number.MIN_VALUE);
			let minLc1 = new Decimal(Number.MAX_VALUE);
			let minLc2 = new Decimal(Number.MAX_VALUE);

			for (const otherRepInfo of repDict.values()) {
				if (otherRepInfo.d <= repInfo.d) continue;
				const gpLinked = gpDict.get(otherRepInfo.lnkObjId);
				if (!gpLinked) continue;

				if (otherRepInfo.lineCoord.lessThan(repInfo.lineCoord)) {
					maxLc1 = Decimal.max(maxLc1, otherRepInfo.lineCoord);
					maxLc2 = Decimal.max(maxLc2, gpLinked.lineCoord);
				} else {
					minLc1 = Decimal.min(minLc1, otherRepInfo.lineCoord);
					minLc2 = Decimal.min(minLc2, gpLinked.lineCoord);
				}
			}

			let lCoeff = new Decimal(0);
			let rCoeff = new Decimal(0);

			const gpCurrent = gpDict.get(repInfo.lnkObjId);
			if (!gpCurrent) continue;

			if (!maxLc1.equals(new Decimal(Number.MIN_VALUE))) {
				const d1 = repInfo.lineCoord.minus(maxLc1);
				const d2 = gpCurrent.lineCoord.minus(maxLc2);
				const dSum = d1.plus(d2);
				if (!dSum.isZero()) {
					lCoeff = d1.minus(d2).div(dSum);
				}
			}

			if (!minLc1.equals(new Decimal(Number.MAX_VALUE))) {
				const d1 = minLc1.minus(repInfo.lineCoord);
				const d2 = minLc2.minus(gpCurrent.lineCoord);
				const dSum = d1.plus(d2);
				if (!dSum.isZero()) {
					rCoeff = d1.minus(d2).div(dSum);
				}
			}

			const coeff = Decimal.abs(lCoeff.minus(rCoeff));
			if (coeff.lessThanOrEqualTo(0.01) && Decimal.abs(lCoeff).lessThan(0.5)) {
				resTab.rows.push({
					REPER_ID: String(repInfo.objId),
					FACILITY_ID: String(repInfo.lnkObjId),
					COEFF: coeff.toString(),
				});
			}
		}
	}
}
