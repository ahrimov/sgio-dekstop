const { lang, errors } = require("../../../../resources");
const { ErrorHandler, config, logger } = require("gis-core");
const DB = require("../../db");
const LineRouteIdx = require("./LineRouteIdx");
/**
 * Класс для привязки трассовых объектов
 */
class LineRouteIdxService {
	/**
   *
   * @param {*} req
   * @returns
   */
	static async call(req) {
		logger.info(`proc_start : process_data`);
		const params = req.uteParams;
		let ds = {
			Tables: {}
		};
		//UTEService process=
		// load_geo|
		// iterate_routes|
			// load_route|
			// prepare_meta|
			// iterate_rows
				//proj_data
		// begin_transaction|
			// update_obj|
		// commit_transaction

		let connection = DB.createConnection();

		logger.info(`proc_start : load_geo`);
		let layer = await DB.geoReader('UTE_SEM.xml#LINE_LINE_ROUTE_IDX_C_2', 'select', params, true, 'STATION_ID', 'WKB_GEOMETRY', null, connection);
		ds.Tables.LAYER = layer;
		logger.info(`proc_end : load_geo`);

		logger.info(`proc_start : iterate_routes`);
		logger.info(`proc_start : load_routes`);
		let routes = await DB.dbReader('UTE_SEM.xml#LINE_LINE_ROUTE_IDX_C_1', 'select', params, null, connection);
		logger.info(`proc_end : load_routes`);
		for(let route of routes.rows){
			params.data['xpath_view.SEL_ROUTE.SERIES_ID'] = route.SERIES_ID;

			logger.info(`proc_start : load_route`);
			//AXES_POINTS:по каждому из ROUTE: select(UTE_SEM.xml#LINE_LINE_ROUTE_IDX_C_4) и по каждому элементу(лимит 50000)
			let axesPoints = await DB.dbReader('UTE_SEM.xml#LINE_LINE_ROUTE_IDX_C_4', 'select', params, null, connection);
			ds.Tables.AXES_POINTS = axesPoints;
			logger.info(`proc_end : load_route`);

			//ASL.PipeSystem.IndexTools.Corridor метод ProjectObjects  из ASL.PipeSystem.IndexTools.dll
			let meta = {
				axeId: route.SERIES_ID,
				bufferWidth: params.bufferWidth,
				measureField: 'MEASURE',
				seqField: 'AXE_ID',
				valFields: 'STATION,MEASURE',
				infoFields: 'LINE_ID,ROUTE_ID,SERIES_ID',
			};
			let lineRouteIdx = new LineRouteIdx();
			lineRouteIdx.process(ds.Tables.LAYER, ds.Tables.AXES_POINTS, meta);
		}
		logger.info(`proc_end : iterate_routes`);
		let transaction = await DB.beginTransaction(connection);
		logger.info(`proc_start : update_obj`);
		await DB.dbWriter('UTE_SEM.xml#LINE_LINE_ROUTE_IDX_C_3', 'insert', ds.Tables.LAYER, params, transaction, connection);
		logger.info(`proc_end : update_obj`);

		await DB.commitTransaction(transaction);
		await DB.closeConnection(connection);

		logger.info(`proc_end : process_data`);
		return { status: 200 };
	}
}
module.exports = LineRouteIdxService;
