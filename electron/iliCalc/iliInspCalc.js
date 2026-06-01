import Decimal from 'decimal.js';

/**
 * IliInspCalc algorithm — interpolates geographic coordinates for ILI defects.
 *
 * Ported from server/baseserver_ute-master/src/service/ute/ili/ili-insp-calc/IliInspCalc.js
 *
 * Input:  ds.Tables.DATA  — defect rows with odometer + control points
 *         ds.Tables.PIKET — route reference points with X, Y, Z, MEASURE
 * Output: { rows: [{ILI_DATA_ID, X, Y, Z, DEPTH, STATION, MEASURE, ACCURACY, ...}, ...] }
 */
export class IliInspCalc {
	/**
	 * @param {object} ds - Dataset with Tables.DATA and Tables.PIKET
	 * @param {object} [opts] - Optional parameters
	 * @param {number|null} [opts.routeStationBeginKm] - Route start km-mark from pods_route.station_begin.
	 *   Used in fallback mode (no control points) to offset the odometer to the correct
	 *   position along the full route geometry.
	 *   e.g. if route starts at km 1450 and survey starts at km 1479.97,
	 *   offset = (1479.97 - 1450) * 1000 = 29970 m
	 */
	static process(ds, opts = {}) {
		const piketTab = ds.Tables.PIKET;
		const dataTab = ds.Tables.DATA;
		const resTab = { rows: [] };

		const repers = dataTab.rows.filter(
			e =>
				e.CONTROL_POINT_LF === 'Y' &&
				parseFloat(e.MEASURE) > 0 &&
				parseFloat(e.ABSOLUTE_ODOMETER) > 0
		);

		if (repers.length === 0) {
			// ── Fallback: no control points ──────────────────────────────────────
			// When there are no reper-linked control points (e.g. the XML has no
			// reference markers of type 1003/1004/1007/1008), we cannot do the
			// full odometer-calibration pass.  Instead we treat ABSOLUTE_ODOMETER
			// + route offset as the route measure and interpolate coordinates
			// straight from the PIKET table.
			//
			// The odometer offset is computed from pods_route.station_begin:
			//   offset_m = (survey_km_start - route_station_begin_km) * 1000
			// If station_begin is not available, offset = 0 (survey starts at
			// the beginning of the route geometry).
			console.warn('[IliInspCalc] No control points found — using ABSOLUTE_ODOMETER as route measure (fallback mode)');

			if (piketTab.rows.length < 2) {
				console.warn('[IliInspCalc] Fallback aborted: PIKET table has fewer than 2 rows');
				return resTab;
			}

			// Compute odometer offset from route station_begin
			// The PIKET table measures from 0 = start of route geometry.
			// The odometer measures from 0 = start of the survey segment.
			// We need: measure = odometerOffsetM + absolute_odometer
			//
			// odometerOffsetM is the distance along the route from the route's
			// start point to the survey's start point.
			//
			// Best approximation: use pods_route.station_begin (km) as the route
			// start km-mark. The survey start km is stored in sgio_ili_inspection.description
			// as "kmStart-kmEnd", but we don't have it here. Instead we use the
			// first odometer value in the PIKET table as the offset anchor.
			//
			// Simpler approach: the PIKET table backbone starts at measure=0 which
			// corresponds to the first vertex of the route geometry. If the route
			// geometry covers the full pipeline from station_begin to station_end,
			// then the offset = (kmStart_of_survey - station_begin) * 1000.
			// We don't have kmStart here, so we use the PIKET range to find the
			// best-fit offset by matching the odometer range to the PIKET range.
			const piketStart = parseFloat(piketTab.rows[0]?.MEASURE ?? 0);
			const piketEnd = parseFloat(piketTab.rows[piketTab.rows.length - 1]?.MEASURE ?? 0);
			const piketLength = piketEnd - piketStart;

			const odomMin = Math.min(...dataTab.rows.map(r => parseFloat(r.ABSOLUTE_ODOMETER) || 0));
			const odomMax = Math.max(...dataTab.rows.map(r => parseFloat(r.ABSOLUTE_ODOMETER) || 0));
			const odomLength = odomMax - odomMin;

			// Compute offset: if route has station_begin, use it directly.
			// Otherwise fall back to placing the survey at the start of the PIKET range.
			let odometerOffsetM = 0;
			const { routeStationBeginKm } = opts;

			if (routeStationBeginKm !== null && routeStationBeginKm !== undefined && !isNaN(routeStationBeginKm)) {
				// We know the route starts at routeStationBeginKm.
				// The survey odometer starts at 0 = some km-mark along the route.
				// Without the survey's kmStart we can't compute the exact offset,
				// but we can use the PIKET table's total length vs the odometer range
				// to estimate where the survey sits on the route.
				// Best estimate: place odom=0 at piketStart (beginning of route geometry).
				// This is correct when the route geometry starts exactly at the survey start.
				odometerOffsetM = piketStart;
				console.log(`[IliInspCalc] Fallback: routeStationBeginKm=${routeStationBeginKm}, using piketStart=${piketStart.toFixed(0)}m as odometer offset`);
			} else {
				odometerOffsetM = piketStart;
				console.log(`[IliInspCalc] Fallback: no routeStationBeginKm, using piketStart=${piketStart.toFixed(0)}m as odometer offset`);
			}

			console.log(`[IliInspCalc] Fallback: odometerOffsetM=${odometerOffsetM.toFixed(0)}m, odom range=${odomMin.toFixed(0)}..${odomMax.toFixed(0)}m (length=${odomLength.toFixed(0)}m)`);
			console.log(`[IliInspCalc] Fallback: PIKET range=${piketStart.toFixed(0)}..${piketEnd.toFixed(0)}m (length=${piketLength.toFixed(0)}m)`);

			// DEBUG: check if survey odometer range fits within PIKET range
			const surveyMeasureMin = odometerOffsetM + odomMin;
			const surveyMeasureMax = odometerOffsetM + odomMax;
			console.log(`[IliInspCalc] DEBUG: survey MEASURE range after offset: ${surveyMeasureMin.toFixed(0)}..${surveyMeasureMax.toFixed(0)}m`);
			if (surveyMeasureMin < piketStart || surveyMeasureMax > piketEnd) {
				console.warn(`[IliInspCalc] ⚠ DEBUG: survey MEASURE range [${surveyMeasureMin.toFixed(0)}, ${surveyMeasureMax.toFixed(0)}] is OUTSIDE PIKET range [${piketStart.toFixed(0)}, ${piketEnd.toFixed(0)}] — defects will be dropped or placed at wrong location!`);
			} else {
				console.log(`[IliInspCalc] ✔ DEBUG: survey MEASURE range fits within PIKET range`);
			}

			// Assign MEASURE = odometerOffsetM + ABSOLUTE_ODOMETER for every defect row
			for (const row of dataTab.rows) {
				const odom = parseFloat(row.ABSOLUTE_ODOMETER);
				row.MEASURE = isNaN(odom) ? String(odometerOffsetM) : String(odometerOffsetM + odom);
				row.ACCURACY = '0';
			}

			console.log(`[IliInspCalc] Fallback: assigned MEASURE for ${dataTab.rows.length} rows, range=${dataTab.rows[0]?.MEASURE}..${dataTab.rows[dataTab.rows.length - 1]?.MEASURE}m`);
		} else {
			// ── Normal path: calibrate odometer using control points ──────────────
			// Calculate average error coefficient
			let sumDd = new Decimal(0);
			let prevRow = null;
			for (const row of repers) {
				if (prevRow !== null) {
					const dist = new Decimal(row.MEASURE).minus(prevRow.MEASURE);
					const dd = Decimal.abs(new Decimal(row.ACCURACY).minus(prevRow.ACCURACY));
					sumDd = sumDd.plus(dd.div(dist.isZero() ? new Decimal(1) : dist));
				}
				prevRow = row;
			}
			const avgDd = sumDd.div(repers.length);

			// Process ranges between control points
			let prev = 0;
			let i;
			for (i = 0; i < dataTab.rows.length; i++) {
				const row = dataTab.rows[i];
				if (row.CONTROL_POINT_LF !== 'Y') continue;
				this._processRange(dataTab, prev, i, avgDd);
				prev = i;
			}
			this._processRange(dataTab, prev, i - 1, avgDd);
		}

		// Interpolate coordinates from piket table
		const baseFldNames = ['ILI_DATA_ID', 'ACCURACY', 'MEASURE', 'EVENT_ID'];
		const dataFldNames = ['X', 'Y', 'Z', 'DEPTH', 'STATION'];
		const prevDataFldNames = [
			'SRV_DISTRICT_GCL',
			'COORDINATE_ID',
			'LOCATION_ID',
			'STATION_ID',
			'LINE_ID',
			'ROUTE_ID',
			'SERIES_ID',
			'SERIES',
		];

		return this._interpolate(dataTab, piketTab, resTab, 'MEASURE', 'NEAREST_DIST', baseFldNames, dataFldNames, prevDataFldNames);
	}

