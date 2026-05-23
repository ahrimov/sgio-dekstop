const Decimal = require('decimal.js');
const MathUtils = require('../../../../utils/MathUtils');
const DB = require('../../db');

class MinMax {
    constructor(min, max) {
        this._min = min;
        this._max = max;
    }

    getMin() {
        return this._min;
    }

    getMax() {
        return this._max;
    }
}

class StoIliInsp {
    constructor(processParameters) {
        this.weldQuantity; // Не делаю целым, чтобы потом не приводить во всех выражениях
        this.sectorLength;
        this.defectsQuantity;
        this.clusterQuantity;
        this.singleDefectsQuantity;
        this.corrDefectsQuantity;
        this.mechDefectsQuantity;
        this.weldingDefectsQuantity;
        // Общие входные данные – константы от пользователя, передаются из формы
        this.s = parseFloat(processParameters.BREAKING_POINT); // Предел прочности, МПа
        this.kn = parseFloat(processParameters.SAFETY_FACTOR_OF_INTERNAL_PRESSURE); // Коэф-т  надежности по  внутреннему рабочему давлению
        this.km = parseFloat(processParameters.SAFETY_FACTOR_OF_WORKING_CONDITIONS); // Коэф-т  условий работы газопровода
        this.kk1 = parseFloat(processParameters.SAFETY_FACTOR_OF_DESTINATION); // Коэф-т надежности по назначению
        this.kkn = parseFloat(processParameters.SAFETY_FACTOR_OF_MATERIAL); // Коэф-т надежности по материалу труб
        this.p = parseFloat(processParameters.PRESSURE); // Рабочее давление, МПа
        this.te = parseFloat(processParameters.LIFETIME); // Срок  эксплуатации, год
        this.tvtd = parseFloat(processParameters.LIFETIME); // Срок  эксплуатации, год
        this.z01 = parseFloat(processParameters.AVERAGE_COST_OF_RESPONDING); // Значение средних затрат на ликвидацию последствий одного отказа на участке МГ, млн.руб
        this.sp1 = parseFloat(processParameters.COST_OF_REPLACING_A_PIPE); // Значение затрат на замену одной трубы, млн.руб
        this.svtd = parseFloat(processParameters.COST_OF_THE_ILI_PER_KM); // Значение затрат на проведение ВТД на одином километре участка МГ, млн.руб
        this.ssh = parseFloat(processParameters.COST_PER_HOLE); // Значение затрат на одно шурфование, млн.руб
        this.zpi = parseFloat(processParameters.COST_OF_REPAIR_PER_KM); // Затраты на капитальный ремонт одного километра газопровода, млн.руб
        // Общие константы
        this.pi = 3.141516; // Коэффициент Пи
        this.v = 0.3; // Коэффициент Пуассона
        // Какие-то кэффициенты без описания
        this.m11 = 0.3;
        this.n0 = 7;
        this.my = 3;
        this.c1 = 1.181e8;
        this.c2 = 1.235e5;
        this.c3 = 0.935;
        this.c4 = 0.0187;
        this.b = 11.4;
        this.valuesForAdducion = this.fillValuesForAdducion();
    }

    adductionResult(resultRow, resultTable) {
        for (const column of resultTable.columns) {
            if (this.valuesForAdducion.has(column.name)) {
                let limits = this.valuesForAdducion.get(column.name);
                if (limits !== null && resultRow[column.name] !== null) {
                    let value = MathUtils.convertToDouble(resultRow[column.name]);
                    if (value < limits.getMin()) {
                        value = limits.getMin();
                        resultRow[column.name] = value;
                    }
                    if (value > limits.getMax()) {
                        value = limits.getMax();
                        resultRow[column.name] = value;
                    }
                }
            }
        }
    }

    rankAdduction(rank) {
        let result = rank;
        if (result > 1) result = 1;
        return result;
    }

    setSectorInfo(beginMeasure, endMeasure, iliTab, weldsTab, inspRow) {
        this.sectorLength = MathUtils.convertToDouble(inspRow.SECTOR_LENGTH) / 1000;
        this.weldQuantity = 0;
        this.defectsQuantity = 0;
        this.clusterQuantity = 0;
        this.singleDefectsQuantity = 0;
        this.corrDefectsQuantity = 0;
        this.mechDefectsQuantity = 0;
        this.weldingDefectsQuantity = 0;
        for (const row of iliTab.rows) {
            let measure = MathUtils.convertToDouble(row.MEASURE); // линейная дистанция
            // Проверяю, что дефект/кластер внутри обрабатываемого участка
            if (measure >= beginMeasure && measure <= endMeasure) {
                if (MathUtils.convertToDouble(row.IS_CLUSTER) === -1) // Одиночный дефект
                    this.singleDefectsQuantity++;
                if (MathUtils.convertToDouble(row.IS_CLUSTER) === 0) // Сам кластер
                    this.clusterQuantity++;
                if (MathUtils.convertToDouble(row.IS_CLUSTER) === -1 || MathUtils.convertToDouble(row.IS_CLUSTER) === 0) { // для одиночных дефектов и кластеров соберу просто статистику по их видам
                    switch (row.ANOMALY_EXTENSION_CL) {
                        case 'ANOMALY_EXT_001':
                        case 'ANOMALY_EXT_002':
                        case 'ANOMALY_EXT_007':
                            this.corrDefectsQuantity++;
                            break;
                        case 'ANOMALY_EXT_006':
                            this.mechDefectsQuantity++;
                            break;
                        case 'ANOMALY_EXT_009':
                            this.weldingDefectsQuantity++;
                            break;
                    }
                }
            }
        }
        this.defectsQuantity = this.singleDefectsQuantity + this.clusterQuantity;
        for (const row of weldsTab.rows) {
            let measure = MathUtils.convertToDouble(row.MEASURE); // линейная дистанция
            // Проверяю, что шов внутри обрабатываемого участка
            if (measure >= beginMeasure && measure <= endMeasure) this.weldQuantity++;
        }
    }

