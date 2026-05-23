const Decimal = require('decimal.js');
const MathUtils = require('../../../../utils/MathUtils');

class IliPressure {
    constructor(processParameters) {
        // Общие входные данные – константы от пользователя, передаются из формы
        this.gv = Number(processParameters.BREAKING_POINT); // Предел прочности, МПа
        this.gtek = Number(processParameters.YIELDING_LIMIT); // Предел текучести, МПа
        this.kn = Number(processParameters.SAFETY_FACTOR_OF_INTERNAL_PRESSURE); // Коэф-т  надежности по  внутреннему рабочему давлению
        this.km = Number(processParameters.SAFETY_FACTOR_OF_WORKING_CONDITIONS); // Коэф-т  условий работы газопровода
        this.kk1 = Number(processParameters.SAFETY_FACTOR_OF_DESTINATION); // Коэф-т надежности по назначению
        this.kkn = Number(processParameters.SAFETY_FACTOR_OF_MATERIAL); // Коэф-т надежности по материалу труб
        this.p = Number(processParameters.PRESSURE); // Рабочее давление, МПа
        this.route_category = Number(processParameters.ROUTE_CATEGORY); // Категория участка
        this.e = Number(processParameters.ELASTIC_MODULUS); // Модуль упругости, МПа
        this.nom_wall_thick = 0; // Добавлено 18.01.16 Толщина стенки трубы из опросного листа, мм
        this.ksv; // Добавлено 25.02.16 Ударная вязкость, кгс/кв. м.
        this.pipe_params = 'Усредненные параметры. Предел проч.:' + this.gv.toFixed(2)
			+ " Предел текуч.:" + this.gtek.toFixed(2)
			+ " Коэф.  надеж.:" + this.kn.toFixed(2)
			+ " Коэф. усл. раб.:" + this.km.toFixed(2)
			+ " Коэф. надеж. по мат.:" + this.kk1.toFixed(2)
			+ " Коэф. надеж. по назн.:" + this.kkn.toFixed(2)
			+ " Рабочее давление:" + this.p.toFixed(2)
			+ " Модуль упруг.:" + this.e.toFixed(2)
			+ " Категория участка:" + this.route_category.toFixed(); // Добавлено 14.03.16 Перечень парам етров трубы, использованных при рассчете и откуда брались
        // Константы для расчетов
        this.pi = 3.141516; // Коэффициент Пи
        this.v = 0.3; // Коэффициент Пуассона
        // Общие расчетные коэффициенты
        this.r1 = this.km * this.gv / (this.kk1 * this.kkn); // расчетное сопротивление растяжению/сжатию - [ф. 5.3] STO_112_2007_COMPRESS_STRENGTH
        this.kf = 1 - this.kn * this.p / this.r1; // коэф., учитывающий рабочее давление - [ф. 5.2] STO_112_2007_WORK_PRESS_KOEF
        this.k_reserve = 0.9 * this.kf * this.kn * this.kk1 * this.kkn / this.km; // коэф. запаса - [5.1]
    }