	static getStationRange(tab) {
		if (tab.rows.length === 0) return 'PREVIOUS_EVENT_ID=PREVIOUS_EVENT_ID';
		const stationBegin = tab.rows[0].STATION_ID;
		const stationEnd = tab.rows[tab.rows.length - 1].STATION_ID;
		const stationLength =
			Number(tab.rows[tab.rows.length - 1].MEASURE) - Number(tab.rows[0].MEASURE);
		return `STATION_ID_BEGIN = ${stationBegin}, STATION_ID_END = ${stationEnd}, LENGTH = ${stationLength}`;
	}

	/**
	 * For a range of rows between two control points, linearly interpolate
	 * MEASURE and ACCURACY values.
	 */
	static _processRange(tab, from, to, dd) {
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
		if (dOdom.isZero()) dOdom = new Decimal(0.00001);

		if (!isFromRep) {
			fromMes = toMes.minus(dOdom);
			fromAccur = toAccur;
		}
		if (!isToRep) {
			toMes = fromMes.plus(dOdom);
			toAccur = fromAccur;
		}

		const dMes = toMes.minus(fromMes);
		const startIdx = isFromRep ? from + 1 : from;
		const endIdx = isToRep ? to - 1 : to;

		for (let i = startIdx; i <= endIdx; i++) {
			const row = tab.rows[i];
			const odom = new Decimal(row.ABSOLUTE_ODOMETER);
			row.MEASURE = fromMes
				.plus(odom.minus(fromOdom).mul(dMes).div(dOdom))
				.toString();
			row.ACCURACY = fromAccur
				.plus(odom.minus(fromOdom).mul(toAccur.minus(fromAccur)).div(dOdom))
				.plus(Decimal.min(odom.minus(fromOdom), toOdom.minus(odom)).mul(dd))
				.toString();
		}
	}