    applicationMin(dataTab, key) {
        let result = Number.MAX_VALUE;
        // Проход только по одиночным дефектам!
        for (const row of dataTab.rows) {
            if (row[key] !== null) // не пустое значение
                result = Math.min(result, MathUtils.convertToDouble(row[key]));
        }
        return result;
    }

    // СТО Газпром 2-2.3-292-2007
    calc_sto_2_2_3_292_2007(ds) {
        // Данные для расчета
        let inspTab = ds.Tables.INSP;
        let iliTab = ds.Tables.ILI;
        let weldsTab = ds.Tables.WELDS;
        let year1; // переменная добавлена 23.04.16 для зранения данных с опросного листа
        year1 = -1;
        // Проход по участкам разбитого обследования для оценки
        for (const inspRow of inspTab.rows) {
            let beginMeasure = MathUtils.convertToDouble(inspRow.MEASURE_BEGIN); // Начало участка
            let endMeasure = MathUtils.convertToDouble(inspRow.MEASURE_END); // Конец участка
            let reportDate = new Date(inspRow.BEGIN_DATE); // Дата отчета
            let years = this.te;
            if (inspRow.INSTALL_DATE !== null) // Дата установки газопровода
                years = MathUtils.evenRound((reportDate - Date.parse(inspRow.INSTALL_DATE)) / 31536000000, 1);// 31536000000= 1000*60*60*24*365 (из миллесекунд в год);//years = Math.Round((reportDate - (DateTime)inspRow["INSTALL_DATE"]).TotalDays / 365, 1);
            this.setSectorInfo(beginMeasure, endMeasure, iliTab, weldsTab, inspRow);
            // Переменные для результата расчета
            let pt = NaN; // Показатель технического состояния труб
            let df = NaN; // Поврежденность ЛЧ МГ, за время эксплуатации от действия переменных эксплуатационных нагрузок
            let pvtd = NaN; // Показатель технического состояния ЛЧ МГ по результатам ВТД
            // Переменные расчета
            let koldeftr; let koldeftr04; let dk = 0; let dz = 0; let dc = 0; let dg = 0; let dd = 0; let qkc; let gpr; let qi; let st; let qe; let dy; let dn = 0; let ntr = 0; let t = 0; let c1; let c2; let c3; let c4; let my; let vsh; let 
psh;
            let prdef = NaN; // Процент дефектных труб
            let prdef04 = NaN; // Процент дефектных труб с рангом опасности дефектов больше 0,4
            koldeftr = 0;
            koldeftr04 = 0;
            my = 3;
            c1 = 1.181 * 10**8;
            c2 = 1.235 * 10**5;
            c3 = 0.935;
            c4 = 0.0187;
            vsh = 0.5;
            // Проход по дефектам и кластерам
            for (const iliRow of iliTab.rows) {
                // Пропускаю дефекты, вошедшие в кластер, и дефекты без ранга
                if (iliRow.STO_292_2007_DANGER_RANK === null || MathUtils.convertToDouble(iliRow.IS_CLUSTER) === 1) continue;
                // Получение параметров с конкретного дефекта
                let deftype = iliRow.ANOMALY_EXTENSION_CL.toString(); // Тип дефекта
                let rank = NaN; // Ранг опасности дефекта
                if (Number(iliRow.STO_292_2007_DANGER_RANK) !== null) rank = MathUtils.convertToDouble(iliRow.STO_292_2007_DANGER_RANK);
                rank = this.rankAdduction(rank);
                ntr = this.weldQuantity; // Количество труб, изменил, теперь берется с участка, а не с обследования
                dn = MathUtils.convertToDouble(iliRow.NOMINAL_DIAMETER_GCL); // Диаметр трубопровода
                t = MathUtils.convertToDouble(iliRow.NOMINAL_WALL_THICKNESS); // Толщина стенки трубопровода
                let measure = MathUtils.convertToDouble(iliRow.MEASURE); // Линейная дистанция
                // Проверяю, что дефект/кластер внутри обрабатываемого участка
                if (measure >= beginMeasure && measure <= endMeasure) {
                    /* Собственно расчет по СТО
                    *******************************************************************
                    ранг опасности
                    подсчитывает количество дефектов рангом опасности >0.4 */
                    if (rank > 0.4) koldeftr04 = koldeftr04 + 1;
                    // подсчитывает количество дефектных труб
                    if (rank > 0) koldeftr = koldeftr + 1;
                    // суммирование рангов
                    if (deftype === 'ANOMALY_EXT_001' || deftype === 'ANOMALY_EXT_002' || deftype === 'ANOMALY_EXT_007') dk = dk + rank;
                    else if (deftype === 'ANOMALY_EXT_009') dz = dz + rank;
                    else if (deftype === 'ANOMALY_EXT_005') dc = dc + rank;
                    else if (deftype === 'ANOMALY_EXT_003') dg = dg + rank;
                    else if (deftype === 'ANOMALY_EXT_006') dd = dd + rank;
                    // 24.03.16 - учет срока с ремонта по опросному листу: если по поросному листу срок эксплуатации меньеш общего параметра(25) то принимаем его в пределах рассматриваемого участка
                    if (iliRow.PAR_DATE_BEGIN_EXP !== null) // Дата установки газопровода
                        if (year1 === -1) years = MathUtils.evenRound((reportDate - Date.parse(iliRow.PAR_DATE_BEGIN_EXP)) / 31536000000, 1);
                        else {
                            year1 = MathUtils.evenRound((reportDate - Date.parse(iliRow.PAR_DATE_BEGIN_EXP)) / 31536000000, 1);
                            if (year1 < years) years = year1;
                        } // 24.03.16 - конец
                }
            }
            //  расчет показателей поврежденности от различных дефектов
            prdef04 = koldeftr04 * 100 / ntr;
            prdef = koldeftr * 100 / ntr;
            psh = dd / ntr;
            qkc = this.p * (dn - 2 * t) / (2 * t); // 5.16
            gpr = this.m11 * qkc;
            qi = Math.sqrt(qkc**2 - qkc * gpr + gpr**2);
            st = 1 / my;
            qe = (c1 + c2 * qi * Math.pow(this.n0, st) / Math.sqrt(1 - this.m11 + Math.pow(this.m11, 2)))**st / (c3 + c4 * (dn / t)**st);
            dy = qe**my / 10**this.b;
            df = dy * years;// te;
            pt = 1 - ((1 - dc / ntr) * (1 - dk / ntr) * (1 - dg / ntr) * (1 - dz / ntr));
            pvtd = 1 - (1 - pt) * (1 - vsh * psh) * (1 - df**2);
            // Помещаю результат в таблицу
            inspRow.STO_292_2007_DAMAGE_MECHANICAL = MathUtils.toNumber(dz / ntr); // Поврежденность ЛЧ МГ от механических повреждений
            inspRow.STO_292_2007_VALUE_WELD = MathUtils.toNumber(dd / ntr); // Показатель технического состояния сварных соединений
            inspRow.STO_292_2007_DAMAGE_CRACK = MathUtils.toNumber(dc / ntr); // Поврежденность ЛЧ МГ, характеризующая наличие трещин
            inspRow.STO_292_2007_DAMAGE_CORROSION = MathUtils.toNumber(dk / ntr); // Поврежденность ЛЧ МГ от коррозии
            inspRow.STO_292_2007_DAMAGE_DENT = MathUtils.toNumber(dg / ntr); // Поврежденность ЛЧ МГ, связанная с наличием дефектов типа гофр и вмятин
            inspRow.STO_292_2007_VALUE_PIPE = MathUtils.toNumber(pt); // Показатель технического состояния труб
            inspRow.STO_292_2007_DAMAGE_DUTY_VAR = MathUtils.toNumber(df); // Поврежденность ЛЧ МГ, за время эксплуатации от действия переменных эксплуатационных нагрузок
            inspRow.STO_292_2007_VALUE_CONDITION = MathUtils.toNumber(pvtd); // Показатель технического состояния ЛЧ МГ по результатам ВТД
            this.adductionResult(inspRow, inspTab);
        }
        return ds.Tables.INSP;
    }

