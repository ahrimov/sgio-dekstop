const { Database, ErrorHandler, config, logger } = require("gis-core");
const {lang, errors} = require("../../../resources");
const { queryService, queryPrepareService } = require("../../../service");
const IOUtils = require('../../../utils/IOUtils');

class DB {
	/**
	 * Функция чтения данных
	 * @param descrId   идентификатор запроса
	 * @param descrType тип запроса
	 * @param params    параметры для передачи в запрос
	 * @param transaction   транзакция
	 * @returns {Promise<{columns: *, rows: *}|*[]>}
	 */
	static async dbReader(descrId, descrType, params, transaction = null, connection = null){
		if(params){
			params.descrId = descrId;
			params.descrType = descrType;
		}
		logger.info(`Отправлено: dbReader : Параметры [descrId="${params.descrId}"; descrType="${params.descrType}"]. ${Database.toString()}`);
		let query = await IOUtils.parseXml(descrId);
		let queryData = [],
			mainQuery = {};

		try{
			mainQuery = await queryPrepareService.prepare(query, params);
			queryData = await queryService.processQuery(mainQuery, params, transaction, connection, true);
		} catch (ex) {
			logger.error({message:errors.gis_core_12 + ex.message, stack: ex.stack});
			throw new ErrorHandler(ex);
		}
		//TODO добавить toUpperCase
		if(queryData && queryData.length){
			let dataTable = {
				columns: queryData[1].fields,
				rows:  queryData[0]
			};
			logger.info(`Получено ${queryData[0].length} записей. dbReader : Параметры [descrId="${params.descrId}"; descrType="${params.descrType}"]. ${Database.toString()}`);
			return dataTable;
		}
		logger.info(`Получено 0 записей. dbReader : Параметры [descrId="${params.descrId}"; descrType="${params.descrType}"]. ${Database.toString()}`);
		return this.createEmptyTable();
	}
	/**
	 * Функция чтения скалярных данных
	 * @param descrId   идентификатор запроса
	 * @param descrType тип запроса
	 * @param params    параметры для передачи в запрос
	 * @param outputParam    Параметр, который будет забираться из атрибуты пришедших данных
	 * @param transaction   транзакция
	 * @returns {Promise<{columns: *, rows: *}|*[]>}
	 */
	static async dbScalarReader(descrId, descrType, params, outputParam, transaction = null, connection = null){
		if(params){
			params.descrId = descrId;
			params.descrType = descrType;
		}
		logger.info(`Отправлено: dbScalarReader : Параметры [descrId="${params.descrId}"; descrType="${params.descrType}"]. ${Database.toString()}`);
		let query = await IOUtils.parseXml(descrId);
		let queryData = [],
			mainQuery = {};

		try{
			mainQuery = await queryPrepareService.prepare(query, params);
			queryData = await queryService.processQuery(mainQuery, params, transaction, connection, true);
		} catch (ex) {
			logger.error({message:errors.gis_core_12 + ex.message, stack: ex.stack});
			throw new ErrorHandler(ex);
		}
		if(outputParam && queryData && queryData.length && queryData[0].length && queryData[0].length > 0){
			return queryData[0][0][outputParam];
		}
	}

	/**
	 * Простой вызов sql с возвращением значения параметра
	 * @param sql
	 * @param outputParam
	 * @param transaction
	 * @param connection
	 * @param needLog
	 * @returns {Promise<*>}
	 */
	static async dbSimpleScalarReader(sql, outputParam, transaction = null, connection = null, needLog = true){
		if(needLog)
			logger.info(`Отправлено: dbSimpleScalarReader : Параметры [sql="${sql}"]. ${Database.toString()}`);
		let queryResult = await Database.db().query(sql, {
			raw: true,
			replacements: {},
			transaction:transaction
		})
			.then(result => result)
			.catch(err => {
				let message = {
					message: err.message,
					query: sql,
					stack: err.stack
				};
				logger.error({message:err.message + '\nquery:' + (sql ? sql : ''), stack: err.stack});
				throw new ErrorHandler(errors.gis_core_4, message);
			});
		if(queryResult && queryResult.length && queryResult.length > 0 && queryResult[0].length && queryResult[0][0]){
			return Object.values(queryResult[0][0])[0];
		}
		return null;
	}

	/**
	 * Функция чтения пространственных данных
	 * @param descrId   идентификатор запроса
	 * @param descrType тип запроса
	 * @param params    параметры для передачи в запрос
	 * @param fillBounds
	 * @param idFields
	 * @param outGeoField
	 * @param transaction   транзакция
	 * @param connection соединение с БД
	 * @returns {Promise<{columns: *, rows: *}|*[]>}
	 */
	static async geoReader(descrId, descrType, params, fillBounds, idFields, outGeoField, transaction = null, connection = null){
		if(params){
			params.descrId = descrId;
			params.descrType = descrType;
		}
		logger.info(`geoReader : Параметры [descrId="${params.descrId}"; descrType="${params.descrType}"]`);
		let query = await IOUtils.parseXml(descrId);
		let queryData = [],
			mainQuery = {};

		try{
			logger.info(`geoReader : ${Database.toString()}`);
			mainQuery = await queryPrepareService.prepare(query, params);
			queryData = await queryService.processGeoQuery(mainQuery, params, fillBounds, idFields, outGeoField, false, true, transaction, connection);
		} catch (ex) {
			logger.error({message:errors.gis_core_12 + ex.message, stack: ex.stack});
			throw new ErrorHandler(ex);
		}
		//TODO добавить toUpperCase
		if(queryData && queryData.length){
			let dataTable = {
				columns: queryData[1].fields,
				rows:  queryData[0]
			};
			return dataTable;
		}
		return this.createEmptyTable();
	}

