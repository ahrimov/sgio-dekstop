const Decimal = require('decimal.js');
const gdal = require('gdal');
const {ErrorHandler, config, logger} = require("gis-core");
const DB = require('../../db');
const BufProcessor = require("../../../sql/processors/obj/BufProcessor");
const MathUtil = require("../../../../utils/MathUtils");

class IliImportXml {
    /**
     * Простановка идентификатолров ЛПУ для каждого дефекта
     * @param iliData
     * @param transaction
     * @returns {Promise<void>}
     */
    async setSrvDistrictId(iliData, transaction = null, connection = null) {
        let idField = 'LPU_ID';
        let geoField = 'WKB_GEOMETRY';
        let query = 'SELECT GID "LPU_ID", WKB_GEOMETRY "WKB_GEOMETRY" FROM PODS.SRV_DISTRICT_G';
        let lpuProc = new BufProcessor(query, idField, geoField, transaction, connection); //wkbreader
        await lpuProc.init();
        for (let iliRow of iliData.rows) {
            let srvDistrictId = '0';
            if ((iliRow.X || iliRow.X.length > 0) && (iliRow.Y || iliRow.Y.length > 0)) {
                let iliPoint = new gdal.Point(parseFloat(iliRow.X), parseFloat(iliRow.Y));
                let attrs = lpuProc.process(iliPoint);
                if (attrs && attrs[idField])
                    srvDistrictId = attrs[idField];
            }
            iliRow.SRV_DISTRICT_GCL = srvDistrictId;
        }
        return iliData;
    }

    checkTypes(iliData, types) {
        //String pattern = @"\(.*\)|[*.?]|\s+";
        //Regex rgx = new Regex(pattern, RegexOptions.IgnoreCase);
        let rgx = /[*.?]|\s+/gi;
        let result = true;
        //ищем типа "неизвестно" и заменяем им
        let defaultAnomalyDescription = 'НЕИЗВЕСТНО,НЕИЗВЕСТНО';
        for (let typeRow of types.rows) {
            let codeDescription = (typeRow.CODE !== undefined) ? typeRow.CODE : '0';
            if (codeDescription == '0') {//нестрогое сравнение
                defaultAnomalyDescription = typeRow.EXTENDED_DESCRIPTION;
                break;
            }
        }
        for (let iliRow of iliData.rows) {
            let iliDescription = iliRow.ANOMALY_TYPE_CL.toString().toUpperCase();
            if (iliRow.SOURCE === 'WLD')
                continue;
            if (iliDescription === '')
                return false;
            let foundType = false;
            let patternMatch = iliDescription.replace(rgx,'.*');   //String patternMatch = rgx.Replace(iliDescription, ".*");
            for (let typeRow of types.rows) {
                let typeDescription = typeRow.EXTENDED_DESCRIPTION.toUpperCase();
                //Match m = Regex.Match(typeDescription, patternMatch);
                if (rgx.test(typeDescription, patternMatch)){
                    foundType = true;
                    break;
                }
            }
            if (!foundType) {
                logger.info("Bad data description: [" + iliDescription + "]");
                iliRow.ANOMALY_TYPE_CL = defaultAnomalyDescription;
                logger.info("Установлено значение по умолчанию [" + defaultAnomalyDescription + "]");
            }
        }
        return result;
    }