    calc_sto_2_2_3_401_2003(ds) {
        let inspTab = ds.Tables.INSP;
        let iliTab = ds.Tables.ILI;
        let weldsTab = ds.Tables.WELDS;
        let year1; // переменная добавлена 23.04.16 для зранения данных с опросного листа
        year1 = -1;
        // Проход по участкам разбитого обследования для оценки
        for (let i = 0; i < inspTab.rows.length; i++) {
            let inspRow = inspTab.rows[i];// Текущая запись участка
            let beginMeasure = MathUtils.convertToDouble(inspRow.MEASURE_BEGIN); // Начало участка
            let endMeasure = MathUtils.convertToDouble(inspRow.MEASURE_END); // Конец участка
            this.setSectorInfo(beginMeasure, endMeasure, iliTab, weldsTab, inspRow);
            let reportDate = new Date(inspRow.BEGIN_DATE); // Дата отчета
            let years = this.te;
            if (inspRow.INSTALL_DATE !== null) // Дата установки газопровода
                years = MathUtils.evenRound((reportDate - Date.parse(inspRow.INSTALL_DATE)) / 31536000000, 1);
            // Замена служебному листу, будет несколько таблиц
            // #region DeclareTables
            let localDataSet = { // System.Data.DataSet LocalDataSet = new DataSet();
                baseKRN: {}, // DataTable baseKRN = new DataTable("baseKRN");localDataSet.Tables.Add(baseKRN);
                baseOKD: {},
                uniqueKRN: {},
                uniqueOKD: {},
                totalCosts: {},
            };
            localDataSet.baseKRN = DB.createEmptyTable();
            localDataSet.baseOKD = DB.createEmptyTable();
            localDataSet.uniqueKRN = DB.createEmptyTable();
            localDataSet.uniqueOKD = DB.createEmptyTable();
            localDataSet.totalCosts = DB.createEmptyTable();
            let { baseKRN, baseOKD, uniqueKRN, uniqueOKD, totalCosts } = localDataSet;
            // Переменные расчета*/
            let max = 0; let m025 = 0; let m04 = 0; let y0 = 0; let n0 = 0; let pver = 0; let vp = 0; let vn = 0; let ydt = 0; let ndt = 0; let nt0 = 0;
				let rp = 0; let k0 = 0; let z0 = 0; let zp = 0; let vk = 0; let nsh = 0; let zsh = 0; let zstress = 0; let zsym = 0; let minZsym = 0;
				let texp = 0; let tn = 0; let k01 = 0; let k12 = 11.52; let dl = 100; let ffX = 0; let 
dtX = 0;
            // dl тут не красиво, но так запрос устроен,
            // ff вообще хз что такое   будет ffX
            // dt дважды декларировано, будет dtX
            let pipenum_1; let pipenum_2; let 
nom;
            // Проход по дефектам и кластерам
            for (let j = 0; j < iliTab.rows.length; j++) {
                let iliRow = iliTab.rows[j]; // Текущая запись
                // Пропускаю дефекты, вошедшие в кластер, и дефекты без ранга
                if (iliRow.STO_292_2007_DANGER_RANK === null || MathUtils.convertToDouble(iliRow.IS_CLUSTER) === 1) continue;
                // Получение параметров с конкретного дефекта
                let measure = MathUtils.convertToDouble(iliRow.MEASURE); // Линейная дистанция
                let deftype = iliRow.ANOMALY_EXTENSION_CL.toString(); // Тип дефекта
                let pipenum = iliRow.WELD_NUMBER.toString(); // Номер трубы
                let rank = NaN; // Ранг опасности дефекта
                if (iliRow.STO_292_2007_DANGER_RANK !== null) rank = MathUtils.convertToDouble(iliRow.STO_292_2007_DANGER_RANK);
                rank = this.rankAdduction(rank);
                dl = this.sectorLength; // Длина участка, км Изменил, так как теперь длина участка берется не с самого обследовани
                // Проверяю, что дефект/кластер внутри обрабатываемого участка
                if (measure >= beginMeasure && measure <= endMeasure) {
                    if (deftype === 'ANOMALY_EXT_001' || deftype === 'ANOMALY_EXT_007') { // ищет коррозию
                        // осуществляет запись на лист "Служебный" номера труб и ранги опасности с коррозии
                        let row = {};
                        row.WELD_NUMBER = pipenum;
                        row.RANK = rank;
                        baseOKD.rows.push(row);
                    } else if (deftype === 'ANOMALY_EXT_005') { // ищет КРН
                        // осуществляет запись на лист "Служебный" номера труб и ранги опасности КРН
                        let row = {};
                        row.WELD_NUMBER = pipenum;
                        baseKRN.rows.push(row);
                    }
                    // 24.03.16 - учет срока с ремонта по опросному листу: если по поросному листу срок эксплуатации меньеш общего параметра(25) то принимаем его в пределах рассматриваемого участка
                    if (iliRow.PAR_DATE_BEGIN_EXP !== null) if (year1 === -1) years = MathUtils.evenRound((reportDate - Date.parse(iliRow.PAR_DATE_BEGIN_EXP)) / 31536000000, 1);
                        else {
                            year1 = MathUtils.evenRound((reportDate - Date.parse(iliRow.PAR_DATE_BEGIN_EXP)) / 31536000000, 1);
                            if (year1 < years) years = year1;
                        }
                    // 24.03.16 - конец
                }
            }
            // формирование списка уникальных труб с  КРН (без дублей)
            pipenum_1 = '';
            pipenum_2 = '';
            for (let ff = 0; ff < baseKRN.rows.length; ff++) {
                let kRNRow = baseKRN.rows[ff]; // Текущая запись участка
                pipenum_1 = kRNRow.WELD_NUMBER.toString();
                if (pipenum_1.localeCompare(pipenum_2) !== 0) {
                    pipenum_2 = pipenum_1;
                    let row = {};
                    row.WELD_NUMBER = pipenum_1;
                    uniqueKRN.rows.push(row);
                }
            }
            // формирование списка уникальных труб с коррозией
            let f = 0;
            while (f < baseOKD.rows.length) {
                if (f === baseOKD.rows.length - 1
                    || baseOKD.rows[f].WELD_NUMBER !== baseOKD.rows[f + 1].WELD_NUMBER) {
                    // Тут в исходном алгоритме странность, берется номер трубы не с той ячейки
                    let row = {};
                    row.WELD_NUMBER = baseOKD.rows[f].WELD_NUMBER;
                    row.RANK = baseOKD.rows[f].RANK;
                    try {
                        uniqueOKD.rows.push(row);
                    } catch (ex) {
                        // У отчета дублируются швы, проблема, 14/01/2013 решили пока пропускать такие швы
                    }
                    f++;
                } else {
                    nom = baseOKD.rows[f].WELD_NUMBER; // номер трубы
                    max = 0;
                    if (baseOKD.rows[f].RANK !== null) max = MathUtils.convertToDouble(baseOKD.rows[f].RANK); // max = convertToDouble(BaseOKD.Rows[f]["RANK"]);//наибольший ранг опасности дефекта коррозия
                    while (f < baseOKD.rows.length - 1
                        && baseOKD.rows[f].WELD_NUMBER === baseOKD.rows[f + 1].WELD_NUMBER) {
                        if (baseOKD.rows[f + 1].RANK !== null
                            && MathUtils.convertToDouble(baseOKD.rows[f + 1].RANK) > max) { // convertToDouble(BaseOKD.Rows[f + 1]["RANK"]) > max)
                            max = MathUtils.convertToDouble(baseOKD.rows[f + 1].RANK); // наибольший ранг опасности
                            nom = baseOKD.rows[f + 1].WELD_NUMBER; // номер трубы
                        }
                        f++;
                    }
                    let row = {};
                    row.WELD_NUMBER = nom;
                    row.RANK = max;
                    try {
                        uniqueOKD.rows.push(row);
                    } catch (ex) {
                        // У отчета дублируются швы, проблема, 14/01/2013 решили пока пропускать такие швы
                    }
                    f++;
                }
            }
            // п. 5.6 Определение количества труб с дефектами с рангами опасности более 0,25 и 0,4
            m025 = 0; // Количество труб с коррозионными дефектами, имеющими ранг опасности больше 0.25
            m04 = 0; // Количество труб с коррозионными дефектами, имеющими ранг опасности больше 0.4
            // цикл перебора дефектов (для уникальных труб с дефектами коррозии), переменная цикла z
            for (let z = 0; z < uniqueOKD.rows.length; z++) {
                // Если ранг опасности больше 0.25 тогда ищет следующий и подсчитывает общее количество
                if (MathUtils.convertToDouble(uniqueOKD.rows[z].RANK) > 0.25) m025++;
                // Если ранг опасности больше 0.25 тогда ищет следующий и подсчитывает общее количество
                if (MathUtils.convertToDouble(uniqueOKD.rows[z].RANK) > 0.4) m04++;
            }
            // п. 5.7 Расчет параметра показательного закона распределения рангов опасности коррозии
            //  !!! Не выполняется, если m04<1, так как на НОЛЬ делить НЕЛЬЗЯ
            if (m04 < 1) { //  ( + «Or m025 < 25» - условие из расчета Шумилина – по СТО не найдено)
                // MsgBox "Дефекты с высоким рангом опасности - отсутствуют";
                continue; // выход из процедуры — переходим к следующему расчету
            }
            // выход из процедуры — переходим к следующему расчету
            if (m025 === m04) {
                continue; // выход из процедуры — переходим к следующему расчету
            }
            y0 = 0.15 / Math.log(m025 / m04); // Параметр распределения опасных коррозионных дефектов, ф. 5.4
            n0 = m025 / Math.exp(-0.25 / y0); // п. 5.8 Общее количество труб с коррозией на ЛЧ МГ
            k01 = n0 * Math.exp(-k12) * (Math.exp(-0.2 * (1 / y0 - k12)) - Math.exp(-0.5 * (1 / y0 - k12))) / (1 - k12 * y0); //  По Шумилину
            pver = 1 - Math.exp(-k01);
            vp = y0 / years; // tvtd; // п. 6.5 скорость изменения параметра закона распределения рангов опасности коррозии
            vn = n0 / years;// tvtd;  // п. 6.6 Скорость изменения общего количества труб с коррозией, шт/год
            // таблица затрат на ВТД и количества заменяемых труб в зависимости от интервала между обследованиями
            ffX = uniqueKRN.rows.length;
            for (let dt = 1; dt <= 6; dt += 0.1) { // временной интервал между обследованиями
                ydt = y0 + vp * dt;
                ndt = n0 + vn * dt;
                nt0 = ndt * (this.z01 / (this.sp1 - this.ssh) * Math.exp(-k12))**(1 / (k12 * ydt)); // Число заменяемых труб, шт.
                rp = -ydt * Math.log(nt0 / ndt);
                k0 = ndt * Math.exp(-k12) * (Math.exp(-0.2 * (1 / ydt - k12)) - Math.exp(-rp * (1 / ydt - k12))) / (1 - k12 * ydt);
                z0 = 1000 * this.z01 * k0 / (dt * dl);
                zp = 1000 * this.sp1 * nt0 / (dt * dl);
                vk = -2 * Math.log(1 / n0) * y0 / years; // tvtd;
                nsh = n0 * Math.exp(-(0.5 - vk * dt) / y0);
                zsh = 1000 * this.ssh * (nsh - nt0) / (dt * dl);
                zstress = 1000 * (ffX) / (dt * dl);
                zsym = z0 + zp + zsh + zstress + this.svtd / dt; // Суммарные затраты на ВТД, млн. руб в год на 1 км
                // надо делать массив
                let row = {};
                row.PIPIES_TO_CHANGE = nt0;
                row.COST_PER_KM_YEAR = zsym;
                row.OPTIMAL_TIME = dt;
                totalCosts.rows.push(row);
            }
            minZsym = this.applicationMin(totalCosts, 'COST_PER_KM_YEAR'); // Emulating Excel Ranged Min
            // определяет оптимальный интервал между ВТД, число заменяемых труб по соответствующим минимальным затратам
            for (let v = 0; v < totalCosts.rows.length; v++) {
                let costRow = totalCosts.rows[v]; // Текущая запись
                if (costRow.COST_PER_KM_YEAR !== null && MathUtils.convertToDouble(costRow.COST_PER_KM_YEAR) === minZsym) {
                    nt0 = MathUtils.convertToDouble(costRow.PIPIES_TO_CHANGE); // Число заменяемых труб, шт. (при оптимальном времени до проведения ВТД)
                    dtX = MathUtils.convertToDouble(costRow.OPTIMAL_TIME); // Оптимальное время до проведения ВТД
                }
            }
            texp = this.zpi / (4 * minZsym); // Предельный срок эксплуатации линейного участка МГ до вывода в капитальный ремонт, лет
            tn = -(1 / Math.log((1 + nt0) / n0) + y0) * years /* tvtd */ / (2 * y0); // Время наработки на отказ после ремонта участка, лет
            // Помещаю результат в таблицу
            inspRow.STO_401_2003_OP_REP_PIPE_COUNT = nt0; // Оптимальное количество заменяемых труб
            inspRow.STO_401_2003_TIME_LIMIT_EXPL = texp; // Предельный срок эксплуатации ЛЧ МН до вывода в капительный ремонт
            inspRow.STO_401_2003_MEAN_TIME_FAIL = tn; // Время наработки на отказ после капитального ремонта
            inspRow.STO_401_2003_PIPE_Q_RANK_G_04 = m04; // Количество труб с рангом опасности >=0.4
            inspRow.STO_401_2003_POSSIBLE_FALUTS = k01; // Число возможных отказов на участке
            inspRow.STO_401_2003_FAILURE_PROBABLY = pver; // Вероятность отказа линейного участка МГ  после ремонта
            inspRow.STO_401_2003_MIN_UNIT_COST_YKM = minZsym; // Минимум удельных затрат в год на 1 км,  млн. руб
            inspRow.STO_401_2003_OPTIM_TIM_BFR_ILI = dtX; // Оптимальное время до проведения ВТД, год
            this.adductionResult(inspRow, iliTab);
        }
        return ds.Tables.INSP;
    }

