const {errors} = require("../../resources");
const convert = require("xml-js");
const {ErrorHandler, Database, Utils, logger} = require("gis-core");
const prepareService = require("./prepareService");
const GeoReader = require("./dataprovider/GeoReader");
const dataTypeTransform = Utils.dataTypeTransform;

class QueryService {
	static async processQuery(queryBlock, reqBody, transaction = null, connection = null, needJsonResult = false) {
		let allowsNull = reqBody.allowsNull === 'true' || reqBody.allowsNull === true;
		let params = {}, reqRoot, reqData, outResult;
		if(typeof reqBody.data === 'string'){
			let jsonReq = JSON.parse(convert.xml2json(reqBody.data, {
				compact: true,
				nativeType: true,
				alwaysArray: true,
				spaces: 0
			}));
			reqRoot = jsonReq.root[0]._attributes;
			reqData = jsonReq.root[0].data[0]._attributes;
			reqData = {...reqRoot, ...reqData};
		}
		else{
			reqData = reqBody;
		}

		queryBlock.params.forEach(param => {
			if (!reqData[param.name] && param.value) {
				params[param.name] = param.value;
			} else if (!reqData[param.name] && param.default) {
				params[param.name] = this.getDefaultParamValue(param);
			} else {
				params[param.name] = reqData[param.name];
			}
			params[param.name] = this.getValidParamValue(param, params[param.name]);
			delete reqData[param.name];
		});

		params = {...params, ...reqData};
		if (queryBlock.ute_commands.start["select"] && queryBlock.ute_commands.start["select"].mainQuery) {
			let start_results = await this.query(queryBlock.ute_commands.start["select"].mainQuery, params, allowsNull, transaction, connection);
			let start_output = queryBlock.ute_commands.start["select"].vars.find(variable => variable.direction === "Output");
			if (start_output) {
				start_results[0].forEach(result => {
					reqData = {...reqData, ...result};
				});
				queryBlock.mainQuery = prepareService.generateQuery(queryBlock, {...reqBody, ...reqData});
			}
		}
		outResult = await this.query(queryBlock.mainQuery, params, allowsNull, transaction, connection);
		if (queryBlock.ute_commands.end[reqBody.descrType] && queryBlock.ute_commands.end[reqBody.descrType]) {
			queryBlock.ute_commands.end[reqBody.descrType].mainQuery = prepareService.generateQuery(queryBlock.ute_commands.end[reqBody.descrType], Object.assign(reqBody, reqData, outResult[0]));
			let end_results = await this.query(queryBlock.ute_commands.end[reqBody.descrType].mainQuery, {...params, ...reqData, ...outResult[0]}, allowsNull, transaction);
			let end_output = queryBlock.ute_commands.end[reqBody.descrType].vars.find(variable => variable.direction === "Output");
			if (end_output) {
				outResult = end_results;
			}
		}
		let OutputVar = queryBlock.vars.find(variable => variable.direction === "Output");
		if (OutputVar) {
			outResult = await this.query(OutputVar.default, null, allowsNull, transaction, connection);
		}

		if(needJsonResult){
			return outResult;
		}
		if (outResult[0].length && outResult[1].fields) {
			outResult = dataTypeTransform.transform(outResult);
			outResult[0] = this.toUpperCase(outResult[0]);
		}

		return outResult[0];
	}
	static async processGeoQuery(queryBlock, reqBody, fillBounds, idFields, outGeoField, simplifyGeometry = true, needJsonResult = false, transaction = null , connection = null) {
		let allowsNull = reqBody.allowsNull === 'true' || reqBody.allowsNull === true;
		let params = {}, reqRoot, reqData, outResult;
		if(typeof reqBody.data === 'string'){
			let jsonReq = JSON.parse(convert.xml2json(reqBody.data, {
				compact: true,
				nativeType: true,
				alwaysArray: true,
				spaces: 0
			}));
			reqRoot = jsonReq.root[0]._attributes;
			reqData = jsonReq.root[0].data[0]._attributes;
			reqData = {...reqRoot, ...reqData};
		}
		else{
			reqData = reqBody;
		}

		queryBlock.params.forEach(param => {
			if (!reqData[param.name] && param.value) {
				params[param.name] = param.value;
			} else if (!reqData[param.name] && param.default) {
				params[param.name] = this.getDefaultParamValue(param);
			} else {
				params[param.name] = reqData[param.name];
			}
			delete reqData[param.name];
		});
		params = {...params, ...reqData};

		let geoReader = new GeoReader();
		outResult = await this.query(queryBlock.mainQuery, params, allowsNull, transaction, connection); //TODO -> move to GeoQuery
		let rows = await geoReader.composeGeoReaderResult(outResult, queryBlock, fillBounds, idFields, '', outGeoField);
		outResult[0] = rows;

		let OutputVar = queryBlock.vars.find(variable => variable.direction === "Output");
		if (OutputVar) {
			outResult = await this.query(OutputVar.default, null, allowsNull, transaction, connection);
		}

		if(needJsonResult){
			return outResult;
		}
		if (outResult[0].length && outResult[1].fields) {
			outResult = dataTypeTransform.transform(outResult);
			outResult[0] = this.toUpperCase(outResult[0]);
		}
		return outResult[0];
	}

