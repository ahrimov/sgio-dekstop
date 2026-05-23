const Decimal = require('decimal.js');

class KmRouteCalc {
    static process(ds) {
        const kmRouteTab = ds.Tables.STATION_POINT;
        let prev = 0;
        let i;
        // Проход по всем диапазонам между базовыми точками
        for (i = 0; i < kmRouteTab.rows.length; i++) {
            const row = kmRouteTab.rows[i];
            if (row.TYPE_CL.toString() !== 'ST_POINT_TYPE_03') // if(row["TYPE_CL"].ToString()!=="ST_POINT_TYPE_03")
            { continue; }
            this.processRange(kmRouteTab, prev, i);
            prev = i;
        }
        this.processRange(kmRouteTab, prev, i - 1);
        kmRouteTab.rows = kmRouteTab.rows.filter((item) => item.TYPE_CL !== 'ST_POINT_TYPE_03');
        return kmRouteTab;
    }

    static processRange(tab, from, to) {
        if (to <= from) return;
        const fromRow = tab.rows[from];
        const toRow = tab.rows[to];
        const fromMes = Number(fromRow.MEASURE); // decimal fromMes = (decimal) fromRow["MEASURE"];
        const toMes = Number(toRow.MEASURE);
        const fromKm = Number(fromRow.STATION);
        const toKm = Number(toRow.STATION); // decimal toKm = (decimal)toRow["STATION"];
        const dMes = toMes - fromMes;
        const dKM = toKm - fromKm;
        for (let i = from + 1; i < to; i++) {
            const row = tab.rows[i];
            const mes = Number(row.MEASURE);
            let km = mes === fromMes ? fromKm : Math.round((fromKm + (mes - fromMes) * dKM / dMes) * 10) / 10; // decimal km = mes==fromMes ? fromKm : Math.Round(fromKm + (mes - fromMes) * dKm / dMes, 1);
            km = Number(km);
            if (new Decimal(row.STATION).minus(km).abs().lessThan(0.1))// if(Math.Abs((decimal)row["STATION"]-km)<0.1m)
            { row.TYPE_CL = 'ST_POINT_TYPE_03'; } else row.STATION = km;
        }
    }
}
module.exports = KmRouteCalc;