    calc_sto_2_2_3_095_2007(ds) {
        // Данные для расчета
        let inspTab = ds.Tables.INSP;
        const iliTab = ds.Tables.ILI;
        const weldsTab = ds.Tables.WELDS;
        let year1 = -1; // переменная добавлена 23.04.16 для зранения данных с опросного листа
        // Проход по участкам разбитого обследования для оценки
        for (let i = 0; i < inspTab.rows.length; i++) {
            // Переменные для результата расчета
            let qkrn = NaN; // Параметр распределения относительной глубины стресс-коррозионных дефектов
            let qokd = NaN; // Параметр распределения относительной глубины коррозионных дефектов
            let nkrn = NaN; // Прогнозируемое число стресс-коррозионных дефектов
            let nokd = NaN; // Прогнозируемое число коррозионных дефектов
            let Texp_krn = NaN; // Срок  до проведения повторной ВТД для обнаружения стресс-коррозионных дефектов
            let Texp_okd = NaN; // Срок  до проведения повторной ВТД для обнаружения коррозионных дефектов
            let Texp_095 = NaN; // Срок  до проведения очередной ВТД
            // Переменные расчета
            let z095 = 8; let m02 = 0; let m03 = 0; let m015 = 0; let m030 = 0; let Vgokd; let 
Vgkrn;
            let d = 0; // не должно определяться тут!!! ошибка!!!
            let inspRow = inspTab.rows[i]; // Текущая запись участка
            let beginMeasure = MathUtils.convertToDouble(inspRow.MEASURE_BEGIN); // Начало участка
            let endMeasure = MathUtils.convertToDouble(inspRow.MEASURE_END); // Конец участка
            this.setSectorInfo(beginMeasure, endMeasure, iliTab, weldsTab, inspRow);
            let reportDate = new Date(inspRow.BEGIN_DATE); // Дата отчета
            let years = this.te;
            if (inspRow.INSTALL_DATE !== null) // Дата установки газопровода
                years = MathUtils.evenRound((reportDate - Date.parse(inspRow.INSTALL_DATE)) / 31536000000, 1);
            // Проход по дефектам и кластерам
            for (let j = 0; j < iliTab.rows.length; j++) {
                let iliRow = iliTab.rows[j]; // Текущая запись
                // Пропускаю дефекты, вошедшие в кластер, и дефекты без ранга
                if (iliRow.STO_292_2007_DANGER_RANK === null || iliRow.IS_CLUSTER === 1) continue;
                // Получение параметров с конкретного дефекта
                let deftype = iliRow.ANOMALY_EXTENSION_CL; // Тип дефекта
                d = MathUtils.convertToDouble(iliRow.AVERAGE_DEPTH); // Глубина дефекта в %
                let measure = MathUtils.convertToDouble(iliRow.MEASURE); // Линейная дистанция
                //  Проверяю, что дефект/кластер внутри обрабатываемого участка
                if (measure >= beginMeasure && measure <= endMeasure) {
                    if (deftype === 'ANOMALY_EXT_005') { // если стресс-коррозия
                        if (d > 20) // если глубина дефекта больше или равна 20%
                            m02 = m02 + 1; // подсчитываем количество таких дефектов
                        if (d > 30) // если глубина дефекта больше или равна 30%
                            m03 = m03 + 1; // подсчитываем количество таких дефектов
                    }
                    if (deftype === 'ANOMALY_EXT_001'
                        || deftype === 'ANOMALY_EXT_002'
                        || deftype === 'ANOMALY_EXT_007') { // если коррозия
                        if (d > 15) // если глубина дефекта больше или равна 15%
                            m015 = m015 + 1;// подсчитываем количество таких дефектов
                        if (d > 30)// если глубина дефекта больше или равна 30%
                            m030 = m030 + 1;// подсчитываем количество таких дефектов
                    }
                    z095 = z095 + 1;
                    // 24.03.16 - учет срока с ремонта по опросному листу: если по поросному листу срок эксплуатации меньеш общего параметра(25) то принимаем его в пределах рассматриваемого участка
                    if (iliRow.PAR_DATE_BEGIN_EXP !== null) { // Дата установки газопровода
                        let ys = MathUtils.evenRound((reportDate - Date.parse(iliRow.PAR_DATE_BEGIN_EXP)) / 31536000000, 1);
						if (year1 === -1) years = ys;
                        else {
                            year1 = ys;
                            if (year1 < years) years = year1;
                        }
                    }
                    // 24.03.16 - конец
                }
            }
            // Расчет выходных данных
            if (m02 >= 20) { // если при ВТД обнаружено более 20 дефектов КРН с глубиной более 20%, тогда выполняем расчет
                qkrn = 0.1 / Math.log(m02 / m03); // п. 8.3.1
                nkrn = m02 / Math.exp(-0.2 / qkrn); // п. 8.3.1
                Vgkrn = qkrn / years; // te; //скорость изменения параметра распределения qkrn
                Texp_krn = -((0.3 / Math.log((1 + m02) / nkrn)) + qkrn) / (3 * Vgkrn);// п. 8.3.3
            } else Texp_krn = 5;
            if (m015 >= 20 && m030 > 0) { // если при ВТД обнаружено более 20 дефектов ОКД с глубиной более 15%, тогда выполняем расчет
                qokd = 0.15 / Math.log(m015 / m030); // п. 8.3.2
                nokd = m015 / Math.exp(-0.15 / qokd); // п. 8.3.2
                Vgokd = qokd / (years - 8); // скорость изменения параметра распределения qkrn
                //! ! за планируемые к ремонту дефекты приняты все коррозии глубиной более 30% - возможно необходимо брать другую глубину к ремонту
                Texp_okd = -((0.4 / Math.log((1 + m030) / nokd)) + qokd) / Vgokd; // п. 8.3.4
            } else Texp_okd = 5;
            // Если расчетное число более 5 лет, то принимают 5 лет
            if (Texp_krn > 5) Texp_krn = 5;
            if (Texp_okd > 5) Texp_okd = 5;
            // Время проведения ВТД в случае пропуска двух снарядов - продольного и поперечного намагничивания
            Texp_095 = Math.min(Texp_krn, Texp_okd); // 8.3.4.8
            // Помещаю результат в таблицу
            inspRow.STO_095_2007_DISTR_DEPTH_SCC = MathUtils.toNumber(qkrn); // Параметр распределения относительной глубины стресс-коррозионных дефектов
            inspRow.STO_095_2007_DISTR_DEPTH_COR = MathUtils.toNumber(qokd); // Параметр распределения относительной глубины коррозионных дефектов
            inspRow.STO_095_2007_PROJECTED_SCC = MathUtils.toNumber(nkrn); // Прогнозируемое число стресс-коррозионных дефектов
            inspRow.STO_095_2007_PROJECTED_COR = MathUtils.toNumber(nokd); // Прогнозируемое число коррозионных дефектов
            inspRow.STO_095_2007_NEXT_INSP_SCC = MathUtils.toNumber(Texp_krn); // Срок до проведения повторной ВТД для обнаружения стресс-коррозионных дефектов
            inspRow.STO_095_2007_NEXT_INSP = MathUtils.toNumber(Texp_okd); // Срок до проведения повторной ВТД для обнаружения коррозионных дефектов
            inspRow.STO_095_2007_NEXT_ILI_INSP = MathUtils.toNumber(Texp_095); // Срок до проведения очередной ВТД
            this.adductionResult(inspRow, iliTab);
        }
        return ds.Tables.INSP;
    }

