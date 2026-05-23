const gdal = require('gdal');

class GroupRouteIdx {
    process(bufs, objs) {
        const meta = {
            infoFields: 'EVENT_ID',
            cntField: 'CNT',
        };
        this.intersectObjects(bufs, objs, meta);
    }

    intersectObjects(bufs, objs, meta) {
        const infoFields = meta.infoFields.split(',');
        for (const bufRow of bufs.rows) {
            if (!bufRow.WKB_GEOMETRY) continue;

            const bufMinX = bufRow.MINX;
            const bufMinY = bufRow.MINY;
            const bufMaxX = bufRow.MAXX;
            const bufMaxY = bufRow.MAXY;

            const bufGeom = bufRow.WKB_GEOMETRY;

            for (const objRow of objs.rows) {
                if (!objRow.WKB_GEOMETRY) continue;

                const objMinX = objRow.MINX;
                const objMinY = objRow.MINY;
                const objMaxX = objRow.MAXX;
                const objMaxY = objRow.MAXY;

                if (bufMaxX <= objMinX || bufMaxY <= objMinY || bufMinX >= objMaxX || bufMinY >= objMaxY) continue;

                const objGeom = objRow.WKB_GEOMETRY;
                const oG = gdal.Geometry.fromWKB(objGeom);
                const bG = gdal.Geometry.fromWKB(bufGeom);
                // проверяем пересечение средставими gdal
                if (!bG.intersects(oG)) continue; // пропускаем точку не попавшую в буффер

                for (const fldName of infoFields) objRow[fldName] = bufRow[fldName];
            }
        }
    }
}
module.exports = GroupRouteIdx;
