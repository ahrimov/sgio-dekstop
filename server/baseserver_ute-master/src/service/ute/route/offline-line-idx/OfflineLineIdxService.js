const { lang, errors } = require("../../../../resources");
const { ErrorHandler, config, logger } = require("gis-core");
const DB = require("../../db");
const OfflineLineIdx = require("./OfflineLineIdx");
/**
 * Класс для привязки вдольтрассовых объектов
 */
class OfflineLineIdxService {
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
		// iterate_lines|
			// delete_links|
			// load_line|
			// prepare_meta|
			// iterate_rows
				// proj_data
		// begin_transaction|
			// update_obj|
		// commit_transaction
		let connection = DB.createConnection();

		logger.info(`proc_start : load_geo`);
		let layer = await DB.geoReader('UTE_SEM.xml#OFFLINE_OFFLINE_LINE_IDX_C_3', 'select', params, true, 'ID,P_ID', 'WKB_GEOMETRY', null, connection);
		ds.Tables.LAYER = layer;
		logger.info(`proc_end : load_geo`);

		logger.info(`proc_start : load_lines`);
		let lines = await DB.dbReader('UTE_SEM.xml#OFFLINE_OFFLINE_LINE_IDX_C_1', 'select', params, null, connection);
		logger.info(`proc_end : load_lines`);
		for(let line of lines.rows){ //upd 2021 выбор нескольких линий в клиенте реализован через отдельный вызов функции с передачей одного идентификатора линии
			params.data['xpath_view.SEL_LINE.LINE_ID'] = line.LINE_ID;

			logger.info(`proc_start : delete_links`);
			await DB.dbCommand('UTE_SEM.xml#OFFLINE_OFFLINE_LINE_IDX_C_2', 'update', params, null, connection);
			logger.info(`proc_end : delete_links`);

			params.data['xpath_view.SEL_LINE.TYPE_CL'] = line.TYPE_CL;
			logger.info(`proc_start : load_line`);
			let axesPoints = await DB.dbReader('UTE_SEM.xml#OFFLINE_OFFLINE_LINE_IDX_C_5', 'select', params, null, connection);
			ds.Tables.AXES_POINTS = axesPoints;
			logger.info(`proc_end : load_line`);
			let meta = {
				justBounds: false,
				bufferWidth: params.bufferWidth,
				measureField: 'MEASURE',
				seqField: 'SEQUENCE',
				valFields: 'MEASURE,STATION,Z,DEPTH_OF_COVER',
				infoFields: 'SEQUENCE,N_MEASURE,SRV_DISTRICT_GCL,LINE_ID,ROUTE_ID,SERIES_ID,SERIES,STATION_ID',
			};
			let offlineLineIdx = new OfflineLineIdx();
			offlineLineIdx.process(ds.Tables.LAYER, ds.Tables.AXES_POINTS, meta);
		}
		let transaction = await DB.beginTransaction(connection);
		logger.info(`proc_start : update_obj`);
		await DB.dbWriter('UTE_SEM.xml#OFFLINE_OFFLINE_LINE_IDX_C_4', 'insert', ds.Tables.LAYER, params, transaction, connection);
		logger.info(`proc_end : update_obj`);

		await DB.commitTransaction(transaction);
		await DB.closeConnection(connection);

		logger.info(`proc_end : process_data`);
		return { status: 200 };
	}
}
module.exports = OfflineLineIdxService;