    calc_sto_xxx(ds) {
        // Данные для расчета
        let inspTab = ds.Tables.INSP;
        const iliTab = ds.Tables.ILI;
        const weldsTab = ds.Tables.WELDS;
        // Проход по участкам разбитого обследования для оценки
        for (let i = 0; i < inspTab.rows.length; i++) {
            let inspRow = inspTab.rows[i]; // Текущая запись участка
            // Входные данные
            let beginMeasure = MathUtils.convertToDouble(inspRow.MEASURE_BEGIN); // Начало участка
            let endMeasure = MathUtils.convertToDouble(inspRow.MEASURE_END); // Конец участка
            this.setSectorInfo(beginMeasure, endMeasure, iliTab, weldsTab, inspRow);
            let m04 = 0;
            if (inspRow.STO_401_2003_PIPE_Q_RANK_G_04 !== null) m04 = MathUtils.convertToDouble(inspRow.STO_401_2003_PIPE_Q_RANK_G_04); 	// Количество труб с рангом опасности >=0.4
            let pvtd = 0;
            if (inspRow.STO_292_2007_VALUE_CONDITION !== null) pvtd = MathUtils.convertToDouble(inspRow.STO_292_2007_VALUE_CONDITION); 	// Показатель технического состояния ЛЧ МГ по результатам ВТД
            let k01 = 0;
            if (inspRow.STO_401_2003_POSSIBLE_FALUTS !== null) k01 = MathUtils.convertToDouble(inspRow.STO_401_2003_POSSIBLE_FALUTS); 	// Число возможных отказов на участке
            let texp = 0;
            if (inspRow.STO_401_2003_TIME_LIMIT_EXPL !== null) texp = MathUtils.convertToDouble(inspRow.STO_401_2003_TIME_LIMIT_EXPL); 	// Предельный срок эксплуатации ЛЧ МН до вывода в капительный ремонт
            let tn = 0;
            if (inspRow.STO_401_2003_MEAN_TIME_FAIL !== null) tn = MathUtils.convertToDouble(inspRow.STO_401_2003_MEAN_TIME_FAIL); // Время наработки на отказ после капитального ремонта
            // Переменные для результата расчета
            let p1 = NaN; // Приоритет вывода в ремонт по показателю ТС
            let p2 = NaN; // Приоритет вывода в ремонт по времени эксплуатации до вывода в капитальный ремонт
            let p3 = NaN; // Приоритет вывода в ремонт по вероятности отказа
            let p4 = NaN; // Приоритет вывода в ремонт по времени наработки на отказ
            let pn = NaN; // Суммарный приоритет вывода в ремонт участка

            // Расчет
            // Приоритет вывода в ремонт  участка МГ по вероятности отказа (расчетное ограничение)
            if (1 - Math.exp(-k01) > 0.25) p2 = 1;
            else p2 = (1 - Math.exp(-k01)) / 0.25;
            // Приоритет вывода в ремонт участка МГ по времени наработки до отказа(расчетное ограничение)
            if (tn < 5) p3 = 1;
            else p3 = 5 / tn;
            // Приоритет вывода в ремонт участка МГ по времени эксплуатации до вывода в капитальный ремонт( расчетное ограничение)
            if (texp < 5) p4 = 1;
            else p4 = 5 / texp;
            if (m04 < 1) { // (убрано условие по шумилину без ссылки на СТО + «Or m025 < 25»)
                p2 = 0.01 / 0.15;
                p3 = 10 / 40;
                p4 = 5 / 30;
                texp = 30; // Предельный срок эксплуатации линейного участка МГ до вывода в капитальный ремонт
                tn = 40; // Время наработки на отказ после кап.ремонта
            }
            // Приоритет вывода в ремонт участка МГ по показателю технического состояния
            if (pvtd > 0.3) p1 = 1;
            else p1 = pvtd / 0.3;

            // Суммарный приоритет вывода в ремонт участка
            pn = 0.6 * p1 + 0.1 * p2 + 0.1 * p3 + 0.2 * p4;

            // Помещаю результат в таблицу
            inspRow.PRIORITY_COND = MathUtils.toNumber(p1); // Приоритет вывода в ремонт по показателю ТС
            inspRow.PRIORITY_TIME_EXP = MathUtils.toNumber(p2); // Приоритет вывода в ремонт по времени эксплуатации до вывода в капитальный ремонт
            inspRow.PRIORITY_PROBAB = MathUtils.toNumber(p3); // Приоритет вывода в ремонт по вероятности отказа
            inspRow.PRIORITY_TIME_FAI = MathUtils.toNumber(p4); // Приоритет вывода в ремонт по времени наработки на отказ
            inspRow.PRIORITY_SUMMARY = MathUtils.toNumber(pn); // Суммарный приоритет вывода в ремонт участка
            inspRow.STO_401_2003_TIME_LIMIT_EXPL = texp; // Предельный срок эксплуатации ЛЧ МН до вывода в капительный ремонт
            inspRow.STO_401_2003_MEAN_TIME_FAIL = tn; // Время наработки на отказ после капитального ремонта
            this.adductionResult(inspRow, iliTab);
        }
        return ds.Tables.INSP;
    }

