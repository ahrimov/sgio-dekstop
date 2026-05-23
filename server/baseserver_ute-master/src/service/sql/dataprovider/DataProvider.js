const fs = require('fs');
const convert = require("xml-js");
const path = require('path');
const {ErrorHandler, Utils, config, logger, lang} = require("gis-core");

class DataProvider{
	
	constructor(props) {

	}
	async vInit(queryBlock, queryParams = null) {

	}
	async vProcess(){

	}

	async needLoadGeoFromDB_(params){
		if(!params) return true;
		try{
			if(params['USE_SERVER_CACHE'] === 'true' &&
				params['FILE_NAME'] && params['FILE_NAME'] !== ''){
				if(params['DATA_ACTUAL_DATE'] && params['DATA_ACTUAL_DATE'] !== ''){
					let dataActualDate = params['DATA_ACTUAL_DATE']; //YYYYMMDD
					let dateTime = this.parseDate(dataActualDate);
					let dateTimeNow = Date.now();
					if(dateTimeNow >= dateTime.getTime()){
						let geoPath = path.join(config.PRIVATE_PATH, config.STATIC_GEO_PATH, params.FILE_NAME) + '.xml';
						if(fs.existsSync(geoPath)){
							let { ctime } = fs.statSync(geoPath);
							if(ctime.getTime() >= dateTime.getTime())
								return false;
						}
					}
				}
			}
		}
		catch(ex){
			//nothing to do, loading from db by default
		}
		return true;
	}

	parseDate(str) {
		if (!/^(\d){8}$/.test(str))
			throw new Error('invalida date format');
		let y = str.substr(0, 4),
			m = str.substr(4, 2),
			d = str.substr(6, 2);
		return new Date(y, m, d);
	}

	//capitalizing result attributes
	toUpperCase(result){
		result.forEach(result => {
			for (let key in result) {
				let temp = result[key];
				delete result[key];
				result[key.toUpperCase()] = temp;
			}
		});
		return result;
	}

	xmlFileOut(queryResult) {
		let xmlTemplate =
			"<string>" +
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

	xmlOut(queryResult) {
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
	formatQuery(mainQuery){
		mainQuery = mainQuery.replace(/:MI:SS'/g, "||CHR(58)||MI||CHR(58)||SS'")
			.replace(/:SS'/g, "||CHR(58)||SS'")
			.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
		return mainQuery;
	}
	//TODO move to utils class
	formatResult(queryResult){
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

	/**
	 * If find undeclared :PARAM inside params object - adds this param with null value
	 * @param params
	 * @param command
	 * @returns {*}
	 */
	prepareNamedParameters(params, command){
		/*Object.keys(params).forEach(key => {
			let regex = /^:${key},(.*)$/;
			let matches = command.match(regex);
		});*/
		this.formatNamedParameters(command, params)
		return params;
	}

	formatNamedParameters(sql, values) {
		return sql.replace(/\:+(?!\d)(\w+)/g, (value, key) => {
			if (values[key] === undefined) {
				values[key] = null;
				//console.log('Named parameter "' + value + '" has no value in the given object.');
			}
		});
	}
}
module.exports = DataProvider;