    setWeldNums(iliData) {
        let tempIliData = iliData;
        iliData = DB.createEmptyTable();   //iliData.Rows.Clear();
        iliData.rows = [...tempIliData.rows];
        iliData.rows = iliData.rows.sort((a, b) => {
            if(a.ABSOLUTE_ODOMETER === b.ABSOLUTE_ODOMETER)
                return (a.SOURCE === 'WLD') ? -1 : 1;
            else
                return(a.ABSOLUTE_ODOMETER > b.ABSOLUTE_ODOMETER) ? 1 : -1
        });
        //проходим по рядам и выставляем значения weld_number, nominal_wall_thickness
        let prevWeldNum = null;
        let nominalWallThickness = NaN;
        let isFirstWLD = true;
        if(iliData.rows.length > 0)
            isFirstWLD = iliData.rows[0].SOURCE === 'WLD';
        let wld = null;
        let nwt = NaN;
        if(!isFirstWLD){
            //ищем первый WLD
            for(let row of iliData.rows){
                if(row.SOURCE ===  'WLD'){
                    wld =  row.WELD_NUMBER;
                    nwt = parseFloat(row.NOMINAL_WALL_THICKNESS);
                    break;
                }
            }
            prevWeldNum = wld;
            nominalWallThickness = nwt;
        }
        for (let row of iliData.rows) {
            if (row.SOURCE === 'WLD') {
                prevWeldNum = row.WELD_NUMBER;
                nominalWallThickness = parseFloat(row.NOMINAL_WALL_THICKNESS);
                continue;
            }
            row.WELD_NUMBER = prevWeldNum;
            row.NOMINAL_WALL_THICKNESS = MathUtil.toNumber(nominalWallThickness);
        }
        prevWeldNum = null;
        let prevAbsOdometer = null;
        for (let row of iliData.rows) {
            let lc = row.ABSOLUTE_ODOMETER;//parseFloat(row.ABSOLUTE_ODOMETER);
            if (row.SOURCE === 'WLD') {
                if (prevWeldNum !== null) row.US_WELD_NUMBER = prevWeldNum;
                if (prevAbsOdometer !== null) row.US_WELD_ODOMETER = prevAbsOdometer;
                else row.US_WELD_ODOMETER = null;
                prevWeldNum = row.WELD_NUMBER;
                prevAbsOdometer = MathUtil.toNumber(lc);
                continue;
            }
            row.US_WELD_NUMBER = prevWeldNum;
            row.US_WELD_ODOMETER = prevAbsOdometer;
        }
        let nextAbsAdometer = null;
        for (let i = 0; i < iliData.rows.length; i++) {
            let row = iliData.rows[i];
            //ищем следующий элемент WLD и забираем его ABSOLUTE_ODOMETER
            for (let j = i + 1; j < iliData.rows.length; j++) {
                let insideRow = iliData.rows[j];
                if (insideRow.SOURCE === 'WLD') {
                    nextAbsAdometer = insideRow.ABSOLUTE_ODOMETER;//parseFloat(insideRow.ABSOLUTE_ODOMETER);//nextAbsAdometer = ""+Convert.ToDouble(insideRow["ABSOLUTE_ODOMETER"]);
                    break;
                }
            }
            //устанавливаем значение. если попадаем на wld, то обнуляем
            row.DS_WELD_ODOMETER = nextAbsAdometer;
            if (MathUtil.toNumber(nextAbsAdometer) === null)
                continue;
            if (row.SOURCE === 'WLD')
                nextAbsAdometer = null;
        }
        return iliData;
    }

    checkAnomalyTypes(iliData, types) {
        let result = this.checkTypes(iliData, types);
        if (!result) {
            logger.info("Bad data description: [Empty]");
            return "Bad data description: [Empty]";
        }
        return result;
    }

    getFirstWeldNumber(data) {
        let firstRow = null;
        let minLc = Number.MAX_VALUE;
        for (let row of data.rows) {
            let lc = parseFloat(row.ABSOLUTE_ODOMETER);
            let weldNumber = row.WELD_NUMBER.toString();
            if (lc < minLc && weldNumber) {
                firstRow = row;
                minLc = lc;
            }
        }
        return firstRow === null ? null : firstRow.WELD_NUMBER.toString().replace(/\D/g,'');//return firstRow == null ? null : Regex.Replace(firstRow["WELD_NUMBER"].ToString(),@"[^\d]+","")
    }
}
module.exports = IliImportXml;