    fillValuesForAdducion() {
        let valuesForAdducion = new Map();
        // Инициализация глючащего словаря
        valuesForAdducion.set('STO_292_2007_DAMAGE_MECHANICAL', new MinMax(0, 1));
        valuesForAdducion.set('STO_292_2007_VALUE_WELD', new MinMax(0, 1));
        valuesForAdducion.set('STO_292_2007_DAMAGE_CRACK', new MinMax(0, 1));
        valuesForAdducion.set('STO_292_2007_DAMAGE_CORROSION', new MinMax(0, 1));
        valuesForAdducion.set('STO_292_2007_DAMAGE_DENT', new MinMax(0, 1));
        valuesForAdducion.set('STO_292_2007_VALUE_PIPE', new MinMax(0, 1));
        valuesForAdducion.set('STO_292_2007_DAMAGE_DUTY_VAR', new MinMax(0, 1));
        valuesForAdducion.set('STO_292_2007_BAD_PIPE_COUNT', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_292_2007_VALUE_CONDITION', new MinMax(0, 1));
        valuesForAdducion.set('STO_401_2003_OP_REP_PIPE_COUNT', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_401_2003_TIME_LIMIT_EXPL', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_401_2003_MEAN_TIME_FAIL', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_401_2003_POSSIBLE_FALUTS', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_401_2003_PIPE_Q_RANK_G_04', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_401_2003_FAILURE_PROBABLY', new MinMax(0, 1));
        valuesForAdducion.set('STO_401_2003_MIN_UNIT_COST_YKM', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_401_2003_OPTIM_TIM_BFR_ILI', new MinMax(0, 999999999));
        valuesForAdducion.set('PRIORITY_COND', new MinMax(0, 1));
        valuesForAdducion.set('PRIORITY_TIME_EXP', new MinMax(0, 1));
        valuesForAdducion.set('PRIORITY_PROBAB', new MinMax(0, 1));
        valuesForAdducion.set('PRIORITY_TIME_FAI', new MinMax(0, 1));
        valuesForAdducion.set('PRIORITY_SUMMARY', new MinMax(0, 1));
        valuesForAdducion.set('STO_095_2007_NEXT_INSP_SCC', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_095_2007_NEXT_INSP', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_095_2007_NEXT_COMP_INSP', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_095_2007_DISTR_DEPTH_SCC', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_095_2007_DISTR_DEPTH_COR', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_095_2007_PROJECTED_SCC', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_095_2007_PROJECTED_COR', new MinMax(0, 999999999));
        valuesForAdducion.set('STO_095_2007_NEXT_ILI_INSP', new MinMax(0, 999999999));
        return valuesForAdducion;
    }
}
module.exports = StoIliInsp;