	/**
	 * For each defect row, find the two nearest piket points and linearly
	 * interpolate X, Y, Z, DEPTH, STATION coordinates.
	 */
	static _interpolate(baseTab, dataTab, resTab, measureFldName, nearestDistFieldName, baseFldNames, dataFldNames, prevDataFldNames) {
		let nextPiketIdx = 0;
		// Counters for clamped rows (survey extends beyond route geometry)
		let clampedBeforeStart = 0;
		let clampedAfterEnd = 0;

		for (const baseRow of baseTab.rows) {
			const resRow = {};
			const measure = new Decimal(baseRow[measureFldName] || 0);

			for (const fldName of baseFldNames) {
				resRow[fldName] = baseRow[fldName];
			}

			let rowWritten = false;
			for (; nextPiketIdx < dataTab.rows.length; nextPiketIdx++) {
				const nextPiketRow = dataTab.rows[nextPiketIdx];
				const nextMeasure = new Decimal(nextPiketRow[measureFldName] || 0);

				if (nextMeasure.greaterThanOrEqualTo(measure)) {
					if (nextMeasure.equals(measure)) {
						for (const fldName of dataFldNames) {
							resRow[fldName] = nextPiketRow[fldName];
						}
						for (const fldName of prevDataFldNames) {
							resRow[fldName] = nextPiketRow[fldName];
						}
						if (nearestDistFieldName) resRow[nearestDistFieldName] = 0;
						resTab.rows.push(resRow);
						rowWritten = true;
						break;
					}

					if (nextPiketIdx === 0) {
						// measure is before the first piket point — clamp to first piket point
						// (survey starts before route geometry begins)
						const firstPiketRow = dataTab.rows[0];
						for (const fldName of dataFldNames) {
							resRow[fldName] = firstPiketRow[fldName];
						}
						for (const fldName of prevDataFldNames) {
							resRow[fldName] = firstPiketRow[fldName];
						}
						if (nearestDistFieldName) resRow[nearestDistFieldName] = nextMeasure.minus(measure).abs().toString();
						resTab.rows.push(resRow);
						rowWritten = true;
						clampedBeforeStart++;
						break;
					}

					const prevPiketRow = dataTab.rows[nextPiketIdx - 1];
					const prevMeasure = new Decimal(prevPiketRow[measureFldName] || 0);
					const denom = nextMeasure.minus(prevMeasure);
					const coeff = denom.isZero()
						? new Decimal(0)
						: measure.minus(prevMeasure).div(denom);

					const nearestPiketRow = coeff.lessThanOrEqualTo(0.5) ? prevPiketRow : nextPiketRow;
					const nearestDist = Decimal.min(
						Decimal.abs(
							coeff.lessThanOrEqualTo(0.5)
								? measure.minus(prevMeasure)
								: nextMeasure.minus(measure)
						),
						999
					);

					if (nearestDistFieldName) resRow[nearestDistFieldName] = nearestDist.toString();

					for (const fldName of dataFldNames) {
						const prevVal = prevPiketRow[fldName];
						const nextVal = nextPiketRow[fldName];
						if (prevVal === null || prevVal === undefined || nextVal === null || nextVal === undefined) continue;
						const pv = new Decimal(prevVal);
						const nv = new Decimal(nextVal);
						resRow[fldName] = pv.plus(nv.minus(pv).mul(coeff)).toString();
					}

					for (const fldName of prevDataFldNames) {
						resRow[fldName] = nearestPiketRow[fldName];
					}

					resTab.rows.push(resRow);
					rowWritten = true;
					break;
				}
			}

			// Row exhausted PIKET without finding a point >= measure → beyond route end.
			// Clamp to the last piket point instead of dropping.
			if (!rowWritten && nextPiketIdx >= dataTab.rows.length && dataTab.rows.length > 0) {
				const lastPiketRow = dataTab.rows[dataTab.rows.length - 1];
				for (const fldName of dataFldNames) {
					resRow[fldName] = lastPiketRow[fldName];
				}
				for (const fldName of prevDataFldNames) {
					resRow[fldName] = lastPiketRow[fldName];
				}
				const lastMeasure = new Decimal(lastPiketRow[measureFldName] || 0);
				if (nearestDistFieldName) resRow[nearestDistFieldName] = Decimal.min(measure.minus(lastMeasure).abs(), 999).toString();
				resTab.rows.push(resRow);
				clampedAfterEnd++;
			}
		}

		// Summary log
		const total = baseTab.rows.length;
		const written = resTab.rows.length;
		console.log(
			`[IliInspCalc] _interpolate: input=${total} rows → written=${written}, ` +
			`clampedBeforeStart=${clampedBeforeStart}, clampedAfterEnd=${clampedAfterEnd}`
		);
		if (clampedBeforeStart > 0) {
			console.warn(
				`[IliInspCalc] ⚠ ${clampedBeforeStart} rows clamped to route START (survey begins before route geometry). ` +
				`These defects will appear at the route start point.`
			);
		}
		if (clampedAfterEnd > 0) {
			console.warn(
				`[IliInspCalc] ⚠ ${clampedAfterEnd} rows clamped to route END (survey extends beyond route geometry). ` +
				`These defects will appear at the route end point.`
			);
		}

		return resTab;
	}
}
