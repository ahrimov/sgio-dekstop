/**
 * Представляет операции для работы с объектами линейной привязки.
 */
class LinearOp {
    /**
	 * Проецирует точку на линейный объект.
	 * @param geom Линейный объект.
	 * @param pt Точка.
	 * @returns {*} Позиция спроецированной точки на линейном объекте.
	 */
    static project(geom, pt) {
        // Создание геометрии с линейной привязкой
        const linearGeom = new LengthIndexedLine(geom);

        // Проекция точки
        const index = linearGeom.project(pt);

        // Определение положения точки на линейном объекте
        const loc = this.getLocation(geom, index);
        return loc;
    }

    /**
	 * Извлекает отрезок с линейной привязки из линейного объекта в указанной позиции.
	 * @param geom Линейный объект.
	 * @param loc Позиция отрезка.
	 * @returns {LinearSegment} Отрезок линейной привязки.
	 */
    static getLinearSegment(geom, loc) {
        const lineComp = geom.GetGeometryN(loc.ComponentIndex);

        let segmIndex = loc.SegmentIndex;
        // Проверка индекса отрезка линии
        if (loc.SegmentIndex >= lineComp.NumPoints - 1) segmIndex = lineComp.NumPoints - 2;
        // Trace.WriteLine(string.Format("Loc used: {0}, {1}, {2}",
        //    loc.ComponentIndex, loc.SegmentIndex, loc.SegmentFraction),
        //    "debug");
        // Получение координат отрезка
        const p0 = lineComp.GetCoordinateN(segmIndex);
        const p1 = lineComp.GetCoordinateN(segmIndex + 1);

        const segment = new LinearSegment(p0, p1);

        return segment;
    }
}
module.exports = LinearOp;
