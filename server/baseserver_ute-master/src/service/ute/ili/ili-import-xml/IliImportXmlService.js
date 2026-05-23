const path = require('path');
const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const {lang, errors} = require("../../../../resources");
const {ErrorHandler, config, logger} = require("gis-core");
const DB = require('../../db');
const IOUtils = require("../../../../utils/IOUtils");
const IliImportXml = require('./IliImportXml');
const LinkRepersService = require("../ili-insp-link/LinkRepersService");
const IliInspCalcService = require("../ili-insp-calc/IliInspCalcService");
const IliClusterService = require("../ili-cluster/IliClusterService");
const IliPressureService = require("../ili-pressure/IliPressureService");
const StoIliInspService = require("../sto-ili-insp-proc/StoIliInspService");
const StoEnzInspService = require("../sto-ehz-insp-proc/StoEnzInspService");
/**
 * Импорт отчетов XML
 */
class IliImportXmlService {
	static async call(req) {
		//Процессы загрузки и обработки ВТД, главный уровень
		//UTEService process=
		// load_types|
		// sub_template|
		// check_anomaly_types|
		// set_weld_nums|
		// begin_transaction|
		//      set_srv_district_id|
		// 		upload_report|
		//          get_first_weld_number|
		//          create_report|
		//          load_ili_data
		// 		postprocess_report|
		//          prepare_data|
		//          set_weld_nums_old|
		//          prepare_pipe_len
		// commit_transaction|
		// calc_report|
		//      set_params|
		//      load_repers|
		//      link_repers|
		//      load_def|
		//      calc_def
		// delete_folder|
		// delete_xml_file"/>
		logger.info(`proc_start : process_data`);
		let params = req.uteParams;

		let connection = DB.createConnection();


		let iliImportXml = new IliImportXml();
		let ds = {
			Tables:{}
		};
		logger.info('status : Получение идентификатора участка');

		logger.info('proc_start : load_types');
		logger.info('status : Загружаю справочник аномалий');
		let iliAnomalyTypeClData = await DB.dbReader('UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_9','select',  params, null, connection);
		ds.Tables.ILI_ANOMALY_TYPE_CL = iliAnomalyTypeClData;
		logger.info('proc_end : load_types');

		ds.Tables.PODS_ILI_DATA = DB.createEmptyTable();

		logger.info('proc_start : sub_template');
		let iliFileName = path.join(config.ROOT_PATH/*, config.Upload_Path*/, params.xmlFileName);

		logger.info(`status : Чтение оригинального файла ${iliFileName}`);
		let defects = await this.parseSourceFile(iliFileName);
		if(defects && defects.root && defects.root.length > 0)
			ds.Tables.PODS_ILI_DATA.rows = defects.root[0].defects;

		logger.info('proc_end : sub_template');

		logger.info('proc_start : check_anomaly_types');
		logger.info(`status : Проверяю типы аномалий`);
		let checkAnomalyTypes = iliImportXml.checkAnomalyTypes(ds.Tables.PODS_ILI_DATA, ds.Tables.ILI_ANOMALY_TYPE_CL );
		logger.info('proc_end : check_anomaly_types');

		logger.info('proc_start : set_weld_nums');
		logger.info(`status : Проставляю на швах номера информацию о следующем шве. Новая простановка через c# SetWeldNums`);
		ds.Tables.PODS_ILI_DATA = iliImportXml.setWeldNums(ds.Tables.PODS_ILI_DATA);
		logger.info('proc_end : set_weld_nums');

		// расчет ВТД
		if(checkAnomalyTypes){
			logger.info('proc_start : set_srv_district_id');
			logger.info(`status : Проставляю идентификторы ЛПУ`);
			await iliImportXml.setSrvDistrictId(ds.Tables.PODS_ILI_DATA, null, connection);
			logger.info('proc_end : set_srv_district_id');
		}
		else{
			logger.info(`status : Пропускается [set_srv_district_id]. Не выполнено условие запуска`);
		}

		//Загрузка данных отчета в БД  on_process="get_first_weld_number|create_report|load_ili_data"
		logger.info('proc_start : upload_report');
		if(checkAnomalyTypes){
			logger.info('proc_start : get_first_weld_number');
			let firstWeldNumber = iliImportXml.getFirstWeldNumber(ds.Tables.PODS_ILI_DATA);
			if(params && params.data){
				params.data['call_complex_method.FIRST_WELD_NUMBER'] = firstWeldNumber;
				params.data['call_complex_method_err.FIRST_WELD_NUMBER'] = firstWeldNumber;
			}
			logger.info('proc_end : get_first_weld_number');
		}
		else{
			logger.info(`status : Пропускается [get_first_weld_number]. Не выполнено условие запуска`);
		}

		let transaction = await DB.beginTransaction(connection);
		if(checkAnomalyTypes){
			logger.info('proc_start : create_report');
			logger.info(`status : Создаю записи самого отчета route_id=[${params.data.ROUTE}]`);
			if(params && params.data){
				params.data.ROUTE_ID = params.data.ROUTE;
				params.data.EVENT_ID = -50;
			}
			let queryData = await DB.dbCommand('UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_7','update',  params, transaction, connection);
			if(params && params.data){
				params.data['EVENT_ID'] = queryData.outputParams.EVENT_ID;
				params.data['ILI_INSPECTION_ID'] = queryData.outputParams.ILI_INSPECTION_ID;
				params.data['db_command.CMD.ILI_INSPECTION_ID'] = queryData.outputParams.ILI_INSPECTION_ID;
				logger.info(`status : Идентификатор отчета ILI_INSPECTION_ID=[${queryData.outputParams.ILI_INSPECTION_ID}]`);
			}
			logger.info('proc_end : create_report');
		}
		else{
			logger.info(`status : Пропускается [create_report]. Не выполнено условие запуска`);
		}

		if(checkAnomalyTypes){
			logger.info('proc_start : load_ili_data');
			logger.info(`status : Вставка дефектов`);
			await DB.dbWriter('UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_8','insert', ds.Tables.PODS_ILI_DATA, params, transaction, connection);
			logger.info('proc_end : load_ili_data');
		}
		else{
			logger.info(`status : Пропускается [load_ili_data]. Не выполнено условие запуска`);
		}
		logger.info('proc_end : upload_report');

		//Постобработка данных отчета в БД и расчет отчета   on_process="prepare_data|set_weld_nums_old|prepare_pipe_len"
		logger.info('proc_start : postprocess_report');
		if(checkAnomalyTypes){
			logger.info('proc_start : prepare_data');
			logger.info(`status : Заполнение ANOMALY_EXTENSION_CL`);
			await DB.dbCommand('UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_1','update',  params, transaction, connection);
			logger.info(`status : Проставляю на швах номера предыдущих швов и дистанцию до них`);
			//Не используется в UTEService ILI_ILI_ZIP_IMP_C_55_2, ILI_ILI_ZIP_IMP_C_55_3. Ранее был MERGE
			//Заменено через SetWeldNums
			logger.info('proc_end : prepare_data');
		}
		else{
			logger.info(`status : Пропускается [prepare_data]. Не выполнено условие запуска`);
		}

		if(checkAnomalyTypes) {
			logger.info('proc_start : set_weld_nums_old');
			logger.info(`status : Простановка на дефектах и особеностях номеров швов, дистанций до швов. Старая простановка через SQL`);
			await DB.dbCommand('UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_4', 'update', params, transaction, connection);
			logger.info('proc_end : set_weld_nums_old');
		}
		else{
			logger.info(`status : Пропускается [set_weld_nums_old]. Не выполнено условие запуска`);
		}

		if(checkAnomalyTypes) {
			logger.info('proc_start : prepare_pipe_len');
			await DB.dbCommand('UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_5', 'update', params, transaction, connection);
			logger.info('proc_end : prepare_pipe_len');
		}
		else{
			logger.info(`status : Пропускается [prepare_pipe_len]. Не выполнено условие запуска`);
		}
		logger.info('proc_end : postprocess_report');

		//Расчет Расчет ВТД
		if(params.do_calc_inspection){
			//В UTE_SEM поменять название параметра(фигурные скобки) {db_command.CMD.ILI_INSPECTION_ID}
			let routeId = await DB.dbScalarReader('UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_0','select',  params, 'ROUTE_ID', transaction, connection);
			if (routeId === undefined){
				throw new ErrorHandler(errors.gis_core_calc_1, routeId);
			}
			else{
				params.data.ROUTE_ID_NEW = routeId;
			}

			logger.info('proc_start : calc_report');
			logger.info('proc_start : set_params');
			if(params && params.data){
				if(params.data.ROUTE_ID_NEW){
					params.data.P_ROUTE_ID = params.data.ROUTE_ID_NEW;
					logger.info(`status : Установка параметра: P_ROUTE_ID=${params.data.P_ROUTE_ID}`);
				}
				if(params.data['db_command.CMD.ILI_INSPECTION_ID']) {
					params.data.P_REPORT_ID = params.data['db_command.CMD.ILI_INSPECTION_ID'];
					logger.info(`status : Установка параметра: P_REPORT_ID=${params.data.P_REPORT_ID}`);
				}
				params.data.P_PS_IDX = params.ps_idx;
			}
			logger.info('proc_end : set_params');
			//Привязка реперов и расчета координат дефектов
			logger.info('proc_start : ili-insp-link');
			await LinkRepersService.process(params, transaction, connection);
			logger.info('proc_end : ili-insp-link');
			//Расчет координат дефектов
			logger.info(`proc_start : ili-insp-calc`);
			await IliInspCalcService.process(params, transaction, connection);
			logger.info(`proc_end : ili-insp-calc`);
		}else 
			logger.info(`status : Пропускается [do_calc_inspection]. Не выполнено условие запуска`);	

		await DB.commitTransaction(transaction);
		await DB.closeConnection(connection);
		try{
			if (params.do_calc_cluster && params.cluster_params){//Группировка дефектов в кластеры.
				logger.info(`proc_start : ili-cluster`);
				params.cluster_params.data.INSPECTION_ID = params.data['ILI_INSPECTION_ID'];
				params.cluster_params.processParameters.INSPECTION_ID = params.data['ILI_INSPECTION_ID'];
				params.cluster_params.processParameters.ILI_INSPECTION_ID = params.data['ILI_INSPECTION_ID'];
				await IliClusterService.process(params.cluster_params);
				logger.info(`proc_end : ili-cluster`);
			}else 
				logger.info(`status : Пропускается [ili-cluster]. Не выполнено условие запуска`);	
		}catch(ex){
			throw new ErrorHandler(errors.gis_core_calc_3, ex.message);
		}
		try{
			if (params.do_calc_pressure && params.pressure_params){//Расчет точечных показателей в соответствии с СТО 112, 173, 292, 401, 595.
				params.pressure_params.data.INSPECTION_ID = params.data['ILI_INSPECTION_ID']; 
				logger.info(`proc_start : ili-pressure`);
				await IliPressureService.process(params.pressure_params);
				logger.info(`proc_end : ili-pressure`);
			}else
				logger.info(`status : Пропускается [ili-pressure]. Не выполнено условие запуска`);	
		}catch(ex){
			throw new ErrorHandler(errors.gis_core_calc_4, ex.message);
		}
		try{
			if (params.do_calc_sto && params.ili_insp_params){//Расчет линейных показателей в соответствии с СТО 095, 292, 401.
				params.ili_insp_params.data.INSPECTION_ID = params.data['ILI_INSPECTION_ID']; 
				logger.info(`proc_start : sto-ili-insp-proc`);
				await StoIliInspService.process(params.ili_insp_params);
				logger.info(`proc_end : sto-ili-insp-proc`);
			}else 
				logger.info(`status : Пропускается [sto-ili-insp-proc]. Не выполнено условие запуска`);	
		}catch(ex){
			throw new ErrorHandler(errors.gis_core_calc_5, ex.message);
		}
		try{
			if (params.do_calc_sto_for_ehz && params.ehz_insp_params){//Расчет линейных показателей в соответствии с инструкцией ВНИИГАЗ 2004.
				params.ehz_insp_params.data.INSPECTION_ID = params.data['ILI_INSPECTION_ID'];
				logger.info(`proc_start : sto-ehz-insp-proc`);
				await StoEnzInspService.process(params.ehz_insp_params);
				logger.info(`proc_end : sto-ehz-insp-proc`);
			}else 
				logger.info(`status : Пропускается [sto-ehz-insp-proc]. Не выполнено условие запуска`);	
		}catch(ex){
			throw new ErrorHandler(errors.gis_core_calc_6, ex.message);
		}


		logger.info('proc_start : delete_xml_file');
		await IOUtils.unlink(iliFileName);
		logger.info('proc_end : delete_xml_file');

		logger.info(`proc_end : process_data`);

		return {status: 200};
	}


