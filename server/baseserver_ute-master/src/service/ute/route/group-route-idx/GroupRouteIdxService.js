const { lang, errors } = require("../../../../resources");
const { ErrorHandler, config, logger } = require("gis-core");
const DB = require("../../db");
const GroupRouteIdx = require("./GroupRouteIdx");
/**
 * Сервис для группировки пересекаемых объектов
 */
class GroupRouteIdxService {
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
		// load_data|
		// load_objects|
		// intersect|
		// update_obj

		let connection = DB.createConnection();

		logger.info(`proc_start : load_data`);
		let shapes = await DB.geoReader('UTE_SEM.xml#GROUP_GROUP_IDX_C_4', 'select', params, true, 'EVENT_ID,P_ID', 'WKB_GEOMETRY', null, connection);
		ds.Tables.SHAPES = shapes;
		logger.info(`proc_end : load_data`);

		logger.info(`proc_start : load_objects`);
		//использовалось в "Группировка: Индексация отдельных объектов" - GROUP_EVENT_Idx.xml
		let objects = await DB.geoReader('UTE_SEM.xml#GROUP_GROUP_IDX_C_2', 'select', params, true, 'ID', 'WKB_GEOMETRY', null, connection);
		ds.Tables.OBJECTS = objects;
		logger.info(`proc_end : load_objects`);

		logger.info(`proc_start : intersect`);
		let groupRouteIdx = new GroupRouteIdx();
		groupRouteIdx.process(ds.Tables.SHAPES, ds.Tables.OBJECTS);
		logger.info(`proc_end : intersect`);

		let transaction = await DB.beginTransaction(connection);
		logger.info(`proc_start : update_obj`);
		await DB.dbWriter('UTE_SEM.xml#GROUP_GROUP_IDX_C_3', 'insert', ds.Tables.OBJECTS, params, transaction, connection);
		logger.info(`proc_end : update_obj`);

		await DB.commitTransaction(transaction);
		await DB.closeConnection(connection);
		logger.info(`proc_end : process_data`);
		return { status: 200 };
	}
}
module.exports = GroupRouteIdxService;
