const fs = require("fs");
const convert = require("xml-js");
const MathUtil = require("../../utils/MathUtils");
const { ErrorHandler, logger , config } = require("gis-core");
const { errors } = require("../../resources");
const { transform } = require("camaro");

class PrepareService {
    static async parseXml(fileRequest){
        if(!fileRequest)
            throw new ErrorHandler(errors.gis_core_14 + fileRequest);
        let queryReqArray = fileRequest.split("#"),
            xml;

        try{
            xml = fs.readFileSync(config.Query_Path + "/" + queryReqArray[0]).toString();
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
                    params: ["select/dbQuery/param",{
                        name: "@name",
                        type: "@type",
                        default: "@default"
                    }],
                    ute_commands: {
                        start: ["select/dbQuery/start_ute_command/ute_command",textOrDefault("false")],
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
                    params: ["insert/dbCommand/param",{
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
                    params: ["update/dbCommand/param",{
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
                    params: ["delete/dbCommand/param",{
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

        return await transform(xml, recipeTemplate).then(result => result);
    }

    static async parseXml4Geo(fileRequest){
        let queryReqArray = fileRequest.split("#"),
            xml;
        //TODO
        try{
            // xml = fs.readFileSync(config.ROOT_PATH + config.Query_Path + "/" + queryReqArray[0]).toString();
            xml = fs.readFileSync(config.Query_Path + "/" + queryReqArray[0]).toString();
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
                    geoParams:{
                        idField: "select/geoQuery/@idField",
                        geoField: "select/geoQuery/@geoField",
                        partField: "select/geoQuery/@partField"
                    },
                    query: "select/geoQuery/query",
                    vars: ["select/geoQuery/var", {
                        name: "@name",
                        type: "@type",
                        default: "@default",
                        direction: "@direction"
                    }],
                    params: ["select/geoQuery/param",{
                        name: "@name",
                        type: "@type",
                        default: "@default"
                    }],
                    ute_commands: {
                        start: ["select/geoQuery/start_ute_command/ute_command",textOrDefault("false")],
                        end: ["select/geoQuery/end_ute_command/ute_command", textOrDefault("false")],
                    }
                },
                insert: {
                    geoParams:{
                        proc: "insert/geoCommand/@proc"
                    },
                    object: "insert/geoCommand/object",
                    part: "insert/geoCommand/part",
                    coord: "insert/geoCommand/coord",
                    vars: ["insert/geoCommand/var", {
                        name: "@name",
                        type: "@type",
                        default: "@default",
                        direction: "@direction"
                    }],
                    params: ["insert/geoCommand/param",{
                        name: "@name",
                        type: "@type",
                        default: "@default"
                    }],
                    ute_commands: {
                        start: ["insert/geoCommand/start_ute_command/ute_command", textOrDefault("false")],
                        end: ["insert/geoCommand/end_ute_command/ute_command", textOrDefault("false")]
                    }
                },
                update: {
                    geoParams:{
                        proc: "insert/geoCommand/@proc"
                    },
                    object: "update/geoCommand/object",
                    part: "update/geoCommand/part",
                    coord: "update/geoCommand/coord",
                    vars: ["update/geoCommand/var", {
                        name: "@name",
                        type: "@type",
                        default: "@default",
                        direction: "@direction"
                    }],
                    params: ["update/geoCommand/param",{
                        name: "@name",
                        type: "@type",
                        default: "@default"
                    }],
                    ute_commands: {
                        start: ["update/geoCommand/start_ute_command/ute_command", textOrDefault("false")],
                        end: ["update/geoCommand/end_ute_command/ute_command", textOrDefault("false")]
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
                    params: ["delete/dbCommand/param",{
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

        return await transform(xml, recipeTemplate).then(result => result);
    }

    static async prepare(parsedXml, params){
        let reqRoot,reqData;
        if(typeof params.data === 'string'){
            let jsonReq = JSON.parse(convert.xml2json(params.data,{compact: true, nativeType: true, alwaysArray: true, spaces: 0}));
            reqRoot = jsonReq.root[0]._attributes;
            reqData = jsonReq.root[0].data[0]._attributes;
            reqData = {...reqRoot, ...reqData};
        }
        else{
            reqData = params.data;
        }
        let queryReqArray = params.descrId.split("#");
        let queryBlock = parsedXml.root.find(data => data.id === queryReqArray[1]);
        queryBlock[params.descrType].mainQuery = this.generateQuery(queryBlock[params.descrType], reqData);

        if(queryBlock[params.descrType].ute_commands.start[0] || queryBlock[params.descrType].ute_commands.end[0]){
            if(queryBlock[params.descrType].ute_commands.start[0]){
                queryBlock[params.descrType].ute_commands.start = await this.readFile(queryBlock[params.descrType].ute_commands.start[0]);
                queryBlock[params.descrType].ute_commands.start["select"].mainQuery = this.generateQuery(queryBlock[params.descrType].ute_commands.start["select"], reqData);
            }
            if(queryBlock[params.descrType].ute_commands.end[0]){
                queryBlock[params.descrType].ute_commands.end = await this.readFile(queryBlock[params.descrType].ute_commands.end[0]);
                queryBlock[params.descrType].ute_commands.end[params.descrType].mainQuery = this.generateQuery(queryBlock[params.descrType].ute_commands.end[params.descrType], reqData);
            }
        }
        return queryBlock[params.descrType];
    }
    static async prepareGeo(parsedXml, params){
        let reqRoot,reqData;
        if(typeof params.data === 'string'){
            let jsonReq = JSON.parse(convert.xml2json(params.data,{compact: true, nativeType: true, alwaysArray: true, spaces: 0}));
            reqRoot = jsonReq.root[0]._attributes;
            reqData = jsonReq.root[0].data[0]._attributes;
            reqData = {...reqRoot, ...reqData};
        }
        else{
            reqData = params.data;
        }
        let queryReqArray = params.descrId.split("#");

        let queryBlock = parsedXml.root.find(data => data.id === queryReqArray[1]);
        let queryObj = queryBlock[params.descrType];
        if(queryObj.query)
            queryObj.mainQuery = this.generateQuery(queryObj, reqData);
        if(queryObj.object)
            queryObj.objectCommand = this.generateGeoCommand(queryObj, queryObj.object, reqData);
        if(queryObj.part)
            queryObj.partCommand = this.generateGeoCommand(queryObj, queryObj.part, reqData);
        if(queryObj.coord)
            queryObj.coordCommand = this.generateGeoCommand(queryObj, queryObj.coord, reqData);
        /*if(queryObj.ute_commands.start[0] || queryObj.ute_commands.end[0]){
            if(queryObj.ute_commands.start[0]){
                queryObj.ute_commands.start = await this.readFile(queryObj.ute_commands.start[0]);
                queryObj.ute_commands.start["select"].mainQuery = this.generateQuery(queryObj.ute_commands.start["select"], reqData);
            }
            if(queryObj.ute_commands.end[0]){
                queryObj.ute_commands.end = await this.readFile(queryObj.ute_commands.end[0]);
                queryObj.ute_commands.end[params.descrType].mainQuery = this.generateQuery(queryObj.ute_commands.end[params.descrType], reqData);
            }
        }*/
        return queryObj;
    }


    static async prepareXml(parsedXml, params){
        let jsonReq = JSON.parse(convert.xml2json(params.data,{compact: true, nativeType: true, alwaysArray: true, spaces: 0}));
        let reqRoot = jsonReq.root[0]._attributes,
            reqData = jsonReq.root[0].data[0]._attributes;
        reqData = {...reqRoot, ...reqData};
        let queryReqArray = params.descrId.split("#");

        let queryBlock = parsedXml.root.find(data => data.id === queryReqArray[1]);
        let queryObj = queryBlock[params.descrType];
        let xmlProvider;
        if(params.descrType === 'select'){
            xmlProvider = new XmlQuery();
            await xmlProvider.vInit(queryObj, reqData);
        }
        else{
            //xmlProvider = new XmlCommand();
            await xmlProvider.vInit(queryObj, reqData);
        }

        return xmlProvider;
    }

    static getValidValue(param, value) {
        try{
            if (param.type) {
                switch (param.type) {
                    case 'Decimal':
                    case 'Double':
                    case 'Int32':
                    case 'Int64':
                        value = MathUtil.toNumber(value);
                        break;
                    case 'String':
                        value = MathUtil.toString(value);
                        break;
                    case 'DateTime':
                        value = MathUtil.toDateTime(value);
                        break;
                }
            }
        }
        catch(ex){
            return null;
        }

        return value;
    }
    static async readFile(file){
        let uteParsedXml = await this.parseXml(file);
        let fileParts = file.split("#");
        return uteParsedXml.root.find(data => data.id === fileParts[1]);
    }

    static generateQuery(queryBlock, requestVariables){
        let variables = {},
            tempReqVarsData = {...requestVariables};

        queryBlock.vars.forEach(rawVar => {

            if(rawVar.direction !== "Output"){
                if(Object.keys(tempReqVarsData).indexOf(rawVar.name) !== -1){
                    let resValue = this.getValidValue(rawVar, tempReqVarsData[rawVar.name]);
                    if(resValue !== null)
                        variables[rawVar.name] = resValue;
                    else
                        variables[rawVar.name] = 'NULL';
                    delete tempReqVarsData[rawVar.name];
                } else if(rawVar.default !== undefined){
                    if(rawVar.type && rawVar.type === 'DateTime' && rawVar.default === ''){
                        variables[rawVar.name] = 'NULL_DATE_TIME';
                    }
                    else
                        variables[rawVar.name] = rawVar.default;
                }
            }
        });
        if(Object.keys(tempReqVarsData).length){
            Object.keys(tempReqVarsData).forEach(tempVar => {
                variables[tempVar] = tempReqVarsData[tempVar];
            });
        }

        const replaceVars = (oldString, data) => {
            //2 loops. 1-st replace {PARAM}, 2-nd replace '{PARAM}'
            Object.keys(data).forEach(repTempl => {
                if(oldString.indexOf(`'{${repTempl}}'`) === -1 && data[repTempl] === ''){
                    //upd. 27.10.21 доп. условие для #2509. Если внутри строки, но нет данных, какого типа переменная, то не меняем на NULL
                    if(oldString.indexOf(`'{${repTempl}}`) !== -1 || oldString.indexOf(`{${repTempl}}'`) !== -1){
                    }
                    else
                    oldString = oldString.replace(new RegExp("{"+ repTempl +"}", "g"), (m) => 'NULL');
                }
            });
            Object.keys(data).forEach(repTempl => {
                oldString = oldString.replace(new RegExp("{"+ repTempl +"}", "g"), (m) => data[repTempl]);
            });
            return oldString;
        };
        let replacedResult = replaceVars(queryBlock.query, variables);
        replacedResult = replacedResult.replace(/'NULL_DATE_TIME'/g,'NULL').replace(/'NULL'/g,'NULL');
        return replacedResult;
    }

    static generateGeoCommand(queryBlock, command, requestVariables){

        let variables = [],
            tempReqVarsData = {...requestVariables};

        queryBlock.vars.forEach(rawVar => {
            //TODO STUB if has PIPE_SEGMENT_LENGTH exists - remove, coz we have preprocess variable
            if(rawVar.name === 'PIPE_SEGMENT_LENGTH')
                rawVar.name = rawVar.name + '_STUB';
            if(rawVar.direction !== "Output"){
                if(Object.keys(tempReqVarsData).indexOf(rawVar.name) !== -1){
                    variables[rawVar.name] = tempReqVarsData[rawVar.name];
                    delete tempReqVarsData[rawVar.name];
                } else if(rawVar.default !== undefined){
                    if(rawVar.type && rawVar.type === 'DateTime' && rawVar.default === ''){
                        variables[rawVar.name] = 'NULL_DATE_TIME';
                    }
                    else
                        variables[rawVar.name] = rawVar.default;
                }
            }
        });

        if(Object.keys(tempReqVarsData).length){
            Object.keys(tempReqVarsData).forEach(tempVar => {
                variables[tempVar] = tempReqVarsData[tempVar];
            });
        }

        const replaceVars = (oldString, data) => {
            //2 loops. 1-st replace {PARAM}, 2-nd replace '{PARAM}'
            Object.keys(data).forEach(repTempl => {
                if(oldString.indexOf(`'{${repTempl}}'`) === -1 && data[repTempl] === ''){
                    //upd. 27.10.21 доп. условие для #2509. Если внутри строки, но нет данных, какого типа переменная, то не меняем на NULL
                    if(oldString.indexOf(`'{${repTempl}}`) !== -1 || oldString.indexOf(`{${repTempl}}'`) !== -1){
                    }
                    else
                    oldString = oldString.replace(new RegExp("{"+ repTempl +"}", "g"), (m) => 'NULL');
                }
            });
            Object.keys(data).forEach(repTempl => {
                oldString = oldString.replace(new RegExp("{"+ repTempl +"}", "g"), (m) => data[repTempl]);
            });
            return oldString;
        };
        let replacedResult = replaceVars(command, variables);
        //replacing , because postgre cant insert '', 'NULL' as timestamp
        replacedResult = replacedResult.replace(/'NULL_DATE_TIME'/g,'NULL').replace(/'NULL'/g,'NULL');
        return replacedResult;
    }

    static initXml(queryBlock, requestVariables){
        let variables = [],
            tempReqVarsData = {...requestVariables};

        queryBlock.vars.forEach(rawVar => {
            if(Object.keys(tempReqVarsData).indexOf(rawVar.name) !== -1){
                variables[rawVar.name] = tempReqVarsData[rawVar.name];
                delete tempReqVarsData[rawVar.name];
            }
        });

        if(Object.keys(tempReqVarsData).length){
            Object.keys(tempReqVarsData).forEach(tempVar => {
                variables[tempVar] = tempReqVarsData[tempVar];
            });
        }

        const replaceVars = (oldString, data) => {
            Object.keys(data).forEach(repTempl => {
                oldString = oldString.replace(new RegExp("{"+ repTempl +"}", "g"), (m) => data[repTempl]);
            });
            return oldString;
        };
        return replaceVars(queryBlock.query, variables);
    }
}

module.exports = PrepareService;
