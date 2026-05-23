const fs = require('fs');
const { lang, errors } = require("../resources");
const { ErrorHandler, config, logger } = require("gis-core");
const IOUtils = require("../utils/IOUtils");
const { canCallUteProcess } = require("../utils/blocking");

module.exports = async function uteBlockingValidation(req, res, next) {
	//функция проверки блокировки
	let data = "";
	try{
		data = fs.readFileSync(config.NodeJS_Service_Log, 'utf8');
	}
	catch(e){}
	try {
		let serviceName = req.params['0'];
		let res = canCallUteProcess(data, serviceName);
		//если проверка не пройдена
		if (!res)
			throw new ErrorHandler(errors.gis_core_16);
	} catch (e) {
		next(e);
	}
	next();
};