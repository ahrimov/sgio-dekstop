const convert = require("xml-js");
const { ErrorHandler } = require("gis-core");
const { errors } = require("../../resources");

class ValidationService {
	static validate(parsedFile, requestData) {
		let jsonReq = JSON.parse(convert.xml2json(requestData.data, { compact: true, nativeType: true, alwaysArray: true, spaces: 0 }));
		let reqRoot = jsonReq.root[0]._attributes,
			reqData = jsonReq.root[0].data[0]._attributes,
			queryReqArray = requestData.descrId.split('#'),
			varErrors = [],
			paramErrors = [],
			callErrors = [],
			queryBlock = parsedFile.root.find(dataBlock => dataBlock.id === queryReqArray[1]);
		reqData = { ...reqRoot, ...reqData };
		varErrors = this.validateVar(queryBlock[requestData.descrType], reqData);
		paramErrors = this.validateParams(queryBlock[requestData.descrType], reqData);
		callErrors = this.validationCall(queryBlock[requestData.descrType]);

		if (varErrors.length || paramErrors.length || callErrors.length) {
			throw new ErrorHandler(errors.gis_core_2, [...varErrors, ...paramErrors, ...callErrors]);
		}
	}

	static validateVar(queryBlock, reqData) {
		let varErrors = [];
		const checkValue = (variable) => {
			/* if(!variable.default && Object.keys(reqData).indexOf(variable.name) === -1){
                varErrors.push(variable.name);
            }*/
		};
		queryBlock.vars.forEach(variable => checkValue(variable));
		return varErrors;
	}

	static validateParams(queryBlock, reqData) {
		let paramErrors = [];
		const checkValue = (variable) => {
			/* if(variable.direction !== "Output" && !variable.default && Object.keys(reqData).indexOf(variable.name) === -1){
                paramErrors.push(variable.name);
            }*/
		};
		if (queryBlock.params) {
			queryBlock.params.forEach(variable => checkValue(variable));
		}

		return paramErrors;
	}
	static validationCall(queryBlock) {
		const callErrors = [];
		if (queryBlock.ute_commands && queryBlock.ute_commands.start.length && queryBlock.ute_commands.start[0] === 'false') {
			callErrors.push('start_ute_command call');
		}
		if (queryBlock.ute_commands && queryBlock.ute_commands.end.length && queryBlock.ute_commands.end[0] === 'false') {
			callErrors.push('end_ute_command call');
		}

		return callErrors;
	}
}

module.exports = ValidationService;