    getVdForTube_(iliTab, weldNumber) {
        let result = 0;
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            let defgroup = new Decimal(iliRow.IS_CLUSTER).toNumber();
            let deftype = iliRow.ANOMALY_EXTENSION_CL.toString();
            let sizek;
            if (deftype === 'ANOMALY_EXT_005') sizek = 2;
            else if (deftype === 'ANOMALY_EXT_001' || deftype === 'ANOMALY_EXT_007') sizek = 0.3;
            else sizek = 1;
            if ((defgroup === -1 || defgroup === 1)
				&& iliRow.ANOMALY_GROUP === '2' // Группировка дефектов по признакам
				&& iliRow.R_595_2011_REPAIR_METHOD === 'КШ'
				&& iliRow.WELD_NUMBER === weldNumber) {
                let depthsh = new Decimal(iliRow.R_595_2011_DEPTH_ABRASION).toNumber();
                let sqrsh = new Decimal(iliRow.R_595_2011_SQUARE_ABRASION).toNumber();
                result = result + sqrsh * depthsh * sizek; // общая площадь по дефектам (берется)
            }
        }
        return result;
    }

    isRequirementsSatisfy_(defRow) {
        return !isNaN(Number(defRow.NOMINAL_DIAMETER_GCL));
    }

    // Добавлено 18.01.16 входные параметры - расчет по формулам из ЛТГ
    initDefParameters_(defRow, processParameters) {
        let dn = new Decimal(defRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр, мм
        let par_gv = new Decimal(defRow.PAR_BREAK_POINT_MIN).toNumber();
        let par_gtek = new Decimal(defRow.PAR_YYIELDING_LIMIT_MIN).toNumber();
        let par_kk1 = new Decimal(defRow.PAR_SAFETY_FACTOR).toNumber();
        let par_ksv = new Decimal(defRow.PAR_IMPACT_TOUGHNESS).toNumber();
        if (new Decimal(defRow.PAR_NOMINAL_WALL_THICKNESS_GCL).toNumber() !== -1) // Толщина стенки трубы по опросному листу, мм. Если не известна =-1 и в таком случае не используется
            this.nom_wall_thick = new Decimal(defRow.PAR_NOMINAL_WALL_THICKNESS_GCL).toNumber();
        else this.nom_wall_thick = 0;
        if (par_gv !== -1) this.gv = par_gv; // Заполнение минимального предела прочности стали на основе 131 таблицы
        else this.gv = Number(processParameters.BREAKING_POINT); // иначе берем из общего входного параметра
        if (par_gtek !== -1) this.gtek = par_gtek; // Предел текучести стали на основании 131 таблицы
        else this.gtek = (Number(processParameters.YIELDING_LIMIT)); // иначе берем из общего входного параметра
        this.ksv = par_ksv; // Ударную вязкость берем из 131 таблицы, если =-1 (не найдено в таблице) -вычисляем по старым формулам прямо внутри расчета
        if (par_kk1 !== -1) this.kk1 = par_kk1; // Коэф-т надежности по материалу труб на основании 131 таблицы
        else this.kk1 = Number(processParameters.SAFETY_FACTOR_OF_DESTINATION); // иначе берем из общего входного параметра
        let dot_class = defRow.PAR_DOT_CLASS_RATING_GCL.toString();
        if (dot_class === 'DOT_CLASS_001') this.route_category = 5; // на основании справочника DOT_CLASS_RATING_CL заполняем категорию трубопровода
        else if (dot_class === 'DOT_CLASS_002') this.route_category = 1;
        else if (dot_class === 'DOT_CLASS_003') this.route_category = 2;
        else if (dot_class === 'DOT_CLASS_004') this.route_category = 3;
        else if (dot_class === 'DOT_CLASS_005') this.route_category = 4;
        else this.route_category = Number(processParameters.ROUTE_CATEGORY); // иначе берем из общего входного параметра
        if (dot_class === 'DOT_CLASS_001') this.km = 0.66; // Коэф-т  условий работы газопровода, устанвливается в зависимости от категории газопровода
        else if (dot_class === 'DOT_CLASS_002' || dot_class === 'DOT_CLASS_003') this.km = 0.825;
        else if (dot_class === 'DOT_CLASS_004' || dot_class === 'DOT_CLASS_005') this.km = 0.99;
        else if (dot_class === 'UNKNOWN') this.km = 0.9;
        else this.km = Number(processParameters.SAFETY_FACTOR_OF_WORKING_CONDITIONS); // иначе берем из общего входного параметра
        if (new Decimal(defRow.PAR_WORK_PRESSURE).toNumber() !== -1) // Рабочее давление
            this.p = new Decimal(defRow.PAR_WORK_PRESSURE).toNumber();
        else this.p = Number(processParameters.PRESSURE);
        if (dn <= 520) this.kkn = 1.1; // Коэф-т надежности по назначению формируем на основе диаметра трубы и давления
        else if (dn <= 1020 && this.p <= 7.4) this.kkn = 1.1;
        else if (dn <= 1020 && dn >= 520 && this.p > 7.4) this.kkn = 1.155;
        else if (dn === 1220 && this.p <= 7.4) this.kkn = 1.155;
        else if (dn === 1220 && this.p > 7.4) this.kkn = 1.21;
        else if (dn === 1420 && this.p <= 5.4) this.kkn = 1.155;
        else if (dn === 1420 && this.p > 5.4 && this.p <= 7.4) this.kkn = 1.21;
        else if (dn === 1420 && this.p > 7.4) this.kkn = 1.265;
        else this.kkn = Number(processParameters.SAFETY_FACTOR_OF_MATERIAL); // иначе берем из общего входного параметра
        // Общие расчетные коеффиценты
        this.r1 = this.km * this.gv / (this.kk1 * this.kkn); // расчетное сопротивление растяжению/сжатию - [ф. 5.3] STO_112_2007_COMPRESS_STRENGTH
        this.kf = 1 - this.kn * this.p / this.r1; // коэф., учитывающий рабочее давление - [ф. 5.2] STO_112_2007_WORK_PRESS_KOEF
        this.k_reserve = 0.9 * this.kf * this.kn * this.kk1 * this.kkn / this.km; // коэф. запаса - [5.1]
        // Вставлено 14.03.2016 Описываем используемые в расчетах параметры и константы
        this.pipe_params = 'Уточненные параметры. Предел проч.:' + this.gv.toFixed(2)
			+ " Предел текуч.:" + this.gtek.toFixed(2)
			+ " Коэф.  надеж.:" + this.kn.toFixed(2)
			+ " Коэф. усл. раб.:" + this.km.toFixed(2)
			+ " Коэф. надеж. по мат.:" + this.kk1.toFixed(2)
			+ " Коэф. надеж. по назн.:" + this.kkn.toFixed(2)
			+ " Рабочее давление:" + this.p.toFixed(2)
			+ " Модуль упруг.:" + this.e.toFixed(2)
			+ " Категория участка:" + this.route_category.toFixed();
    }

    // конец расчета входных параметров
    getMinDefectValueByKey_(dataTab, clusterId, key) {
        let result = Number.MAX_VALUE;
        // Проход только по одиночным дефектам!
        for (let j = 0; j < dataTab.rows.length; j++) {
            let row = dataTab[j]; // Текущая запись
            if (new Decimal(row.IS_CLUSTER) !== 0) // Это одиночный дефект
                if (!isNaN(Number(row.ILI_CLUSTER_ID))
					&& new Decimal(row.ILI_CLUSTER_ID).toNumber() === clusterId
					&& !isNaN(Number(row[key]))) // Это дефект с указанного кластера и с не пустым значением
                    result = Math.min(result, new Decimal(row[key]).toNumber());
        }
        return result;
    }

    // вставлено 14.01.2016
    // Р Газпром 2-2.3-620-2011
    calc_sto_2_2_3_620_2011(ds, processParameters) {
        // Данные для расчета
        let iliTab = ds.Tables.ILI;
        // Сначала, проход только по одиночным дефектам!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if (new Decimal(iliRow.IS_CLUSTER) !== 0) // Это одиночный дефект
                if (iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_001'
					|| iliRow.ANOMALY_EXTENSION_C === 'ANOMALY_EXT_007') { // Это корозионный дефект
                    // Получение параметров с конкретного дефекта
                    let dn = new Decimal(iliRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр, мм
                    let t = new Decimal(iliRow.NOMINAL_WALL_THICKNESS).toNumber(); // Толщина стенки, мм
                    let l = new Decimal(iliRow.LENGTH).toNumber(); // Длина дефекта, мм
                    let d = new Decimal(iliRow.AVERAGE_DEPTH).toNumber(); // Глубина дефекта, мм
                    this.initDefParameters_(iliRow, processParameters); // 18.01.16 за основную толщину стенки, считаем толщину из опросного листа (если она имеется)
                    let dmm = d / 100 * t;
                    let kp = (this.kn * this.kk1) / this.km; // коэффициент перегрузки [ф. 7.8]
                    let wtd0 = 1 - ((1 + 2.5 * kp) / (kp * (2.5 + this.kkn))); // предельные значения для параметра поврежденности для диагностики
                    let wtr0 = 1 - ((1 + 1.2 * kp) / (kp * (1.2 + this.kkn))); // предельные значения для параметра поврежденности для ремонта
                    let vrd = 0.15; // Скорость роста дефекта по глубине, мм/год (установленная)
                    let vrl = 7.5; // Скорость роста дефекта по длине, мм/год (установленная)
                    // Собственно расчет по СТО
                    let e0 = dmm / t; // относительная глубина, мм
                    let ve = vrd / t; // скорость роста относительной коррозии, мм/год
                    let l0 = l / Math.sqrt(dn * t); // безразмерная длина
                    let vl = vrl / Math.sqrt(dn * t); // скорость роста безразмерной длины
                    // TODO !!! ПРОВЕРИТЬ
                    let reportDate = new Date(iliRow.BEGIN_DATE); // Дата отчета
                    let t0 = reportDate.getFullYear();
                    let wtri = NaN; // переменная для хранения промежуточного результата
                    let wtd = 111111; // переменная для сортировки результата по убыванию (изначально заполняем очень большим числом)
                    let testYear = -1;
                    let wtr = 111111; // переменная для сортировки результата по убыванию (изначально заполняем очень большим числом)
                    let repairYear = -1;
                    for (let ti = t0; ti <= t0 + 24; ti++) {
                        wtri = (e0 + ve * (ti - t0)) * (Math.sqrt(1 + 0.31 * (l0 + vl * (ti - t0))**2) - 1) / (Math.sqrt(1 + 0.31 * (l0 + vl * (ti - t0))**2) - e0 - ve * (ti - t0));
                        if (wtd0 - wtri > 0 && wtd0 - wtri < wtd) {
                            wtd = wtd0 - wtri; // выбираем наименьшее значение из положительных последовательно перебирая года после обследований
                            testYear = ti; // запоминаем год;
                        }
                        if (wtr0 - wtri > 0 && wtr0 - wtri < wtr) {
                            wtr = wtr0 - wtri; // выбираем наименьшее значение из положительных последовательно перебирая года после обследований
                            repairYear = ti; // запоминаем год
                        }
                    }
                    // Помещаю результаты в dataset
                    if (wtd !== 111111) {
                        iliRow.R_620_2011_DATE_TEST = MathUtils.toNumber(testYear); // Год повторного обследования
                        iliRow.PIPE_PARAMS = this.pipe_params;
                    } else iliRow.R_620_2011_DATE_TEST = null;
                    if (wtr !== 111111) iliRow.R_620_2011_DATE_REPAIR = MathUtils.toNumber(repairYear); // Год выполнения ремонта
                    else iliRow.R_620_2011_DATE_REPAIR = null;
                }
        }
        // Теперь, проход только по группам дефектов!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if (new Decimal(iliRow.IS_CLUSTER) === 0) // Это группа дефектов
                if (iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_001'
					|| iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_007') { // Это корозионный дефект
                    // Получение параметров с конкретного дефекта
                    let dn = new Decimal(iliRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр, мм
                    let t = new Decimal(iliRow.NOMINAL_WALL_THICKNESS).toNumber(); // Толщина стенки, мм
                    let l = new Decimal(iliRow.LENGTH).toNumber(); // Длина дефекта, мм
                    let d = new Decimal(iliRow.AVERAGE_DEPTH).toNumber(); // Глубина дефекта, мм
                    this.initDefParameters_(iliRow, processParameters);

                    let dmm = d / 100 * t;
                    let kp = (this.kn * this.kk1) / this.km; // коэффициент перегрузки [ф. 7.8]
                    let wtd0 = 1 - ((1 + 2.5 * kp) / (kp * (2.5 + this.kkn))); // предельные значения для параметра поврежденности для диагностики
                    let wtr0 = 1 - ((1 + 1.2 * kp) / (kp * (1.2 + this.kkn))); // предельные значения для параметра поврежденности для ремонта
                    let vrd = 0.15; // Скорость роста дефекта по глубине, мм/год (установленная)
                    let vrl = 7.5; // Скорость роста дефекта по длине, мм/год (установленная)
                    // Собственно расчет по СТО
                    let e0 = dmm / t; // относительная глубина, мм
                    let Ve = vrd / t; // скорость роста относительной коррозии, мм/год
                    let l0 = Math.sqrt(l / (dn * t)); // безразмерная длина
                    let Vl = Math.sqrt(vrl / (dn * t)); // скорость роста безразмерной длины
                    let reportDate = new Date(iliRow.BEGIN_DATE); // Дата отчета
                    let t0 = reportDate.getFullYear();
                    let wtri = NaN; // переменная для хранения промежуточного результата
                    let wtd = 111111; // переменная для сортировки результата по убыванию (изначально заполняем очень большим числом)
                    let testYear = -1;
                    let wtr = 111111; // переменная для сортировки результата по убыванию (изначально заполняем очень большим числом)
                    let repairYear = -1;
                    for (let ti = t0 + 1; ti <= t0 + 26; ti++) {
                        wtri = (e0 + Ve * (ti - t0)) * (Math.sqrt(1 + 0.31 * (l0 + Vl * (ti - t0))**2) - 1) / (Math.sqrt(1 + 0.31 * (l0 + Vl * (ti - t0))**2) - e0 - Ve * (ti - t0));
                        if (wtd0 - wtri > 0 && wtd0 - wtri < wtd) {
                            wtd = wtri; // выбираем наименьшее значение из положительных последовательно перебирая года после обследований
                            testYear = ti; // запоминаем год;
                        }
                        if (wtr0 - wtri > 0 && wtr0 - wtri < wtr) {
                            wtr = wtri; // выбираем наименьшее значение из положительных последовательно перебирая года после обследований
                            repairYear = ti; // запоминаем год
                        }
                    }
                    // Помещаю результаты в dataset
                    if (wtd !== 111111) {
                        iliRow.R_620_2011_DATE_TEST = MathUtils.toNumber(testYear); // Год повторного обследования
                        iliRow.PIPE_PARAMS = this.pipe_params;
                    } else iliRow.R_620_2011_DATE_TEST = null;
                    if (wtr !== 111111) iliRow.R_620_2011_DATE_REPAIR = MathUtils.toNumber(repairYear); // Год выполнения ремонта
                    else iliRow.R_620_2011_DATE_REPAIR = null;
                }
        }
        return ds;
    }

    // расчет по методике ЛТГ
    calc_sto_ltg(ds, processParameters) {
        // Данные для расчета
        let iliTab = ds.Tables.ILI;
        // Сначала, проход только по одиночным дефектам!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if (new Decimal(iliRow.IS_CLUSTER) !== 0) // Это одиночный дефект
                if (iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_001') { // Это корозионный дефект
                    // Получение параметров с конкретного дефекта
                    let dn = new Decimal(iliRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр, мм
                    let t = new Decimal(iliRow.NOMINAL_WALL_THICKNESS).toNumber(); // Толщина стенки, мм
                    let l = new Decimal(iliRow.LENGTH).toNumber(); // Длина дефекта, мм
                    let d = new Decimal(iliRow.AVERAGE_DEPTH).toNumber(); // Глубина дефекта, мм
                    let dmm = d / 100 * t;
                    this.initDefParameters_(iliRow, processParameters);
                    // Расчет
                    let t_measure = t - dmm; // Измеренная толщина стенки трубы, мм
                    let reportDate = new Date(iliRow.BEGIN_DATE); // Дата отчета
                    let reportYear = reportDate.getFullYear();
                    let curDate = new Date();
                    let currYear = curDate.getFullYear(); // Текущий год
                    let v_corr_vtd = (t - t_measure) / (currYear - reportYear); // Скорость коррозии по результатам обследования мм/год
                    let v_corr = 3 * v_corr_vtd; // Вероятная скорость коррозии мм/год
                    let t_dop = ((this.kn * this.p * dn) / (2 * this.r1 + this.kn * this.p)); // Минимально допустимая толщина стенки трубы мм
                    let sMin = t_measure - t_dop; // Фактический запас толщины по утонению, мм
                    let tDone = sMin / v_corr_vtd; // Остаточный ресурс
                    let kQ = Math.sqrt(1 + 0.31 * (l / Math.sqrt(dn * t))**2); // [ф. 6.5] STO_112_2007_LENGTH_KOEF
                    let dend = t * kQ * (2 * t * this.gv + this.p * t - this.p * dn) / (this.p * t - this.p * dn + 2 * t * this.gv * kQ); // Глубина дефекта разрушения, мм
                    let dend_mm = dend - dmm; // Количество мм до разрушения при рабочем давлении, мм
                    let tEnd = dend_mm / v_corr_vtd; // Количество лет до разрушения, год
                    let rem_type = 'Неизвестно'; // Вид ремонта
                    if (tDone > 5) rem_type = 'Выборочный ремонт';
                    if (tDone > 3 && tDone <= 5) rem_type = 'Переизоляция';
                    if (tDone <= 3) rem_type = 'Замена участка';
                    // Заполняем результаты
                    iliRow.LTG_THICKNESS_MEASURED = MathUtils.toNumber(t_measure); // Измеренная толщина стенки трубы, мм
                    iliRow.LTG_CORROSION_SPEED = MathUtils.toNumber(v_corr_vtd); // Скорость коррозии по результатам обследования мм/год
                    iliRow.LTG_PROBAB_CORROSION_SPEED = MathUtils.toNumber(v_corr); // Вероятная скорость коррозии мм/год
                    iliRow.LTG_MIN_THICKNESS_ALLOW = MathUtils.toNumber(t_dop); // Минимально допустимая толщина стенки трубы мм
                    iliRow.LTG_ACTUAL_RES_THICKNESS = MathUtils.toNumber(sMin); // Фактический запас толщины по утонению, мм
                    if (v_corr !== 0) iliRow.LTG_RESIDUAL_LIFE = MathUtils.toNumber(sMin / v_corr); // Остаточный ресурс
                    iliRow.LTG_DEPTH_TO_DESTROY = MathUtils.toNumber(dend); // Глубина дефекта разрушения, мм
                    iliRow.LTG_THICKNESS_TO_DESTROY = MathUtils.toNumber(dend_mm); // Количество мм до разрушения при рабочем давлении, мм
                    if (v_corr !== 0) iliRow.LTG_TIME_TO_DESTROY = MathUtils.toNumber(tEnd); // Количество лет до разрушения, год
                    if (rem_type !== '') iliRow.LTG_REPAIR_METHOD = rem_type; // Вид ремонта
                    else iliRow.LTG_REPAIR_METHOD = null;
                    iliRow.LTG_TIME_FROM_LAST_REPAIR = MathUtils.toNumber(currYear - reportYear); // Срок с обследования на текущую дату, год
                    iliRow.PIPE_PARAMS = this.pipe_params;
                }
        }
        // Теперь, проход только по группам дефектов!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if (new Decimal(iliRow.IS_CLUSTER) === 0) // Это группа дефектов
                if (iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_001'
					|| iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_007') { // Это корозионный дефект
                    // Получение параметров с конкретного дефекта
                    let dn = new Decimal(iliRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр, мм
                    let t = new Decimal(iliRow.NOMINAL_WALL_THICKNESS).toNumber(); // Толщина стенки, мм
                    let l = new Decimal(iliRow.LENGTH).toNumber(); // Длина дефекта, мм
                    let d = new Decimal(iliRow.AVERAGE_DEPTH).toNumber(); // Глубина дефекта, мм
                    let dmm = d / 100 * t;
                    this.initDefParameters_(iliRow, processParameters);

                    // Расчет
                    let t_measure = t - dmm; // Измеренная толщина стенки трубы, мм
                    let reportDate = new Date(iliRow.BEGIN_DATE); // Дата отчета
                    let reportYear = reportDate.getFullYear();
                    let currYear = new Date(); // Текущий год
                    let v_corr_vtd = (t - t_measure) / (currYear.getFullYear() - reportYear); // Скорость коррозии по результатам обследования мм/год
                    let v_corr = 3 * v_corr_vtd; // Вероятная скорость коррозии мм/год
                    let t_dop = ((this.kn * this.p * dn) / (2 * this.r1 + this.kn * this.p)); // Минимально допустимая толщина стенки трубы мм
                    let sMin = t_measure - t_dop; // Фактический запас толщины по утонению, мм
                    let tDone = sMin / v_corr; // Остаточный ресурс
                    let kQ = Math.sqrt(1 + 0.31 * (l / Math.sqrt(dn * t))**2); // [ф. 6.5] STO_112_2007_LENGTH_KOEF
                    let dend = t * kQ * (2 * t * this.gv + this.p * t - this.p * dn) / (this.p * t - this.p * dn + 2 * t * this.gv * kQ); // Глубина дефекта разрушения, мм
                    let dend_mm = dend - dmm; // Количество мм до разрушения при рабочем давлении, мм
                    let tEnd = dend_mm / v_corr; // Количество лет до разрушения, год
                    let rem_type = 'Неизвестно'; // Вид ремонта
                    if (tDone > 5) rem_type = 'Выборочный ремонт';
                    if (tDone > 3 && tDone <= 5) rem_type = 'Переизоляция';
                    if (tDone <= 3) rem_type = 'Замена участка';
                    // Заполняем результаты
                    iliRow.LTG_THICKNESS_MEASURED = MathUtils.toNumber(t_measure); // Измеренная толщина стенки трубы, мм
                    iliRow.LTG_CORROSION_SPEED = MathUtils.toNumber(v_corr_vtd); // Скорость коррозии по результатам обследования мм/год
                    iliRow.LTG_PROBAB_CORROSION_SPEED = MathUtils.toNumber(v_corr); // Вероятная скорость коррозии мм/год
                    iliRow.LTG_MIN_THICKNESS_ALLOW = MathUtils.toNumber(t_dop); // Минимально допустимая толщина стенки трубы мм
                    iliRow.LTG_ACTUAL_RES_THICKNESS = MathUtils.toNumber(sMin); // Фактический запас толщины по утонению, мм
                    iliRow.LTG_RESIDUAL_LIFE = MathUtils.toNumber(tDone); // Остаточный ресурс
                    iliRow.LTG_DEPTH_TO_DESTROY = MathUtils.toNumber(dend); // Глубина дефекта разрушения, мм
                    iliRow.LTG_THICKNESS_TO_DESTROY = MathUtils.toNumber(dend_mm); // Количество мм до разрушения при рабочем давлении, мм
                    iliRow.LTG_TIME_TO_DESTROY = MathUtils.toNumber(tEnd); // Количество лет до разрушения, год
                    if (rem_type !== '') iliRow.LTG_REPAIR_METHOD = rem_type; // Вид ремонта
                    else iliRow.LTG_REPAIR_METHOD = null;
                    iliRow.LTG_TIME_FROM_LAST_REPAIR = MathUtils.toNumber(currYear - reportYear); // Срок с обследования на текущую дату, год
                    iliRow.PIPE_PARAMS = this.pipe_params;
                }
        }
        return ds;
    }

    // конец вставки 14.01.2016
    // СТО Газпром 2-2.3-112-2007 оценка коррозионных дефектов
    calc_sto_2_2_3_112_2007(ds, processParameters) {
        // Данные для расчета
        let iliTab = ds.Tables.ILI;
        // Сначала, проход только по одиночным дефектам!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if (new Decimal(iliRow.IS_CLUSTER) !== 0) // Это одиночный дефект
                if (iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_001') { // Это корозионный дефект
                    // Получение параметров с конкретного дефекта
                    let dn = new Decimal(iliRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр, мм
                    let t = new Decimal(iliRow.NOMINAL_WALL_THICKNESS).toNumber(); // Толщина стенки, мм
                    let l = new Decimal(iliRow.LENGTH).toNumber(); // Длина дефекта, мм
                    let d = new Decimal(iliRow.AVERAGE_DEPTH).toNumber(); // Глубина дефекта, в %

                    this.initDefParameters_(iliRow, processParameters);
                    let dmm = d / 100 * t; // Глубина дефекта, mm
                    // Собственно расчет по СТО
                    // добавлено 21.11.18
                    if (dn === 0) dn = 1420;
                    if (t === 0) t = 1;
                    let kQ = Math.sqrt(1 + 0.31 * (l / Math.sqrt(dn * t))**2); // [ф. 6.5] STO_112_2007_LENGTH_KOEF
                    let p0p = (2 * t * this.gv * (1 - dmm / t)) / ((dn - t) * (1 - dmm / (t * kQ))); // [ф. 6.4]
                    let pdop = p0p / this.k_reserve; // [ф. 6.5] – для одиночного
                    let rate; // оценка опасности дефектов  - надо добавить:
                    if (pdop >= this.p) rate = 'работоспособен';
                    else rate = 'неработоспособен';

                    // Помещаю результаты в dataset
                    // добавлено 14.01.2016
                    try {
                        iliRow.STO_112_2007_WORK_PRESS_KOEF = MathUtils.toNumber(this.kf, 14); // коэф., учитывающий рабочее давление - [ф. 5.2]
                        iliRow.STO_112_2007_COMPRESS_STRENGTH = MathUtils.toNumber(this.r1, 14); // расчетное сопротивление растяжению/сжатию - [ф. 5.3]
                        iliRow.STO_112_2007_LENGTH_KOEF = MathUtils.toNumber(kQ, 14); // Коэффициент, учитывающий длинц дефекта - [ф. 6.5]
                        // дальше пошло старое
                        iliRow.STO_112_2007_ASSURANCE_FACTOR = MathUtils.toNumber(this.k_reserve, 14); // Коэффициент запаса
                        iliRow.STO_112_2007_DESTRUCT_PRESSURE = MathUtils.toNumber(p0p, 14); // Разрушающее давление, МПа
                        iliRow.STO_112_2007_ALLOW_PRESSURE = MathUtils.toNumber(pdop, 14); // Допустимое давление, МПа
                        if (rate !== '') iliRow.STO_112_2007_PERFORMANCE_EVAL = rate; // Оценка работоспособности
                        else iliRow.STO_112_2007_PERFORMANCE_EVAL = null;
                        // Теперь дублирую в поля ахреорасчета
                        iliRow.RPR_CALCULATED = MathUtils.toNumber(pdop); // Допустимое давление
                        iliRow.BPR_CALCULATED = MathUtils.toNumber(this.k_reserve); // Коэфициент запаса
                        iliRow.BPR_VARIANCE = MathUtils.toNumber(p0p); // Разрушающее давление
                        iliRow.PIPE_PARAMS = this.pipe_params;
                    } catch (ex) {
                        iliRow.STO_112_2007_WORK_PRESS_KOEF = null;
                        iliRow.STO_112_2007_COMPRESS_STRENGTH = null;
                        iliRow.STO_112_2007_LENGTH_KOEF = null;
                        iliRow.STO_112_2007_ASSURANCE_FACTOR = null;
                        iliRow.STO_112_2007_DESTRUCT_PRESSURE = null;
                        iliRow.STO_112_2007_ALLOW_PRESSURE = null;
                        iliRow.STO_112_2007_PERFORMANCE_EVAL = null;
                        iliRow.RPR_CALCULATED = null;
                        iliRow.BPR_CALCULATED = null;
                        iliRow.BPR_VARIANCE = null;
                        iliRow.PIPE_PARAMS = this.pipe_params;
                    }
                }
        }
        // Теперь, проход только по группам дефектов!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if (new Decimal(iliRow.IS_CLUSTER) === 0) // Это группа дефектов
                if (iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_001') { // Это группа коррозионных дефектов
                    // Получение параметров с конкретного дефекта
                    let dn = new Decimal(iliRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр, мм
                    let t = new Decimal(iliRow.NOMINAL_WALL_THICKNESS).toNumber(); // Толщина стенки, мм
                    let l = new Decimal(iliRow.LENGTH).toNumber(); // Длина дефекта, мм
                    let d = new Decimal(iliRow.AVERAGE_DEPTH).toNumber(); // Глубина дефекта, % от толщины стенки дефекта
                    this.initDefParameters_(iliRow, processParameters);
                    let dmm = d / 100 * t;
                    // добавлено 21.11.18
                    if (dn === 0) dn = 1420;
                    if (t === 0) t = 1;// Глубина дефекта, mm
                    let clusterID = new Decimal(iliRow.ILI_CLUSTER_ID).toNumber(); // Идентификатор кластера
                    // Собственно расчет по СТО
                    let kQ = Math.sqrt(1 + 0.31 * (l / Math.sqrt(dn * t))**2); // [ф. 6.5]
                    let p0p = (2 * t * this.gv * (1 - dmm / t)) / ((dn - t) * (1 - dmm / (t * kQ))); // [ф. 6.4]
                    let pp = Math.min(p0p, this.getMinDefectValueByKey_(iliTab, clusterID, 'STO_112_2007_DESTRUCT_PRESSURE')); // разрушающее давление кластера - минимальное
                    let pdop = pp / this.k_reserve; // допустимое давление- [ф. 6.5]
                    let rate; // оценка опасности дефектов  - надо добавить:
                    if (pdop >= this.p) rate = 'работоспособен';
                    else rate = 'неработоспособен';

                    // Помещаю результаты в dataset
                    // добавлено 14.01.2016
                    iliRow.STO_112_2007_WORK_PRESS_KOEF = MathUtils.toNumber(this.kf, 14); // коэф., учитывающий рабочее давление - [ф. 5.2]
                    iliRow.STO_112_2007_COMPRESS_STRENGTH = MathUtils.toNumber(this.r1, 14); // расчетное сопротивление растяжению/сжатию - [ф. 5.3]
                    iliRow.STO_112_2007_LENGTH_KOEF = MathUtils.toNumber(kQ, 14); // Коэффициент, учитывающий длинц дефекта - [ф. 6.5]
                    // дальше пошло староe
                    iliRow.STO_112_2007_ASSURANCE_FACTOR = MathUtils.toNumber(this.k_reserve, 14); // Коэффициент запаса
                    iliRow.STO_112_2007_DESTRUCT_PRESSURE = MathUtils.toNumber(p0p, 14); // Разрушающее давление, МПа
                    iliRow.STO_112_2007_ALLOW_PRESSURE = MathUtils.toNumber(pdop, 14); // Допустимое давление, МПа
                    if (rate !== '') iliRow.STO_112_2007_PERFORMANCE_EVAL = rate; // Оценка работоспособности
                    else iliRow.STO_112_2007_PERFORMANCE_EVAL = null;
                    // Теперь дублирую в поля ахреорасчета
                    iliRow.RPR_CALCULATED = MathUtils.toNumber(pdop); // Допустимое давление
                    iliRow.BPR_CALCULATED = MathUtils.toNumber(this.k_reserve); // Коэфициент запаса
                    iliRow.BPR_VARIANCE = MathUtils.toNumber(p0p); // Разрушающее давление
                    iliRow.PIPE_PARAMS = this.pipe_params;
                }
        }
        return ds;
    }

    // CТО  Газпром 2-2.3-173-2007 оценка КРН дефектов
    calc_sto_2_2_3_173_2007(ds, processParameters) {
        // Данные для расчета
        let iliTab = ds.Tables.ILI;
        // Сначала, проход только по одиночным дефектам!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if (new Decimal(iliRow.IS_CLUSTER) !== 0) // Это одиночный дефект
                if (iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_005') { // Это дефект КРН
                    // Получение параметров с конкретного дефекта
                    let dn = new Decimal(iliRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр трубопровода
                    let t = new Decimal(iliRow.NOMINAL_WALL_THICKNESS).toNumber(); // Толщина стенки трубопровода
                    let l = new Decimal(iliRow.LENGTH).toNumber(); // Длина дефекта
                    let c = new Decimal(iliRow.WIDTH).toNumber(); // Ширина дефекта
                    let d = new Decimal(iliRow.AVERAGE_DEPTH / 100 * t).toNumber();	// Глубина дефекта
                    this.initDefParameters_(iliRow, processParameters);
                    // Собственно расчет по СТО
                    // Если глубина дефекта меньше 0,05 толщины стенки трубы, то степень опасности дефекта УД и т.п согласно п. 12.2.6
                    // Не всегда нужно заполнять результаты, сделаю флаг
                    let extEnded_result = false;
					let kCV = NaN;                 //Ударная вязкость
					let danger = '';                //Степень опасности
					let gk = NaN;                      //кольцевые напряжения, МПа  - [ф. 8.8]
					let k1c = NaN;                    //вязкость разрушения, МПА*м^0.5 - [ф. 12.1]
					let int_F = NaN;                   //полный эллиптический интеграл второго рода - [ф. 12.7]
					let m1 = NaN;                      //апроксимирующие функции - [ф.12.9-12.11]
					let m2 = NaN;
					let m3 = NaN;
					let func_F = NaN;                  //попр. функ, зависящая от параметров эквивалентной трещины - [ф. 12.8]
					let k1 = NaN;                      //коэф. интенсивности напряжений на фронте трещины, МПа*м1/2 - [ф.12.6]
					let ao = NaN;                      //[ф. 12.17]
					let dsr = NaN;                     //диаметр срединной поверхности трубы - [ф. 12.19]
					let fsh = NaN;                     //[ф. 12.18]
					let a = NaN;                       //площадь эквивалентной трещины в плоскости осевого сечения - [ф. Б.3]
					let k_kp = NaN;                    //коэфф-т для расчета напряжений в нетто-сечении стенки трубы - [ф. 12.16]
					let g1 = NaN;
					let g2 = NaN;
					let g3 = NaN;
					let gkr = NaN;                     //критическое напряжение, МПа - [ф.12.21]
					let pkr = NaN;                     //критическое давление - [ф. 12.22]
					let n_fact = NaN;                  //фактический коэффициент запаса прочности по критическому напряжению - [ф. 12.23]
					let p02 = NaN;                     //давление, соотв. возникновению в стенке трубы кольцевых напряжений
					let n_norm = NaN;                  //нормативный коэффициент запаса прочности по наибольшему давлению - [ф. 12.24]
					let p_secure = NaN;
                    if (d <= 0.05 * t) danger = 'условно допустимый';
                    else if (d > 0.05 * t
						&& d <= 0.1 * t
						&& Math.max(l, c) < 40 * t) danger = 'условно допустимый';
                    else if (d > 0.1 * t
						&& d <= 0.2 * t
						&& Math.max(l, c) < 20 * t) danger = 'условно допустимый';
                    else if (d > 0.5 * t) danger = 'недопустимый';
                    else {
                        // к оценке прочности переходим только в том случае если условия п. 12.2.6 не выполняются
                        extEnded_result = true;
                        // Расчет  ударной вязкости, Дж/см^2
                        if (this.ksv === -1) { // Добавлено 25.02.16 - теперь при наличии значений используем 131 таблицу
                            kCV = 107.8; // Значение по-умолчанию
                            if ((this.p < 5.5 && dn === 1220) || (this.p < 7.5 && this.p > 5.5 && dn === 1020)) kCV = 39.5;
                            else if ((this.p < 7.5 && this.p > 5.5 && dn === 1220) || (this.p > 7.5 && dn === 1020)) kCV = 58.8;
                            else if ((this.p < 7.5 && this.p > 5.5 && dn === 1420) || (this.p > 7.5 && dn === 1220)) kCV = 78.4;
                            else if ((this.p < 5.5 && dn === 520) || (this.p < 5.5 && dn === 1020)) kCV = 29.5;
                            else if (this.p > 7.5 && dn === 1420) kCV = 107.8;
                        } else kCV = this.ksv;
                        // вязкость разрушения, МПА*м^0.5 - [ф. 12.1]
                        k1c = Math.sqrt(219.78 * kCV);
                        // кольцевые напряжения, МПа  - [ф. 8.8]
                        gk = (this.p * (dn - 2 * t)) / (2 * t);
                        // полный эллиптический интеграл второго рода - [ф. 12.7]
                        int_F = (1 + 1.464 * (Math.pow(d / (0.5 * l), 1.65)))**0.5;
                        // апроксимирующие функции - [ф.12.9-12.11]
                        m1 = 1.13 - 0.09 * (d / (0.5 * l));
                        m2 = 0.89 / (0.2 + (d / (0.5 * l))) - 0.54;
                        m3 = 0.5 - 1 / (0.65 + (d / (0.5 * l))) + 14 * (1 - (d / (0.5 * l)))**24;
                        // попр. функ, зависящая от параметров эквивалентной трещины - [ф. 12.8]
                        func_F = m1 + m2 * (d / t)**2 + m3 * (d / t)**4;
                        // коэф. интенсивности напряжений на фронте трещины, МПа*м1/2 - [ф.12.6]
                        k1 = gk * (this.pi * d * Math.pow(10, (-3)))**0.5 * int_F**-1 * func_F;
                        // диаметр срединной поверхности трубы - [ф. 12.19]
                        dsr = dn - t;
                        // [ф. 12.18]
                        fsh = 4.75 - 3.75 / (Math.sqrt(1 + 1.3 * ((0.5 * l)**2 / (dsr * t))));
                        // [ф. 12.17]
                        ao = l * t;
                        // площадь эквивалентной трещины в плоскости осевого сечения - [ф. Б.3]
                        a = this.pi / 4 * (l * d);
                        // коэфф-т для расчета напряжений в нетто-сечении стенки трубы - [ф. 12.16]
                        k_kp = (1 - (a / ao) / fsh) / (1 - a / ao);

                        g1 = (k1c**2 * int_F**2) / (this.pi * d * 10**-3 * func_F**2);
                        g2 = Math.sqrt(k_kp**4 / (4 * this.gv**4) + (this.pi * d * 1e-3)**2 * func_F**4 / (k1c**4 * int_F**4));
                        g3 = Math.sqrt(g2 - k_kp**2 / (2 * this.gv**2));
                        // критическое напряжение, МПа - [ф.12.21]
                        gkr = g1 * g3;
                        // критическое давление - [ф. 12.22]
                        pkr = (2 * gkr * t) / (dn - 2 * t);
                        n_fact = pkr / this.p; // фактический коэффициент запаса прочности по критическому напряжению - [ф. 12.23]
                        p02 = 2 * this.gtek * t / (dn - 2 * t); // давление, соотв. возникновению в стенке трубы кольцевых напряжений
                        n_norm = p02 / this.p; // нормативный коэффициент запаса прочности по наибольшему давлению - [ф. 12.24]
                        p_secure = this.p * n_fact / n_norm;
                        // оценка опасности дефектов при условии невыполнении усл. П. 12.2.6 – добавить в расчет
                        if (n_fact > n_norm) danger = 'условно допустимый';
                        else danger = 'недопустимый';
                    }
                    // Помещаю результаты в dataset
                    // Всегда заполняется только Danger
                    iliRow.STO_173_2007_DANGER_DEGREE = danger; // Степень опасности
                    if (extEnded_result) {
                        iliRow.STO_173_2007_CRITICAL_PRESSURE = MathUtils.toNumber(pkr); // Критическое давление
                        iliRow.STO_173_2007_SAFE_PRESSURE = MathUtils.toNumber(p_secure); // Безопасное давление
                        // Теперь дублирую в поля ахреорасчета
                        iliRow.BPR_VARIANCE = MathUtils.toNumber(pkr); // Критическое давление
                        iliRow.RPR_CALCULATED = MathUtils.toNumber(p_secure); // Безопасное давление
                        iliRow.BPR_CALCULATED = MathUtils.toNumber(n_fact); // Фактический коэффициент запаса прочности
                        iliRow.RPR_VARIANCE = MathUtils.toNumber(n_norm); // Нормативный коэффициент запаса прочности
                        iliRow.PIPE_PARAMS = this.pipe_params;
                    }
                }
        }
        // Теперь, проход только по группам дефектов!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if (new Decimal(iliRow.IS_CLUSTER) === 0) // Это группа дефектов
                if (iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_005') { // Это группа КРН дефектов
                    // Получение параметров с конкретного дефекта
                    let dn = new Decimal(iliRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр трубопровода
                    let t = new Decimal(iliRow.NOMINAL_WALL_THICKNESS).toNumber(); // Толщина стенки трубопровода
                    let l = new Decimal(iliRow.LENGTH).toNumber(); // Длина дефекта
                    let c = new Decimal(iliRow.WIDTH).toNumber(); // Ширина дефекта
                    let d = new Decimal(iliRow.AVERAGE_DEPTH / 100 * t).toNumber(); // Глубина дефекта
                    this.initDefParameters_(iliRow, processParameters);

                    // Собственно расчет по СТО
                    // Если глубина дефекта меньше 0,05 толщины стенки трубы, то степень опасности дефекта УД и т.п согласно п. 12.2.6
                    // Не всегда нужно заполнять результаты, сделаю флаг
                    let extEnded_result = false;
					let kCV = NaN;                     //Ударная вязкость
					let danger = '';               //Степень опасности
					let gk = NaN;                      //кольцевые напряжения, МПа  - [ф. 8.8]
					let k1c = NaN;                     //вязкость разрушения, МПА*м^0.5 - [ф. 12.1]
					let int_F = NaN;                   //полный эллиптический интеграл второго рода - [ф. 12.7]
					let m1 = NaN;                      //апроксимирующие функции - [ф.12.9-12.11]
					let m2 = NaN;
					let m3 = NaN;
					let func_F = NaN;                  //попр. функ, зависящая от параметров эквивалентной трещины - [ф. 12.8]
					let k1 = NaN;                      //коэф. интенсивности напряжений на фронте трещины, МПа*м1/2 - [ф.12.6]
					let ao = NaN;                      //[ф. 12.17]
					let dsr = NaN;                     //диаметр срединной поверхности трубы - [ф. 12.19]
					let fsh = NaN;                     //[ф. 12.18]
					let a = NaN;                       //площадь эквивалентной трещины в плоскости осевого сечения - [ф. Б.3]
					let k_kp = NaN;                    //коэфф-т для расчета напряжений в нетто-сечении стенки трубы - [ф. 12.16]
					let g1 = NaN;
					let g2 = NaN;
					let g3 = NaN;
					let gkr = NaN;                     //критическое напряжение, МПа - [ф.12.21]
					let pkr = NaN;                     //критическое давление - [ф. 12.22]
					let n_fact = NaN;                  //фактический коэффициент запаса прочности по критическому напряжению - [ф. 12.23]
					let p02 = NaN;                     //давление, соотв. возникновению в стенке трубы кольцевых напряжений
					let n_norm = NaN;                  //нормативный коэффициент запаса прочности по наибольшему давлению - [ф. 12.24]
					let p_secure = NaN;

                    if (d <= 0.05 * t) danger = 'условно допустимый';
                    else if (d > 0.05 * t
						&& d <= 0.1 * t
						&& Math.max(l, c) < 40 * t) danger = 'условно допустимый';
                    else if (d > 0.1 * t
						&& d <= 0.2 * t
						&& Math.max(l, c) < 20 * t) danger = 'условно допустимый';
                    else if (d > 0.5 * t) danger = 'недопустимый';
                    else {
                        // к оценке прочности переходим только в том случае если условия п. 12.2.6 не выполняются
                        extEnded_result = true;
                        // Расчет  ударной вязкости, Дж/см^2
                        if (this.ksv === -1) // Добавлено 25.02.16 - теперь при наличии значений используем 131 таблицу
                        {
                            kCV = 107.8; // Значение по-умолчанию

                            if ((this.p < 5.5 && dn === 1220) || (this.p < 7.5 && this.p > 5.5 && dn === 1020)) kCV = 39.5;
                            else if ((this.p < 7.5 && this.p > 5.5 && dn === 1220) || (this.p > 7.5 && dn === 1020)) kCV = 58.8;
                            else if ((this.p < 7.5 && this.p > 5.5 && dn === 1420) || (this.p > 7.5 && dn === 1220)) kCV = 78.4;
                            else if ((this.p < 5.5 && dn === 520) || (this.p < 5.5 && dn === 1020)) kCV = 29.5;
                            else if (this.p > 7.5 && dn === 1420) kCV = 107.8;
                        } else kCV = this.ksv;

                        // вязкость разрушения, МПА*м^0.5 - [ф. 12.1]
                        k1c = Math.sqrt(219.7 * kCV);
                        // кольцевые напряжения, МПа  - [ф. 8.8]
                        gk = (this.p * (dn - 2 * t)) / (2 * t);
                        // полный эллиптический интеграл второго рода - [ф. 12.7]
                        int_F = (1 + 1.464 * (Math.pow(d / (0.5 * l), 1.65)))**0.5;
                        // апроксимирующие функции - [ф.12.9-12.11]
                        m1 = 1.13 - 0.09 * (d / (0.5 * l));
                        m2 = 0.89 / (0.2 + (d / (0.5 * l))) - 0.54;
                        m3 = 0.5 - 1 / (0.65 + (d / (0.5 * l))) + 14 * (1 - (d / (0.5 * l)))**24;
                        // попр. функ, зависящая от параметров эквивалентной трещины - [ф. 12.8]
                        func_F = m1 + m2 * (d / t)**2 + m3 * (d / t)**4;
                        // коэф. интенсивности напряжений на фронте трещины, МПа*м1/2 - [ф.12.6]
                        k1 = gk * (this.pi * d * Math.pow(10, (-3)))**0.5 * int_F**-1 * func_F;
                        // диаметр срединной поверхности трубы - [ф. 12.19]
                        dsr = dn - t;
                        // [ф. 12.18]
                        fsh = 4.75 - 3.75 / (Math.sqrt(1 + 1.3 * ((0.5 * l)**2 / (dsr * t))));
                        // [ф. 12.17]
                        ao = l * t;
                        // площадь эквивалентной трещины в плоскости осевого сечения - [ф. Б.3]
                        a = this.pi / 4 * (l * d);
                        // коэфф-т для расчета напряжений в нетто-сечении стенки трубы - [ф. 12.16]
                        k_kp = (1 - (a / ao) / fsh) / (1 - a / ao);

                        g1 = (k1c**2 * int_F**2) / (this.pi * d * 10**-3 * func_F**2);
                        g2 = Math.sqrt(k_kp**4 / (4 * this.gv**4) + (this.pi * d * 1e-3)**2 * func_F**4 / (k1c**4 * int_F**4));
                        g3 = Math.sqrt(g2 - k_kp**2 / (2 * this.gv**2));
                        // критическое напряжение, МПа - [ф.12.21]
                        gkr = g1 * g3;

                        // критическое давление - [ф. 12.22]
                        pkr = (2 * gkr * t) / (dn - 2 * t);

                        n_fact = pkr / this.p; // фактический коэффициент запаса прочности по критическому напряжению - [ф. 12.23]
                        p02 = 2 * this.gtek * t / (dn - 2 * t); // давление, соотв. возникновению в стенке трубы кольцевых напряжений
                        n_norm = p02 / this.p; // нормативный коэффициент запаса прочности по наибольшему давлению - [ф. 12.24]
                        p_secure = this.p * n_fact / n_norm;
                        // оценка опасности дефектов при условии невыполнении усл. П. 12.2.6 – добавить в расчет
                        if (n_fact > n_norm) danger = 'условно допустимый';
                        else danger = 'недопустимый';
                    }
                    // Помещаю результаты в dataset
                    // Всегда заполняется только danger
                    iliRow.STO_173_2007_DANGER_DEGREE = danger; // Степень опасности
                    if (extEnded_result) {
                        iliRow.STO_173_2007_CRITICAL_PRESSURE = MathUtils.toNumber(pkr); // Критическое давление
                        iliRow.STO_173_2007_SAFE_PRESSURE = MathUtils.toNumber(p_secure); // Безопасное давление
                        // Теперь дублирую в поля ахреорасчета
                        iliRow.BPR_VARIANCE = MathUtils.toNumber(pkr); // Критическое давление
                        iliRow.RPR_CALCULATED = MathUtils.toNumber(p_secure); // Безопасное давление
                        iliRow.BPR_CALCULATED = MathUtils.toNumber(n_fact); // Фактический коэффициент запаса прочности
                        iliRow.RPR_VARIANCE = MathUtils.toNumber(n_norm); // Нормативный коэффициент запаса прочности
                        iliRow.PIPE_PARAMS = this.pipe_params;
                    }
                }
        }
        return ds;
    }

    // СТО Газпром 2-2.3-292-2009  Определение ТС МГ по результатам ВТД
    calc_sto_2_2_3_292_2009(ds, processParameters) {
        // Данные для расчета
        let iliTab = ds.Tables.ILI;
        // Сначала, проход только по одиночным дефектам!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if (new Decimal(iliRow.IS_CLUSTER) !== 0) { // Это одиночный дефект
                // Переменная для результата расчета
                let rank = NaN; // Ранг опасности дефекта
                // Получение параметров с конкретного дефекта
                let dn = new Decimal(iliRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр трубопровода
                let t = new Decimal(iliRow.NOMINAL_WALL_THICKNESS).toNumber(); // Толщина стенки трубопровода
                let l = new Decimal(iliRow.LENGTH).toNumber(); // Длина дефекта
                let d = new Decimal(iliRow.AVERAGE_DEPTH).toNumber(); // Глубина дефекта, %
                let c = new Decimal(iliRow.WIDTH).toNumber(); // Ширина дефекта
                this.initDefParameters_(iliRow, processParameters);

                let dmm = d / 100 * t; // Глубина дефекта, mm
                // Собственно расчет по СТО
                //* ******************************************************************
                // Переменные расчета
                let kCV; let k = NaN; let A1; let Q; let Rk; let d0; let Gkc; let Ak; let Q1; let es; let er; let Rc; let R; let ae1; let be1; let pz; let t1; let u1; let uz1; let w00; let h1; let e20; let e10;
					let w0z; let Rg; let o; let Rcz; let 
Rv;
                let deftype = iliRow.ANOMALY_EXTENSION_CL.toString();
                // Расчет  ударной вязкости
                if (this.ksv === -1) { // Добавлено 25.02.16 - теперь при наличии значений используем 131 таблицу
                    kCV = 107.8; // Значение по-умолчанию
                    if ((this.p < 5.5 && dn === 1220) || (this.p < 7.5 && this.p > 5.5 && dn === 1020)) kCV = 39.5;
                    else if ((this.p < 7.5 && this.p > 5.5 && dn === 1220) || (this.p > 7.5 && dn === 1020)) kCV = 58.8;
                    else if ((this.p < 7.5 && this.p > 5.5 && dn === 1420) || (this.p > 7.5 && dn === 1220)) kCV = 78.4;
                    else if ((this.p < 5.5 && dn === 520) || (this.p < 5.5 && dn === 1020)) kCV = 29.5;
                    else if (this.p > 7.5 && dn === 1420) kCV = 107.8;
                } else kCV = this.ksv;
                // Первая проблема, "k" не всегда будет иметь значение, и как следствие, ниже будут runtime ошибки
                if (this.route_category === 2 || this.route_category === 3 || this.route_category === 4 || this.route_category === 5) {
                    // расчет коэффициента (категории участков)
                    if (this.route_category === 2 || this.route_category === 3) k = 24;
                    else if (this.route_category === 4 || this.route_category === 5) k = 20;
                    // расчет ранга для коррозионных дефектов
                    if (deftype === 'ANOMALY_EXT_001' || deftype === 'ANOMALY_EXT_007') {
                        A1 = this.p * (dn - t) / (2 * t * this.gv);
                        Q = Math.sqrt(1 + 0.31 * (l / Math.sqrt(dn * t))**2);
                        d0 = (A1 - 1) * Q / (A1 - Q);
                        Rk = 0.01 * d / d0;
                        rank = Rk;
                    }
                    // расчет ранга для крн
                    else if (deftype === 'ANOMALY_EXT_005') {
                        Gkc = 0.5 * this.p * (dn - 2 * t) / t;
                        Ak = this.pi * t * Gkc**2 / (219780 * kCV);
                        Q1 = Math.sqrt(1 + 0.31 * (l / Math.sqrt(dn * t))**2);
                        er = (-(Gkc / (Q1 * this.gv) - 1 - Ak) - Math.sqrt((Gkc / (Q1 * this.gv) - 1 - Ak)**2 - 4 * Ak * (1 - Gkc / this.gv))) / (2 * Ak);
                        es = d / 100;
                        Rc = es / er;
                        rank = Rc;
                    }
                    // расчет ранга для геометрии
                    else if (deftype === 'ANOMALY_EXT_003') {
                        // для дефектов имеющих геометрические размеры (длину, ширину) !== 0
                        if (l !== 0 && c !== 0) {
                            R = (dn - t) / 2;
                            pz = (this.p / this.e) * (1 - this.v * this.v) * (R / t)**3;
                            ae1 = l / 2;
                            be1 = c / 2;
                            t1 = 0.5 * R * this.pi / ae1;
                            u1 = 0.5 * R * this.pi / be1;
                            uz1 = 225 * t1**4 + 27 * this.v * t1**2 * (9 * u1**2 - 5) + 25 * (3 * u1**4 + 1);
                            h1 = (30 * (9 * u1**2 - 5) * pz) / (uz1 + 150 * (4 * u1**2 - 1) * pz);
                            w00 = dmm / (1 - h1);
                            e20 = 0.5 * t * w00 * (3 * u1**2 - 1) / (R**2);
                            e10 = 0.5 * t * w00 * (3 * t1**2 - 1) / (R**2);
                            w0z = w00 / dn;
                            Rg = k * Math.max(Math.max(e10, e20), w0z); // выбор наибольшего значения
                            rank = Rg;
                        }
                        // для дефектов у которых длина/ширина=0 и глубина незначительна – ранг опасности=0
                        if ((l === 0 || c === 0) && dmm < 0.03 * dn) rank = 0;
                    }
                    // расчет ранга для поверхностных, не крн и не коррозии
                    else if (deftype === 'ANOMALY_EXT_009' || deftype === 'ANOMALY_EXT_004') {
                        o = l / Math.sqrt(dn * t);
                        if (o > 0 && o <= 0.175) Rcz = dmm / 40;
                        else if (o > 0.175 && o <= 1.05) Rcz = dmm / (10.2 * o**-0.774);
                        else if (o > 1.05) Rcz = dmm / 10;
                        else Rcz = 0;
                        rank = Rcz;
                    }

                    // расчет ранга для дефектов сварки
                    else if (deftype === 'ANOMALY_EXT_006') rank = 1;

                    // расчет ранга для внутренних дефектов
                    else if (deftype === 'ANOMALY_EXT_002') {
                        A1 = this.p * (dn - t) / (2 * t * this.gv);
                        Q = Math.sqrt(1 + 0.31 * (l / Math.sqrt(dn * t))**2);
                        d0 = (A1 - 1) * Q / (A1 - Q);
                        Rv = 0.01 * d / d0;
                        rank = Rv;
                    }
                }
                //* ************************************************************************************************************
                // Помещаю результаты в dataset
                if (rank > 1) rank = 1;
                iliRow.STO_292_2007_DANGER_RANK = MathUtils.toNumber(rank, 14); // Ранг опасности дефекта
                iliRow.PIPE_PARAMS = this.pipe_params;
            }
        }
        // Теперь, проход только по группам дефектов!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if (new Decimal(iliRow.IS_CLUSTER) === 0) { // Это группа дефектов
                // Переменная для результата расчета
                let rank = NaN; // Ранг опасности дефекта
                // Получение параметров с конкретного дефекта
                let dn = new Decimal(iliRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр трубопровода
                let t = new Decimal(iliRow.NOMINAL_WALL_THICKNESS).toNumber(); // Толщина стенки трубопровода
                let l = new Decimal(iliRow.LENGTH).toNumber(); // Длина дефекта
                let d = new Decimal(iliRow.AVERAGE_DEPTH).toNumber(); // Глубина дефекта, %
                let c = new Decimal(iliRow.WIDTH).toNumber(); // Ширина дефекта
                this.initDefParameters_(iliRow, processParameters);

                let dmm = d / 100 * t; // Глубина дефекта, mm
                // Собственно расчет по СТО
                //* ******************************************************************
                // Переменные расчета
                let kCV; let k; let A1; let Q; let Rk; let d0; let Gkc; let Ak; let Q1; let es; let er; let Rc; let R; let ae1; let be1; let pz; let t1; let u1; let uz1; let w00; let h1; let e20; let e10;
					let w0z; let Rg; let o; let 
Rcz;
                k = NaN;
                let deftype = iliRow.ANOMALY_EXTENSION_CL.toString();

                // Расчет  ударной вязкости
                if (this.ksv === -1) { // Добавлено 25.02.16 - теперь при наличии значений используем 131 таблицу
                    kCV = 107.8; // Значение по-умолчанию
                    if ((this.p < 5.5 && dn === 1220) || (this.p < 7.5 && this.p > 5.5 && dn === 1020)) kCV = 39.5;
                    else if ((this.p < 7.5 && this.p > 5.5 && dn === 1220) || (this.p > 7.5 && dn === 1020)) kCV = 58.8;
                    else if ((this.p < 7.5 && this.p > 5.5 && dn === 1420) || (this.p > 7.5 && dn === 1220)) kCV = 78.4;
                    else if ((this.p < 5.5 && dn === 520) || (this.p < 5.5 && dn === 1020)) kCV = 29.5;
                    else if (this.p > 7.5 && dn === 1420) kCV = 107.8;
                } else kCV = this.ksv;
                // Первая проблема, "k" не всегда будет иметь значение, и как следствие, ниже будут runtime ошибки
                if (this.route_category === 2 || this.route_category === 3 || this.route_category === 4 || this.route_category === 5) {
                    // расчет коэффициента (категории участков)
                    if (this.route_category === 2 || this.route_category === 3) k = 24;
                    else if (this.route_category === 4 || this.route_category === 5) k = 20;

                    // расчет ранга для коррозионных дефектов
                    if (deftype === 'ANOMALY_EXT_001' || deftype === 'ANOMALY_EXT_007') {
                        A1 = this.p * (dn - t) / (2 * t * this.gv);
                        Q = Math.sqrt(1 + 0.31 * (l / Math.sqrt(dn * t))**2);
                        d0 = (A1 - 1) * Q / (A1 - Q);
                        Rk = 0.01 * d / d0;
                        rank = Rk;
                    }

                    // расчет ранга для крн
                    else if (deftype === 'ANOMALY_EXT_005') {
                        Gkc = 0.5 * this.p * (dn - 2 * t) / t;
                        Ak = this.pi * t * Gkc**2 / (219780 * kCV);
                        Q1 = Math.sqrt(1 + 0.31 * (l / Math.sqrt(dn * t))**2);
                        er = (-(Gkc / (Q1 * this.gv) - 1 - Ak) - Math.sqrt((Gkc / (Q1 * this.gv) - 1 - Ak)**2 - 4 * Ak * (1 - Gkc / this.gv))) / (2 * Ak);
                        es = d / 100;
                        Rc = es / er;
                        rank = Rc;
                    }
                    // расчет ранга для геометрии
                    else if (deftype === 'ANOMALY_EXT_003') {
                        // для дефектов имеющих геометрические размеры (длину, ширину) !== 0
                        if (l !== 0 && c !== 0) {
                            R = (dn - t) / 2;
                            pz = (this.p / this.e) * (1 - this.v * this.v) * (R / t)**3;
                            ae1 = l / 2;
                            be1 = c / 2;
                            t1 = 0.5 * R * this.pi / ae1;
                            u1 = 0.5 * R * this.pi / be1;
                            uz1 = 225 * t1**4 + 27 * this.v * t1**2 * (9 * u1**2 - 5) + 25 * (3 * u1**4 + 1);
                            h1 = (30 * (9 * u1**2 - 5) * pz) / (uz1 + 150 * (4 * u1**2 - 1) * pz);
                            w00 = dmm / (1 - h1);
                            e20 = 0.5 * t * w00 * (3 * u1**2 - 1) / (R**2);
                            e10 = 0.5 * t * w00 * (3 * t1**2 - 1) / (R**2);
                            w0z = w00 / dn;
                            Rg = k * Math.max(Math.max(e10, e20), w0z); // выбор наибольшего значения
                            rank = Rg;
                        }
                        // для дефектов у которых длина/ширина=0 и глубина незначительна – ранг опасности=0
                        if ((l === 0 || c === 0) && dmm < 0.03 * dn) rank = 0;
                    }
                    // расчет ранга для поверхностных, не крн и не коррозии
                    else if (deftype === 'ANOMALY_EXT_009' || deftype === 'ANOMALY_EXT_004') {
                        o = l / Math.sqrt(dn * t);
                        if (o > 0 && o <= 0.175) Rcz = dmm / 40;
                        else if (o > 0.175 && o <= 1.05) Rcz = dmm / (10.2 * o**-0.774);
                        else if (o > 1.05) Rcz = dmm / 10;
                        else Rcz = 0;
                        rank = Rcz;
                    }
				}
                //* ************************************************************************************************************
                // Помещаю результаты в dataset
                if (rank > 1) rank = 1;
                iliRow.STO_292_2007_DANGER_RANK = MathUtils.toNumber(rank, 14); // Ранг опасности дефекта
                iliRow.PIPE_PARAMS = this.pipe_params;
            }
        }
        return ds;
    }

    // СТО Газпром 2-2.3-401-2009 - Вероятность отказа для трубы с коррозионным дефектом
    calc_sto_2_2_3_401_2009(ds) {
        let rk;
        // Данные для расчета
        let iliTab = ds.Tables.ILI;
        // Сначала, проход только по одиночным дефектам!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if (new Decimal(iliRow.IS_CLUSTER) !== 0) // Это одиночный дефект
                if (iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_001'
					|| iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_007') { // Это корозионный дефект
                    // Переменная для результата расчета
                    let Po = NaN; // Вероятность отказа
                    try {
                        rk = new Decimal(iliRow.STO_292_2007_DANGER_RANK).toNumber();
                        // Собственно расчет по СТО
                        Po = Math.exp(-11.52 * (1 - rk)); // вероятность отказа в зависимости от ранга опасности (ранее рассчитанного!)
                        iliRow.STO_401_2009_FAIL_PROBABILITY = MathUtils.toNumber(Po, 20); // Помещаю результаты в dataset
                        iliRow.PIPE_PARAMS = this.pipe_params;
                    } catch (ex) {
                        iliRow.STO_401_2009_FAIL_PROBABILITY = null; // Вероятность отказа не заполняем
                    }
                }
        }
        // Теперь, проход только по группам дефектов!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if (new Decimal(iliRow.IS_CLUSTER) === 0) // Это группа дефектов
                if (iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_001'
					|| iliRow.ANOMALY_EXTENSION_CL === 'ANOMALY_EXT_007') { // Это корозионный дефект
                    // Переменная для результата расчета
                    let Po = NaN; // Вероятность отказа
                    // Получение параметров с конкретного дефекта
                    try {
                        rk = new Decimal(iliRow.STO_292_2007_DANGER_RANK).toNumber(); // Ранг опасности коррозионного дефекта
                        // Собственно расчет по СТО
                        Po = Math.exp(-11.52 * (1 - rk)); // вероятность отказа в зависимости от ранга опасности (ранее рассчитанного!)
                        iliRow.STO_401_2009_FAIL_PROBABILITY = MathUtils.toNumber(Po, 20); // Помещаю результаты в dataset Вероятность отказа
                        iliRow.PIPE_PARAMS = this.pipe_params;
                    } catch (ex) {
                        iliRow.STO_401_2009_FAIL_PROBABILITY = null; // Вероятность отказа не заполняем
                    }
                }
        }
        return ds;
    }

    // Р Газпром 2-2.3-595-2011 Назначение ремонтных рекомендации
    // Проблема }
    calc_sto_2_2_3_595_2011(ds, processParameters) {
        // Данные для расчета
        let iliTab = ds.Tables.ILI;
        // Сначала, проход только по одиночным дефектам!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i];// Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if (!(new Decimal(iliRow.IS_CLUSTER).eq(0))) { // Это одиночный дефект
                // Переменные для результата расчета
                let remmeth = ''; // Ремонтные рекомендации
                let depthsh = NaN; // Глубина сошлифовки
                let sqrsh = NaN; // Глубина сошлифовки
                let lspool = NaN; // Длина катушки/ трубы
                let remntd = ''; // Ссылка на раздел НТД с алгоритмом
                // Получение параметров с конкретного дефекта
                let dn = new Decimal(iliRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр, мм
                let t = new Decimal(iliRow.NOMINAL_WALL_THICKNESS).toNumber(); // Толщина стенки, мм
                let l = new Decimal(iliRow.LENGTH).toNumber(); // Длина дефекта, мм
                let d = new Decimal(iliRow.AVERAGE_DEPTH).toNumber(); // Глубина дефекта, мм
                let c = new Decimal(iliRow.WIDTH).toNumber(); // Ширина дефекта
                this.initDefParameters_(iliRow, processParameters);

                let dmm = d / 100 * t;
                let distofjoint = new Decimal(iliRow.US_WELD_DISTANCE).toNumber(); // Дистанция от шва
                let disttojoint = new Decimal(iliRow.DS_WELD_DISTANCE).toNumber(); // Дистанция до шва
                let defgrouptype = iliRow.ANOMALY_GROUP.toString(); // Группировка дефектов по признакам
                let deftype = iliRow.ANOMALY_EXTENSION_CL.toString(); // Тип дефекта

                // Переменные расчета
                let R = 0; let pz = 0; let t1 = 0; let u1 = 0; let uz1 = 0; let h1 = 0; let w00 = 0; let e20_c = 0; let e10_c = 0; let w0z_c = 0; let 
e10 = 0;
                let e20 = 0; let 
Gt = this.gtek;
                let w0z = 0; let 
recMax = 0;
                // Собственно расчет по СТО
                //* *********************************************************************************************
                //  ДЕФЕКТЫ ГЕОМЕТРИИ
                if (defgrouptype === '1' && l !== 0 && c !== 0) {
                    R = (dn - t) / 2;
                    pz = (this.p / this.e) * (1 - this.v**2) * (R / t)**3;
                    t1 = R * this.pi / l;
                    u1 = R * this.pi / c;
                    uz1 = 225 * t1**4 + 27 * this.v * t1**2 * (9 * u1**2 - 5) + 25 * (3 * u1**4 + 1);
                    h1 = (30 * (9 * u1**2 - 5) * pz) / (uz1 + 150 * (4 * u1**2 - 1) * pz);
                    w00 = dmm / (1 - h1);
                    e20_c = 0.5 * t * w00 * (3 * t1**2 - 1) / (R**2);
                    e10_c = 0.5 * t * w00 * (3 * u1**2 - 1) / (R**2);
                    w0z_c = w00 / dn;

                    // рекомендуемые решения для метода ремонта по остаточным продольным деформациям e10(т. 7.1)
                    if (this.route_category === 1) e10 = 4;
                    if (this.route_category === 2 || this.route_category === 3) {
                        if (e10_c > 0.055 * 0.833) e10 = 4;
                        if (e10_c > 0.0431 * 0.833 && e10_c <= 0.055 * 0.833) e10 = 3;
                        if (e10_c > 0.0301 * 0.833 && e10_c <= 0.043 * 0.833) e10 = 2;
                        if (e10_c <= 0.03 * 0.833) e10 = 1;
                    }
                    if (this.route_category === 4 || this.route_category === 5) {
                        if (e10_c > 0.055) e10 = 4;
                        if (e10_c > 0.0431 && e10_c <= 0.055) e10 = 3;
                        if (e10_c > 0.0301 && e10_c <= 0.043) e10 = 2;
                        if (e10_c <= 0.03) e10 = 1;
                    }
                    // рекомендуемые решения для ремонта по кольцевым деформациям e20(т. 7.1)
                    if (this.route_category === 1) e20 = 4;
                    if (this.route_category === 2 || this.route_category === 3) {
                        if (e20_c > 0.05 * 0.833) e20 = 4;
                        if (e20_c > 0.0401 * 0.833 && e20_c <= 0.055 * 0.833) e20 = 3;
                        if (e20_c > 0.0301 * 0.833 && e20_c <= 0.043 * 0.833) e20 = 2;
                        if (e20_c <= 0.03 * 0.833) e20 = 1;
                    }
                    if (this.route_category === 4 || this.route_category === 5) {
                        if (e20_c > 0.05) e20 = 4;
                        if (e20_c > 0.0401 && e20_c <= 0.055) e20 = 3;
                        if (e20_c > 0.0301 && e20_c <= 0.043) e20 = 2;
                        if (e20_c <= 0.03) e20 = 1;
                    }
                    // рекомендуемые решения для ремонта по глубине дефекта w0z(т. 7.1)
                    if (this.route_category === 1) w0z = 4;
                    if (this.route_category === 2 || this.route_category === 3) {
                        if (w0z_c > 0.05 * 0.833) w0z = 4;
                        if (w0z_c > 0.0401 * 0.833 && w0z_c <= 0.055 * 0.833) e20 = 3;
                        if (w0z_c > 0.0301 * 0.833 && w0z_c <= 0.043 * 0.833) e20 = 2;
                        if (w0z_c <= 0.03 * 0.833) w0z = 1;
                    }
                    if (this.route_category === 4 || this.route_category === 5) {
                        if (w0z_c > 0.05) w0z = 4;
                        if (w0z_c > 0.0401 && w0z_c <= 0.055) w0z = 3;
                        if (w0z_c > 0.0301 && w0z_c <= 0.043) w0z = 2;
                        if (w0z_c <= 0.03) w0z = 1;
                    }
                    // оценка рекомендации
                    recMax = Math.max(Math.max(e10, e20), w0z);
                    if (recMax === 1) {
                        remmeth = 'ОБПР';
                        remntd = 'Рекомендации по оценке прочности и устойчивости эксплуатируемых МГ и трубопроводов КС, 2006 [п. 7.4]';
                    }
                    if (recMax === 2) {
                        remmeth = 'ОСПР';
                        remntd = 'Рекомендации по оценке прочности и устойчивости эксплуатируемых МГ и трубопроводов КС, 2006 [п. 7.4]';
                    }
                    if (recMax === 3) {
                        remmeth = 'УПП';
                        remntd = 'Рекомендации по оценке прочности и устойчивости эксплуатируемых МГ и трубопроводов КС, п. 7.4';
                    }
                    if (recMax === 4) {
                        remmeth = 'УВП';
                        remntd = 'Рекомендации по оценке прочности и устойчивости эксплуатируемых МГ и трубопроводов КС, п. 7.4';
                    }
                }
                if (defgrouptype === '1' && (l === 0 || d === 0) && t >= d) {
                    remmeth = 'ОБПР';
                    remntd = 'Рекомендации по оценке прочности и устойчивости эксплуатируемых МГ и трубопроводов КС, п. 7.4.6';
                }
                if (defgrouptype === '1' && (disttojoint * 1000 < 251 || distofjoint * 1000 < 251)) {
                    remmeth = 'УВП';
                    remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, п. 9.1.3';
                }
                if (defgrouptype === '3') { //  ДЕФЕКТЫ СВАРКИ
                    remmeth = 'Замена катушки/трубы';
                    remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, п. 9.3.5';
                }
                if (defgrouptype === '3' && Math.max(l, c) < 0.5236 * d) {
                    remmeth = 'ОБПР';
                    remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, п. 9.3.5';
                }
                if (defgrouptype === '4') { //  ВНУТРЕННИЕ ДЕФЕКТЫ
                    remmeth = 'ОБПР';
                    remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, п. 9.1.5';
                }
                if (defgrouptype === '4' && (disttojoint * 1000 < 251 || distofjoint * 1000 < 251)) {
                    remmeth = 'УВП';
                    remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, п. 9.1.5';
                }
                let st = 0; let f41 = 0; let K41 = 0; let l41 = 0; let a41 = 0; let Q41 = 0; let dop_d1 = 0; let fr = 0; let Ewy = 0; let Eww = 0; let Ew1 = 0;
					let Ew = 0; let dop_d2 = 0; let 
dop_d = 0;
                // ПОВЕРХНОСТНЫЕ ДЕФЕКТЫ
                st = -0.7737;
                f41 = 1 - this.kn * this.kk1 * this.kkn * this.p / (this.km * Gt);
                K41 = 0.9 * f41 * this.kn * this.kk1 * this.kkn / this.km;
                a41 = K41 * this.p * (dn - t) / (2 * t * Gt);
                l41 = l / ((dn * t)**0.5);
                Q41 = (1 + 0.31 * Math.pow(l41, 2))**0.5;
                dop_d1 = ((a41 - 1) * Q41 * t) / (a41 - Q41); // допустимая глубина сошлифованной зоны d1
                this.r1 = 588 * this.km / (this.kk1 * this.kkn);
                fr = this.kn * this.p * dn / (2 * (this.r1 + this.kn * this.p));
                // рекомендуемые решения для всех поверхностных, кроме КРН
                if (this.route_category === 1) Ewy = 0.4;
                if (this.route_category === 2 || this.route_category === 3) Ewy = 0.45;
                if (this.route_category === 4 || this.route_category === 5) Ewy = 0.5;
                // рекомендуемые решения для КРН
                if (deftype === 'ANOMALY_EXT_005') {
                    if (this.route_category === 1) Ewy = 0.25;
                    if (this.route_category === 2 || this.route_category === 3) Ewy = 0.3;
                    if (this.route_category === 4 || this.route_category === 5) Ewy = 0.35;
                }
                // рекомендуемые решения для всех поверхностных, кроме КРН
                if (this.route_category === 1) Eww = 0.2;
                if (this.route_category === 2 || this.route_category === 3) Eww = 0.3;
                if (this.route_category === 4 || this.route_category === 5) Eww = 0.4;

                // рекомендуемые решения для КРН
                if (deftype === 'ANOMALY_EXT_005') {
                    if (this.route_category === 1) Eww = 0.15;
                    if (this.route_category === 2 || this.route_category === 3) Eww = 0.25;
                    if (this.route_category === 4 || this.route_category === 5) Eww = 0.3;
                }
                if (l41 <= 0.175) Ew1 = 0.4;
                if (l41 > 0.175 && l41 <= 1.05) Ew1 = 0.1022 * l41**st;
                if (l41 > 1.05) Ew1 = 0.1;
                Ew = Math.min(Ew1, Eww); // выбор минимального значения
                if ((c + 2) <= dn) dop_d2 = t - fr + Ewy * fr; // если ширина дефекта меньше диаметра трубы
                if ((c + 2) > dn) dop_d2 = t - fr + Ew * fr; // если ширина дефекта больше диаметра трубы
                dop_d = Math.min(dop_d1, dop_d2); // выбор минимального значения

                // для поверхностных дефектов - назначение ремонта
                if (defgrouptype === '2') {
                    if ((dmm + 0.2) <= dop_d && (dmm + 0.2) * (c + 2) <= this.pi * dn * (t - 0.9 * fr)) {
                        remmeth = 'КШ';
                        depthsh = dmm + 0.2;
                        sqrsh = (l + 2) * (c + 2);
                        remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, [п. 9.2]';
                    }
                }
                // для поверхностных дефектов, не удовлетворяющих проведению ремонта шлифовкой
                if (defgrouptype === '2' && remmeth !== 'КШ') {
                    if (dn <= 1420 && l <= 500 && c <= 70 && l * c < 35000) remmeth = 'Заварка';
                    if (dn <= 1220 && l <= 430 && c <= 65 && l * c < 27950) remmeth = 'Заварка';
                    if (dn <= 1020 && l <= 360 && c <= 60 && l * c < 21600) remmeth = 'Заварка';
                    if (dn <= 720 && l <= 300 && c <= 55 && l * c < 16500) remmeth = 'Заварка';
                }
                if (remmeth === 'Заварка') remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, [п. 9.3]';
                // для поверхностных дефектов, не удовлетворяющих проведению ремонта шлифовкой, заваркой
                if (defgrouptype === '2' && remmeth !== 'Заварка' && remmeth !== 'КШ') {
                    remmeth = 'Замена катушки/трубы';
                    remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, [п. 9.4]';
                }

                //* *********************************************************************************************
                // Помещаю результаты в ds
                if (remmeth !== '') iliRow.R_595_2011_REPAIR_METHOD = remmeth; // Ремонтные рекомендации
                else iliRow.R_595_2011_REPAIR_METHOD = null;
                iliRow.R_595_2011_DEPTH_ABRASION = MathUtils.toNumber(depthsh, 3); // Глубина сошлифовки
                iliRow.R_595_2011_SQUARE_ABRASION = MathUtils.toNumber(sqrsh, 0); // Площадь сошлифовки
                iliRow.R_595_2011_LENGTH_PIPE_REPAIR = MathUtils.toNumber(lspool, 0); // Длина катушки/ трубы
                if (remntd !== '') iliRow.R_595_2011_COMMENT = remntd; // Ссылка на раздел НТД с алгоритмом
                else iliRow.R_595_2011_COMMENT = null;
                iliRow.PIPE_PARAMS = this.pipe_params;
            }
        }
        // Теперь, проход только по группам дефектов!
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            if ((new Decimal(iliRow.IS_CLUSTER).eq(0))) { // Это группа дефектов
                // Переменные для результата расчета
                let remmeth = ''; // Ремонтные рекомендации
                let depthsh = NaN; // Глубина сошлифовки
                let sqrsh = NaN; // Глубина сошлифовки
                let lspool = NaN; // Длина катушки/ трубы
                let remntd = ''; // Ссылка на раздел НТД с алгоритмом
                // Получение параметров с конкретного дефекта
                let dn = new Decimal(iliRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр, мм
                let t = new Decimal(iliRow.NOMINAL_WALL_THICKNESS).toNumber(); // Толщина стенки, мм
                let l = new Decimal(iliRow.LENGTH).toNumber(); // Длина дефекта, мм
                let d = new Decimal(iliRow.AVERAGE_DEPTH).toNumber(); // Глубина дефекта, мм
                let c = new Decimal(iliRow.WIDTH).toNumber(); // Ширина дефекта
                this.initDefParameters_(iliRow, processParameters);

                let dmm = d / 100 * t;
                let distofjoint = new Decimal(iliRow.US_WELD_DISTANCE).toNumber(); // Дистанция от шва
                let disttojoint = new Decimal(iliRow.DS_WELD_DISTANCE).toNumber(); // Дистанция до шва
                let defgrouptype = iliRow.ANOMALY_GROUP.toString(); // Группировка дефектов по признакам
                let deftype = iliRow.ANOMALY_EXTENSION_CL.toString(); // Тип дефекта
                // Переменные расчета
                let R; let pz; let t1; let u1; let uz1; let h1; let w00; let e20_c; let e10_c; let w0z_c; let 
e10 = NaN;
                let e20 = NaN; let 
Gt = this.gtek;
                let w0z = NaN; let 
recMax = NaN;
                // Собственно расчет по СТО
                //* *********************************************************************************************
                //  ДЕФЕКТЫ ГЕОМЕТРИИ
                if (defgrouptype === '1' && l !== 0 && c !== 0) {
                    R = (dn - t) / 2;
                    pz = (this.p / this.e) * (1 - this.v**2) * (R / t)**3;
                    t1 = R * this.pi / l;
                    u1 = R * this.pi / c;
                    uz1 = 225 * t1**4 + 27 * this.v * t1**2 * (9 * u1**2 - 5) + 25 * (3 * u1**4 + 1);
                    h1 = (30 * (9 * u1**2 - 5) * pz) / (uz1 + 150 * (4 * u1**2 - 1) * pz);
                    w00 = dmm / (1 - h1);
                    e20_c = 0.5 * t * w00 * (3 * t1**2 - 1) / (R**2);
                    e10_c = 0.5 * t * w00 * (3 * u1**2 - 1) / (R**2);
                    w0z_c = w00 / dn;
                    // рекомендуемые решения для метода ремонта по остаточным продольным деформациям e10(т. 7.1)
                    if (this.route_category === 1) e10 = 4;
                    if (this.route_category === 2 || this.route_category === 3) {
                        if (e10_c > 0.055 * 0.833) e10 = 4;
                        if (e10_c > 0.0431 * 0.833 && e10_c <= 0.055 * 0.833) e10 = 3;
                        if (e10_c > 0.0301 * 0.833 && e10_c <= 0.043 * 0.833) e10 = 2;
                        if (e10_c <= 0.03 * 0.833) e10 = 1;
                    }
                    if (this.route_category === 4 || this.route_category === 5) {
                        if (e10_c > 0.055) e10 = 4;
                        if (e10_c > 0.0431 && e10_c <= 0.055) e10 = 3;
                        if (e10_c > 0.0301 && e10_c <= 0.043) e10 = 2;
                        if (e10_c <= 0.03) e10 = 1;
                    }
                    // рекомендуемые решения для ремонта по кольцевым деформациям e20(т. 7.1)
                    if (this.route_category === 1) e20 = 4;
                    if (this.route_category === 2 || this.route_category === 3) {
                        if (e20_c > 0.05 * 0.833) e20 = 4;
                        if (e20_c > 0.0401 * 0.833 && e20_c <= 0.055 * 0.833) e20 = 3;
                        if (e20_c > 0.0301 * 0.833 && e20_c <= 0.043 * 0.833) e20 = 2;
                        if (e20_c <= 0.03 * 0.833) e20 = 1;
                    }
                    if (this.route_category === 4 || this.route_category === 5) {
                        if (e20_c > 0.05) e20 = 4;
                        if (e20_c > 0.0401 && e20_c <= 0.055) e20 = 3;
                        if (e20_c > 0.0301 && e20_c <= 0.043) e20 = 2;
                        if (e20_c <= 0.03) e20 = 1;
                    }
                    // рекомендуемые решения для ремонта по глубине дефекта w0z(т. 7.1)
                    if (this.route_category === 1) w0z = 4;
                    if (this.route_category === 2 || this.route_category === 3) {
                        if (w0z_c > 0.05 * 0.833) w0z = 4;
                        if (w0z_c > 0.0401 * 0.833 && w0z_c <= 0.055 * 0.833) e20 = 3;
                        if (w0z_c > 0.0301 * 0.833 && w0z_c <= 0.043 * 0.833) e20 = 2;
                        if (w0z_c <= 0.03 * 0.833) w0z = 1;
                    }
                    if (this.route_category === 4 || this.route_category === 5) {
                        if (w0z_c > 0.05) w0z = 4;
                        if (w0z_c > 0.0401 && w0z_c <= 0.055) w0z = 3;
                        if (w0z_c > 0.0301 && w0z_c <= 0.043) w0z = 2;
                        if (w0z_c <= 0.03) w0z = 1;
                    }
                    // оценка рекомендации
                    recMax = Math.max(Math.max(e10, e20), w0z);
                    if (recMax === 1) {
                        remmeth = 'ОБПР';
                        remntd = 'Рекомендации по оценке прочности и устойчивости эксплуатируемых МГ и трубопроводов КС, 2006 [п. 7.4]';
                    }
                    if (recMax === 2) {
                        remmeth = 'ОСПР';
                        remntd = 'Рекомендации по оценке прочности и устойчивости эксплуатируемых МГ и трубопроводов КС, 2006 [п. 7.4]';
                    }
                    if (recMax === 3) {
                        remmeth = 'УПП';
                        remntd = 'Рекомендации по оценке прочности и устойчивости эксплуатируемых МГ и трубопроводов КС, п. 7.4';
                    }
                    if (recMax === 4) {
                        remmeth = 'УВП';
                        remntd = 'Рекомендации по оценке прочности и устойчивости эксплуатируемых МГ и трубопроводов КС, п. 7.4';
                    }
                }
                if (defgrouptype === '1' && (l === 0 || d === 0) && t >= d) {
                    remmeth = 'ОБПР';
                    remntd = 'Рекомендации по оценке прочности и устойчивости эксплуатируемых МГ и трубопроводов КС, п. 7.4.6';
                }
                if (defgrouptype === '3') { //  ДЕФЕКТЫ СВАРКИ
                    remmeth = 'Замена катушки/трубы';
                    remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, п. 9.3.5';
                }
                if (defgrouptype === '3' && Math.max(l, c) < 0.5236 * d) {
                    remmeth = 'ОБПР';
                    remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, п. 9.3.5';
                }
                if (defgrouptype === '4') { //  ВНУТРЕННИЕ ДЕФЕКТЫ
                    remmeth = 'ОБПР';
                    remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, п. 9.1.5';
                }
                if (defgrouptype === '4' && (disttojoint * 1000 < 251 || distofjoint * 1000 < 251)) {
                    remmeth = 'УВП';
                    remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, п. 9.1.5';
                }
                let st; let f41; let K41; let l41; let a41; let Q41; let dop_d1; let fr; let Ewy = NaN; let Eww = NaN; let Ew1 = NaN; let Ew; let dop_d2 = 0;
					let dop_d = NaN;
                // ПОВЕРХНОСТНЫЕ ДЕФЕКТЫ
                st = -0.7737;
                f41 = 1 - this.kn * this.kk1 * this.kkn * this.p / (this.km * Gt);
                K41 = 0.9 * f41 * this.kn * this.kk1 * this.kkn / this.km;
                a41 = K41 * this.p * (dn - t) / (2 * t * Gt);
                l41 = l / ((dn * t)**0.5);
                Q41 = (1 + 0.31 * Math.pow(l41, 2))**0.5;
                dop_d1 = ((a41 - 1) * Q41 * t) / (a41 - Q41); // допустимая глубина сошлифованной зоны d1
                this.r1 = 588 * this.km / (this.kk1 * this.kkn);
                fr = this.kn * this.p * dn / (2 * (this.r1 + this.kn * this.p));

                // рекомендуемые решения для всех поверхностных, кроме КРН
                if (this.route_category === 1) Ewy = 0.4;
                if (this.route_category === 2 || this.route_category === 3) Ewy = 0.45;
                if (this.route_category === 4 || this.route_category === 5) Ewy = 0.5;

                // рекомендуемые решения для КРН
                if (deftype === 'ANOMALY_EXT_005') {
                    if (this.route_category === 1) Ewy = 0.25;
                    if (this.route_category === 2 || this.route_category === 3) Ewy = 0.3;
                    if (this.route_category === 4 || this.route_category === 5) Ewy = 0.35;
                }
                // рекомендуемые решения для всех поверхностных, кроме КРН
                if (this.route_category === 1) Eww = 0.2;
                if (this.route_category === 2 || this.route_category === 3) Eww = 0.3;
                if (this.route_category === 4 || this.route_category === 5) Eww = 0.4;
                // рекомендуемые решения для КРН
                if (deftype === 'ANOMALY_EXT_005') {
                    if (this.route_category === 1) Eww = 0.15;
                    if (this.route_category === 2 || this.route_category === 3) Eww = 0.25;
                    if (this.route_category === 4 || this.route_category === 5) Eww = 0.3;
                }
                if (l41 <= 0.175) Ew1 = 0.4;
                if (l41 > 0.175 && l41 <= 1.05) Ew1 = 0.1022 * l41**st;
                if (l41 > 1.05) Ew1 = 0.1;
                Ew = Math.min(Ew1, Eww); // выбор минимального значения
                if ((c + 2) <= dn) dop_d2 = t - fr + Ewy * fr; // если ширина дефекта меньше диаметра трубы
                if ((c + 2) > dn) dop_d2 = t - fr + Ew * fr; // если ширина дефекта больше диаметра трубы
                dop_d = Math.min(dop_d1, dop_d2); // выбор минимального значения
                // для поверхностных дефектов - назначение ремонта
                if (defgrouptype === '2') {
                    if ((dmm + 0.2) <= dop_d && (dmm + 0.2) * (c + 2) <= this.pi * dn * (t - 0.9 * fr)) {
                        remmeth = 'КШ';
                        depthsh = dmm + 0.2;
                        sqrsh = (l + 2) * (c + 2);
                        remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, [п. 9.2]';
                    }
                }
                // для поверхностных дефектов, не удовлетворяющих проведению ремонта шлифовкой
                if (defgrouptype === '2' && remmeth !== 'КШ') {
                    if (dn <= 1420 && l <= 500 && c <= 70 && l * c < 35000) remmeth = 'Заварка';
                    if (dn <= 1220 && l <= 430 && c <= 65 && l * c < 27950) remmeth = 'Заварка';
                    if (dn <= 1020 && l <= 360 && c <= 60 && l * c < 21600) remmeth = 'Заварка';
                    if (dn <= 720 && l <= 300 && c <= 55 && l * c < 16500) remmeth = 'Заварка';
                }
                if (remmeth === 'Заварка') remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, [п. 9.3]';
                // для поверхностных дефектов, не удовлетворяющих проведению ремонта шлифовкой, заваркой
                if (defgrouptype === '2' && remmeth !== 'Заварка' && remmeth !== 'КШ') {
                    remmeth = 'Замена катушки/трубы';
                    remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, [п. 9.4]';
                }
                // Для кластера - ремонтной зоны метод ремонта замена катушки
                if (defgrouptype === '1') {
                    remmeth = 'Замена катушки/трубы';
                    remntd = 'Р Газпром 2-2.3-595-2011 Правила назначения методов ремонта дефектных участков линейной части магистральных газопроводов Единой системы газоснабжения ОАО Газпром, [п. 7]';
                }
                //* *********************************************************************************************
                // Помещаю результаты в ds
                if (remmeth !== '') iliRow.R_595_2011_REPAIR_METHOD = remmeth; // Ремонтные рекомендации
                else iliRow.R_595_2011_REPAIR_METHOD = null;
                iliRow.R_595_2011_DEPTH_ABRASION = MathUtils.toNumber(depthsh, 3); // Глубина сошлифовки
                iliRow.R_595_2011_SQUARE_ABRASION = MathUtils.toNumber(sqrsh, 0); // Площадь сошлифовки
                iliRow.R_595_2011_LENGTH_PIPE_REPAIR = MathUtils.toNumber(lspool, 0); // Длина катушки/ трубы
                if (remntd !== '') iliRow.R_595_2011_COMMENT = remntd; // Ссылка на раздел НТД с алгоритмом
                else iliRow.R_595_2011_COMMENT = null;
                iliRow.PIPE_PARAMS = this.pipe_params;
            }
        }
        // Оценка трудоемкости КШ – п. 9.4.1
        // Теперь, проход по одиночным дефектам, не входящим в кластера и самим кластерам
        for (let i = 0; i < iliTab.rows.length; i++) {
            let iliRow = iliTab.rows[i]; // Текущая запись
            if (!this.isRequirementsSatisfy_(iliRow)) continue;
            // Получение параметров с конкретного дефекта
            let dn = new Decimal(iliRow.NOMINAL_DIAMETER_GCL).toNumber(); // Диаметр, мм
            let t = new Decimal(iliRow.NOMINAL_WALL_THICKNESS).toNumber(); // Толщина стенки, мм
            let l = new Decimal(iliRow.LENGTH).toNumber(); // Длина дефекта, мм
            let d = new Decimal(iliRow.AVERAGE_DEPTH).toNumber(); // Глубина дефекта, мм
            this.initDefParameters_(iliRow, processParameters);

            let Ltr = 1000 * new Decimal(iliRow.DEFECT_PIPE_LENGTH).toNumber(); // Длина трубы, м
            let defgroup = new Decimal(iliRow.IS_CLUSTER).toNumber(); // Признак, кластер это, или нет
            let defgrouptype = iliRow.ANOMALY_GROUP.toString(); // Группировка дефектов по признакам
            let remmeth = iliRow.R_595_2011_REPAIR_METHOD ? iliRow.R_595_2011_REPAIR_METHOD.toString() : '';
            let depthsh = NaN;
            let sqrsh = NaN;
            let lspool = NaN;
            if (defgroup === -1 || defgroup === 0) { // одиночный дефект вне кластера или кластер
                // для всех дефектов лежащих на одной трубе и являющихся поверхностными и для которых назначен ремонт КШ
                if (defgrouptype === '2' && remmeth === 'КШ') {
                    let Vt = 0.002 * Ltr * dn * t; // объем сошлифовки по трубе
                    let Vd = this.getVdForTube_(iliTab, iliRow.WELD_NUMBER.toString()); // общая площадь по дефектам (берется)
                    depthsh = new Decimal(iliRow.R_595_2011_DEPTH_ABRASION).toNumber();
                    sqrsh = new Decimal(iliRow.R_595_2011_SQUARE_ABRASION).toNumber();
                    if (Vd > Vt) {
                        remmeth = 'Замена катушки/трубы';
                        // Сброшу размеры сошлифовки, так как заменил тип ремонта
                        depthsh = NaN;
                        sqrsh = NaN;
                        iliRow.R_595_2011_DEPTH_ABRASION = null; // Глубина сошлифовки
                        iliRow.R_595_2011_SQUARE_ABRASION = null; // Площадь сошлифовки
                    }
                }
                // заполнение расчетных параметров для разных видов ремонта
                if (remmeth === 'Замена катушки/трубы') lspool = Math.max(l, dn); // максимальное из длины и диаметра трубы
                if (remmeth === 'УВП' || remmeth === 'УПП') lspool = Math.max(l, dn); // максимальное из длины и диаметра трубы
                if (remmeth === 'КШ' && d === 0) depthsh = 0;
                // Помещаю результаты в ds
                if (remmeth !== '') iliRow.R_595_2011_REPAIR_METHOD = remmeth; // Ремонтные рекомендации
                else iliRow.R_595_2011_REPAIR_METHOD = null;
                iliRow.R_595_2011_DEPTH_ABRASION = MathUtils.toNumber(depthsh, 3); // Глубина сошлифовки
                iliRow.R_595_2011_LENGTH_PIPE_REPAIR = MathUtils.toNumber(lspool, 0); // Длина катушки/ трубы
            }
        }
        return ds;
    }
}

module.exports = IliPressure;