	/**
	 * Функция обновления данных в БД
	 * @param descrId
	 * @param descrType
	 * @param params
	 * @param transaction
	 * @param connection
	 * @returns {Promise<{queryData: undefined, outputParams: {}}>}
	 */
	static async dbCommand(descrId, descrType, params, transaction = null, connection = null) {
		let hasParentTransaction = transaction !== null;
		if(params){
			params.descrId = descrId;
			params.descrType = descrType;
		}
		logger.info(`dbCommand : Параметры [descrId="${params.descrId}"; descrType="${params.descrType}"]`);
		let query = await IOUtils.parseXml(descrId);

		let queryData = {queryData: undefined, outputParams: {}},
			mainQuery = {};
		try{
			if(!transaction){
				transaction = await Database.beginTransaction();
			}
			logger.info(`dbCommand : ${Database.toString()}`);
			mainQuery = await queryPrepareService.prepare(query, params);
			queryData.queryData = await queryService.processQuery(mainQuery, params, transaction, connection, true);
			//обработка ситуации, когда есть параметры с атрибутом default(это значит они имеют тип output и возвращают значения)
			for(let parameter of mainQuery.vars){
				if(parameter.default){
					queryData.outputParams[parameter.name] = await this.dbSimpleScalarReader(parameter.default, parameter.name, transaction, connection);
				}
			}

		} catch (ex) {
			logger.error({message:errors.gis_core_12 + ex.message, stack: ex.stack});
			if(transaction) {
				await Database.rollback(transaction);
				transaction = null;
			}
			throw new ErrorHandler(ex);
		}
		finally {
			if(!hasParentTransaction && transaction){ //если есть родительская транзакция, то в данной функции не коммитим. Коммит происходит у родителя
				await Database.commit(transaction);
			}
		}
		return queryData;
	}

	/**
	 * Функция записи данных таблицы в БД
	 * @param descrId
	 * @param descrType
	 * @param dataTable
	 * @param params
	 * @param transaction
	 * @param connection
	 * @returns {Promise<{queryData: undefined, outputParams: {}}>}
	 */
	static async dbWriter(descrId, descrType, dataTable, params, transaction = null, connection = null){
		let hasParentTransaction = transaction !== null;
		if(params){
			params.descrId = descrId;
			params.descrType = descrType;
		}
		logger.info(`dbWriter : Параметры [descrId="${params.descrId}"; descrType="${params.descrType}"]`);
		let query = await IOUtils.parseXml(descrId);
		let queryData = {queryData: undefined, outputParams: {}},
			mainQuery = {};
		try{
			if(!transaction){
				transaction = await Database.beginTransaction();
			}
			logger.info(`dbWriter : ${Database.toString()}`);
			if(dataTable.rows){
				let prevPcnt = 0;
				for(let i = 0; i < dataTable.rows.length; i++){
					let rowParams = {...params};
					rowParams.data = {...rowParams.data, ...dataTable.rows[i]};
					mainQuery = await queryPrepareService.prepare(query, rowParams);
					queryData.queryData = await queryService.processQuery(mainQuery, rowParams, transaction, connection, true);

					//обработка ситуации, когда есть параметры с атрибутом default(это значит они имеют тип output и возвращают значения)
					if(mainQuery && mainQuery.vars) {
						for (let parameter of mainQuery.vars) {
							if (parameter.default) {
								queryData.outputParams[parameter.name] = await this.dbSimpleScalarReader(parameter.default, parameter.name, transaction, connection, false);
								dataTable.rows[i][parameter.name] = queryData.outputParams[parameter.name];
							}
						}
					}

					let pcnt = (i + 1)*100/dataTable.rows.length;
					pcnt = pcnt.toFixed();
					if (pcnt !== prevPcnt && ((pcnt % 5) === 0)){
						logger.info(`${pcnt} %`, {category: 'progress'});
						prevPcnt = pcnt;
					}
				}
			}


		} catch (ex) {
			logger.error({message:errors.gis_core_12 + ex.message, stack: ex.stack});
			if(transaction){
				await Database.rollback(transaction);
				transaction = null;
			}
			throw new ErrorHandler(ex);
		}
		finally {
			if(!hasParentTransaction && transaction) { //если есть родительская транзакция, то в данной функции не коммитим. Коммит происходит у родителя
				await Database.commit(transaction);
			}
		}
		return queryData;
	}

	/**
	 *
	 * @returns {Sequelize}
	 */
	static createConnection(){
		try{
			return Database.createConnection();
		}
		catch(ex){
		}
	}

	/**
	 *
	 * @param connection
	 * @returns {Promise<*>}
	 */
	static async closeConnection(connection = null){
		try{
			if(connection)
				return await Database.closeConnection(connection);
		}
		catch(ex){
		}
	}

	/**
	 *
	 * @param connection
	 * @returns {Transaction}
	 */
	static async beginTransaction(connection = null){
		try{
			return await Database.beginTransaction(connection);
		}
		catch(ex){
			return null;
		}
	}


	static async commitTransaction(transaction){
		try{
			if(transaction){
				await Database.commit(transaction);
			}
		}
		catch(ex){
		}
	}


	static createEmptyTable(){
		return {
			columns:[], rows: []
		};
	}
}
module.exports = DB;