	static async parseSourceFile(path, driver = 'xml'){
		/*<_ds_schema>
			<_table name="PODS_ILI_DATA">
				<_field name="ILI_INSPECTION_ID" type="double"/>
				<_field name="WELD_NUMBER" type="string"/>
				<_field name="ABSOLUTE_ODOMETER" type="double"/>
				<_field name="AVERAGE_DEPTH" type="string"/>
				<_field name="LENGTH" type="string"/>
				<_field name="WIDTH" type="string"/>
				<_field name="ORIENTATION_DEG" type="string"/>
				<_field name="ANOMALY_TYPE_CL" type="string"/>
				<_field name="BPR_PIG" type="string"/>
				<_field name="MILEPOST" type="string"/>
				<_field name="FEATURE_DESCRIPTION" type="string"/>
				<_field name="DESCRIPTION" type="string"/>
				<_field name="NOMINAL_WALL_THICKNESS" type="string"/>
				<_field name="X" type="string"/>
				<_field name="Y" type="string"/>
				<_field name="Z" type="string"/>
				<_field name="DL_TUBE" type="double"/>
				<_field name="COMMENTS" type="string"/>
				<_field name="SOURCE" type="string"/>
				<_field name="SRV_DISTRICT_GCL" type="string"/>
				<_field name="US_WELD_ODOMETER" type="string"/>
				<_field name="DS_WELD_ODOMETER" type="string"/>
				<_field name="US_WELD_NUMBER" type="string"/>
			</_table>
		</_ds_schema>*/

		let iliDataTable = DB.createEmptyTable();
		const { transform } = require("camaro");
		let xml;
		try{
			await this.changeEncoding(path,'cp1251', 'utf8');
			xml = fs.readFileSync(path).toString();
		} catch (e) {
			throw new ErrorHandler(errors.gis_core_1, e);
		}
		const convertArrayToObject = (array, key, value) => {
			const initialValue = {};
			return array.reduce((obj, item) => {
				return {
					...obj,
					[item[key]]: item[value],
				};
			}, initialValue);
		};

		const hourToDeg = (OrientationMinHours) => {
			let Deg = OrientationMinHours  * 30, result = '';
			if (!isNaN(Deg))
				result = '' + Deg;
			return result;

		};

		const convertNaNToNull = (value) => {
			if (isNaN(value))
				value = null;
			return value;
		};
		const recipeTemplate = {
			root: ["/IPL_INSPECT", {
				defects: ["DEFECTS/DEF | LINEOBJS/PLOBJ | WELDS/WLD", {
					WELD_NUMBER: "@NUM_TUBE",
					ABSOLUTE_ODOMETER: "number(@ODOMETER) div 100",
					AVERAGE_DEPTH: "@V_MAX_OTCH",
					LENGTH: "@L_OTCH",
					WIDTH: "@W_OTCH",
					ORIENTATION_DEG: "number(@ORIENT1)",
					BPR_PIG: "@KBD",
					MILEPOST: "@L_LCH",
					//DESCRIPTION: "@REM",
					NOMINAL_WALL_THICKNESS: "@THICK",
					X: "@B",
					Y: "@L",
					Z: "@H",
					SOURCE: "name()",
					US_WELD_ODOMETER: "NULL",
					DS_WELD_ODOMETER: "NULL",
					US_WELD_NUMBER: "NULL",
					ANOMALY_TYPE_CL: "@IDTYPEOBJ",
					FEATURE_DESCRIPTION: "@IDTYPEOBJ",
					DL_TUBE: "number(@DL_TUBE) div 100",
					REM: "@REM",
					NAME_MARKER: '@NAME_MARKER',
				}],
				types: ["TYPEOBJS/TYPEOBJ", {
					TITLE: "TITLE",
					IDTYPEOBJ: '@IDTYPEOBJ'
				}],
			}]
		};

		let jsonData = await transform(xml, recipeTemplate).then(result => result);
		let jsonDataTypeArr = [];
		if(jsonData && jsonData.root && jsonData.root.length > 0) {
			iliDataTable.rows = jsonData.root[0].defects;
			jsonDataTypeArr = jsonData.root[0].types;
		}
		let jsonDataTypeObjs = convertArrayToObject(jsonDataTypeArr, 'IDTYPEOBJ', 'TITLE');
		iliDataTable.rows.forEach(item => {
			if(item.ANOMALY_TYPE_CL) {
				if (jsonDataTypeObjs[item.ANOMALY_TYPE_CL])
					item.ANOMALY_TYPE_CL = jsonDataTypeObjs[item.ANOMALY_TYPE_CL];
				if (jsonDataTypeObjs[item.FEATURE_DESCRIPTION])
					item.FEATURE_DESCRIPTION = jsonDataTypeObjs[item.FEATURE_DESCRIPTION];
			}
			if(item.SOURCE === 'PLOBJ'){
				item.DESCRIPTION = item.NAME_MARKER;
				item.COMMENTS = item.REM;
			}
			if(item.SOURCE === 'DEF' || item.SOURCE === 'WLD'){
				item.DESCRIPTION = item.REM;
			}
			item.ORIENTATION_DEG = hourToDeg(item.ORIENTATION_DEG);
			item.DL_TUBE = convertNaNToNull(item.DL_TUBE);
		});
		return jsonData;
	}
	static async changeEncoding(fileName, from, to){
		try {
			let rewritingFileName = fileName + '~';
			fs.renameSync(fileName, rewritingFileName);
			let command = `iconv -f ${from} -t ${to} "${rewritingFileName}"  -o "${fileName}"`;
			await exec(command);
			fs.unlink(rewritingFileName, err => {
				if (err) throw err;
			});
		}
		catch (ex){
			logger.error({message:errors.gis_gdal_11 + ex.message, stack: ex.stack});
			throw new ErrorHandler(ex);
		}
	}
}

module.exports = IliImportXmlService;
