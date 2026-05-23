const {
    uteLrsRouteCalcPrepareService,
    uteKmRouteCalcPrepareService,
    uteIliInspCalcPrepareService,
    uteLinkRepersPrepareService,
    uteIliClusterPrepareService,
    uteStoEnzInspPrepareService,
    uteStoIliInspPrepareService,
    uteIliPressurePrepareService,
    uteIliImportXmlPrepareService,
    uteIntervalDiviningPrepareService,
    uteGroupRouteIdxPrepareService,
    uteOfflineLineIdxPrepareService,
    uteLineRouteIdxPrepareService,
} = require("../service/ute");

module.exports = async function utePrepare(req, res, next) {
    try {
        let urlPath = req.params['0'];
        switch(urlPath){
            case 'lrs-route-calc':
                //<input process_id="c1776112" route_id="53"/>
                req.parsedData = await uteLrsRouteCalcPrepareService.parseRequest(req.body);
                break;
            case 'km-route-calc':
                //<input process_id="eff3a9e9" route_id="53"/>
                req.parsedData = await uteKmRouteCalcPrepareService.parseRequest(req.body);
                break;
            case 'ili-insp-calc':
                // <input inspection_id="1301759" ps_idx="true" process_id="7d906ac9" />
                req.parsedData = await uteIliInspCalcPrepareService.parseRequest(req.body);
                break;
            case 'ili-insp-link':
                //<input process_id="eff3a9e9" route_id="53"/>
                req.parsedData = await uteLinkRepersPrepareService.parseRequest(req.body);
                break;
            case 'ili-import-xml':
                //<input process_id="37dd9577" do_calc_inspection="true" xml_file_name="ооо газпром трансгаз чайковский_ямбург - тула - 1_1420_кс карпинская - кс гремячинская_2020_7_21-d679a95d.xml" pipe="1305491" km_start="1430.6" km_end="1553" date="25.11.2020" format="xml" company="UNKNOWN" ps_idx="false"
                req.parsedData = await uteIliImportXmlPrepareService.parseRequest(req.body);
                break;
            case 'ili-cluster':
                //<input pressure="7.4" thickness="16"  inspection_id="1301676" process_id="7eed7692"/>
                req.parsedData = await uteIliClusterPrepareService.parseRequest(req.body);
                break;
            case 'sto-ehz-insp-proc':
                //<input process_id="409f54a2" calc_line_events="true" line_events_query="select event_id from PODS.ILI_INSPECTION_RANGE where ili_inspection_id = 1301993" calc_construction_intervals="true" construction_element_query="select event_id from pods.valve" calc_regular_intervals="true" regular_intervals_distance="100" install_date="11.6.2002" calc_sto_xxx="true"  inspection_id="1301993"/>
                req.parsedData = await uteStoEnzInspPrepareService.parseRequest(req.body);
                break;
            case 'sto-ili-insp-proc':
                //<input process_id="c18144e4" calc_line_events="true" line_events_query="select event_id from PODS.ILI_INSPECTION_RANGE where ili_inspection_id = 1302016" calc_construction_intervals="true" construction_element_query="select event_id from pods.valve" calc_regular_intervals="true" regular_intervals_distance="100" pressure="7.36" breaking_point="588" safety_factor_of_internal_pressure="1.1" safety_factor_of_working_conditions="0.9" safety_factor_of_material="1" safety_factor_of_destination="1.34" thickness="16" lifetime="25" average_cost_of_responding="150" cost_of_replacing_a_pipe="0.6" cost_of_the_ILI_per_km="0.1" cost_per_hole="0.2" cost_of_repair_per_km="23.8" calc_sto_2_2_3_292_2007="true" calc_sto_2_2_3_401_2003="true" calc_sto_2_2_3_095_2007="true" calc_sto_xxx="true" inspection_id="1302016" root_path="/home/websys53/gis_web77/website/" />
                req.parsedData = await uteStoIliInspPrepareService.parseRequest(req.body);
                break;
            case 'ili-pressure':
                //<input process_id="09f91102" inspection_id="1301993" pressure="7.36" breaking_point="588" yielding_limit="490" elastic_modulus="206000" safety_factor_of_internal_pressure="1.1" safety_factor_of_working_conditions="0.9" safety_factor_of_material="1" safety_factor_of_destination="1.34" route_category="4" thickness="16" calc_sto_2_2_3_112_2007="true" calc_sto_2_2_3_173_2007="true" calc_sto_2_2_3_292_2009="true" calc_sto_2_2_3_401_2009="true" calc_sto_2_2_3_595_2011="true" calc_sto_2_2_3_620_2011="true" calc_sto_ltg="true" resilience="142" CALC_STO_2_2_3_112_2007="true" CALC_STO_2_2_3_173_2007="true" CALC_STO_2_2_3_292_2009="true" CALC_STO_2_2_3_401_2009="true" CALC_STO_2_2_3_595_2011="true" />
                req.parsedData = await uteIliPressurePrepareService.parseRequest(req.body);
                break;
            case 'group-route-idx':
                // <input group_name="Крановая площадка->конструктивный элемент" featureTableGroup="STRUCTURE" feature_id="VALVE" route_id="1305490" process_id="43ffc7f5" />
                req.parsedData = await uteGroupRouteIdxPrepareService.parseRequest(req.body);
                break;
            case 'offline-line-idx':
                // <input buffer_width="5" event_type_LABEL="Родительский элемент группы" event_type="OFFLN_EV_TYPE_09" feature_id="STRUCTURE" line_id="1300019" process_id="93341937" />
                req.parsedData = await uteOfflineLineIdxPrepareService.parseRequest(req.body);
                break;
            case 'line-route-idx':
                // <input buffer_width="5" feature_id="TEST_LEAD" route_id="1305490" process_id="f4854f36" />
                req.parsedData = await uteLineRouteIdxPrepareService.parseRequest(req.body);
                break;
            case 'interval-divining':
                //<input process_id="1e855cba" route_id="1305490" regular_intervals="true" regular_intervals_distance="50" feature_types="" construction_element_query="" />
                req.parsedData = await uteIntervalDiviningPrepareService.parseRequest(req.body);
                break;
        }

    } catch (e) {
        next(e);
    }
    next();
};
