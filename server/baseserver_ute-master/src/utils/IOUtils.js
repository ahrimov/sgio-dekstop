const fs = require('fs');
const { ErrorHandler, logger, config } = require("gis-core");
const { errors } = require("../resources");
const { transform } = require("camaro");
const path = require('path');

class IOUtils {
	/**
     * Чтение данных из файла
     * @param fileName
     * @returns {*|[]}
     */
	static read(fileName) {
		try {
			const data = fs.readFileSync(fileName, 'utf8');
			let obj = JSON.parse(data);
			let dataTable = [];
			for (const fskey in obj) {
				dataTable = obj[fskey];
				return dataTable;
			}
		} catch (err) {
			throw new Error(err.message);
		}
	}

	/**
     * Запись данных в файл
     * @param data Массив с данными
     * @param filePath
     */
	static write(data, filePath) {
		const result = JSON.stringify(data);
		fs.writeFile(filePath, result, err => {
			if (err) {
				throw new Error(err.message);
			}
		});
	}

	/**
     * Чтение файла с запросами по идентификатору
     * @param fileRequest  Файл запросов виде FILE_NAME.xml#IDENTIFIER
     * @returns {Promise<any>}
     */
	static async parseXml(fileRequest) {
		if (!fileRequest)
			throw new ErrorHandler(errors.gis_core_14 + fileRequest);
		let queryReqArray = fileRequest.split("#"),
			xml;
		try {
			xml = fs.readFileSync(path.join(config.Query_Path, queryReqArray[0])).toString();
		} catch (e) {
			throw new ErrorHandler(errors.gis_core_1, e);
		}

		const textOrDefault = (defaultValue) => `concat(
            @call,
            substring(
                "${defaultValue}",
                1,
                number(not(@call)) * string-length("${defaultValue}")
            )
        )`;
		const recipeTemplate = {
			root: ["/root/data", {
				id: "@id",
				select: {
					query: "select/dbQuery/query",
					vars: ["select/dbQuery/var", {
						name: "@name",
						type: "@type",
						default: "@default",
						direction: "@direction"
					}],
					params: ["select/dbQuery/param", {
						name: "@name",
						type: "@type",
						default: "@default"
					}],
					ute_commands: {
						start: ["select/dbQuery/start_ute_command/ute_command", textOrDefault("false")],
						end: ["select/dbQuery/end_ute_command/ute_command", textOrDefault("false")],
					}
				},
				insert: {
					query: "insert/dbCommand/query",
					vars: ["insert/dbCommand/var", {
						name: "@name",
						type: "@type",
						default: "@default",
						direction: "@direction"
					}],
					params: ["insert/dbCommand/param", {
						name: "@name",
						type: "@type",
						default: "@default"
					}],
					ute_commands: {
						start: ["insert/dbCommand/start_ute_command/ute_command", textOrDefault("false")],
						end: ["insert/dbCommand/end_ute_command/ute_command", textOrDefault("false")]
					}
				},
				update: {
					query: "update/dbCommand/query",
					vars: ["update/dbCommand/var", {
						name: "@name",
						type: "@type",
						default: "@default",
						direction: "@direction"
					}],
					params: ["update/dbCommand/param", {
						name: "@name",
						type: "@type",
						default: "@default"
					}],
					ute_commands: {
						start: ["update/dbCommand/start_ute_command/ute_command", textOrDefault("false")],
						end: ["update/dbCommand/end_ute_command/ute_command", textOrDefault("false")]
					}
				},
				delete: {
					query: "delete/dbCommand/query",
					vars: ["delete/dbCommand/var", {
						name: "@name",
						type: "@type",
						default: "@default",
						direction: "@direction"
					}],
					params: ["delete/dbCommand/param", {
						name: "@name",
						type: "@type",
						default: "@default"
					}],
					ute_commands: {
						start: ["delete/dbCommand/start_ute_command/ute_command", textOrDefault("false")],
						end: ["delete/dbCommand/end_ute_command/ute_command", textOrDefault("false")]
					}
				},
			}
			]
		};
		let result =  await transform(xml, recipeTemplate);
		return result;
	}

	/**
     * Функция удаляет выбранный файл
     * @param file
     */
	static unlink(file) {
		try {
			if (fs.existsSync(file)) {
				fs.unlinkSync(file);
			}
		}
		catch (ex) {
			logger.error({ message: errors.gis_core_15 + ex.message, stack: ex.stack });
		}
	}
}
module.exports = IOUtils;