	static async query(mainQuery, queryParams = null, allowsNull = false, transaction= null, connection = null) {
		if (queryParams && Object.keys(queryParams).length) {
			Object.keys(queryParams).forEach(itemKey => {
				if (queryParams[itemKey] === undefined)
					queryParams[itemKey] = null;
			});
		}
		mainQuery = this.formatQuery(mainQuery);
		let db = (connection) ? connection : Database.db();
		let queryResult = await db.query(mainQuery, {
			raw: true,
			replacements: queryParams,
			transaction: transaction
		})
			.then(result => result)
			.catch(err => {
				let message = {
					message: err.message,
					query: mainQuery,
					stack: err.stack
				};
				logger.error({message: err.message + '\nquery:' + (mainQuery ? mainQuery : ''), stack: err.stack});
				throw new ErrorHandler(errors.gis_core_4, message);
			});

		if (allowsNull) {// if nulls arrived converts to ''. see export excel
			if (queryResult && queryResult[0].length) {
				queryResult[0].forEach(item => {
					Object.keys(item).forEach(key => {
						if (item[key] === null) item[key] = '';
					});
				});
			}
		}
		queryResult = this.formatResult(queryResult);
		return queryResult;
	}

	/**
	 *
	 * @param sql
	 * @param queryParams
	 * @param transaction
	 * @param connection
	 * @returns {Promise<T>}
	 */
	static async rawQuery(sql, queryParams = null, transaction= null, connection = null) {
		if (queryParams && Object.keys(queryParams).length) {
			Object.keys(queryParams).forEach(itemKey => {
				if (queryParams[itemKey] === undefined)
					queryParams[itemKey] = null;
			});
		}
		let db = (connection) ? connection : Database.db();
		let queryResult = await db.query(sql, {
			raw: true,
			replacements: queryParams,
			transaction: transaction
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
		return queryResult;
	}

	static xmlOut(queryResult) {
		let xmlTemplate =
			"<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
			"<string xmlns=\"http://tempuri.org/\">" +
			"    <root></root>" +
			"</string>",
			jsTemplate = JSON.parse(convert.xml2json(xmlTemplate, {compact: true, nativeType: true, spaces: 0}));
		if (queryResult.length > 0) {
			jsTemplate.string.root.data = [];
			queryResult.forEach(result => {
				for (let key in result) {
					let temp = result[key];
					delete result[key];
					result[key.toUpperCase()] = temp;
				}
				jsTemplate.string.root.data.push({_attributes: result});
			});
		} else {
			//jsTemplate.string.root.data = {};
			jsTemplate.string.root = {};
		}

		return convert.json2xml(jsTemplate, {
			compact: true,
			ignoreComment: true,
			nativeTypeAttributes: true,
			spaces: 0
		});
	}

	//TODO move to utils class
	static formatQuery(mainQuery) {
		if (mainQuery)
			mainQuery = mainQuery
				.replace(/:MI:SS'/g, "||CHR(58)||MI||CHR(58)||SS'")
				.replace(/:SS'/g, "||CHR(58)||SS'")
				.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
		return mainQuery;
	}
	//TODO move to utils class
	static formatResult(queryResult){
		if (queryResult && queryResult[0].length) {
			queryResult[0].forEach(item => {
				Object.keys(item).forEach(key => {
					if (item[key] && key !== 'WKT'/*for speed*/ && item[key].toString().indexOf('||CHR(58)') !== -1) {
						item[key] = item[key].replace(/\|\|CHR\(58\)\|\|/g,':');
					}
				});
			});
		}
		return queryResult;
	}
	//TODO move to utils class
	static toUpperCase(result) {
		//capitalizing attributes
		result.forEach(result => {
			for (let key in result) {
				let temp = result[key];
				delete result[key];
				result[key.toUpperCase()] = temp;
			}
		});
		return result;
	}

	//returns null for numbers instead 'NULL'
	static getDefaultParamValue(param) {
		let value = param.default || null;
		if (param.type) {
			switch (param.type) {
			case 'Decimal':
			case 'Double':
			case 'Int32':
			case 'Int64':
				value = (param.default === '' || param.default.toUpperCase() === 'NULL') ? null : param.default;
				break;
			default:
				value = param.default;
				break;
			}
		}
		return value;
	}
	//check validation of param
	static getValidParamValue(param,value) {
		if (param.type) {
			switch (param.type) {
			case 'Decimal':
			case 'Double':
			case 'Int32':
			case 'Int64':
				value = (value === '' || value === 'NULL') ? null : value;
				break;
			}
		}
		return value;
	}
}
module.exports = QueryService;
