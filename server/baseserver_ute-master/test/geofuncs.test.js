const request = require("supertest");
const GeoFuncs = require('../src/utils/GeoFuncs')
describe("GeoFuncs tests", () => {
    beforeEach(() => {
        //jest.setTimeout(60000);
    });
    it("Fail getDist. Empty params", async () => {
        const res = GeoFuncs.getDist();
        expect(res.status).toBeUndefined();
    });
    it("Success getDist 1", async () => {
        const res = GeoFuncs.getDist(1,1,3,2,2,4);
        expect(res).toEqual(156878.87991176712);
    });
    it("Success getDist 2", async () => {
        const res = GeoFuncs.getDist(1,1,0,2,2,0);
        expect(res).toEqual(156878.87990857995);
    });

    it("Success wgsP42 1  Чайковская", async () => {
        const {b2, l2} = GeoFuncs.wgsP42(56.4351667463,53.5748290920);
        expect(b2).toEqual(56.43485839787765);
        expect(l2).toEqual(53.57638654176837);
    });

    it("Success wgsP42 2  Санкт-Петербург", async () => {
        const {b2, l2} = GeoFuncs.wgsP42(59.9095989503,30.2947997993);
        expect(b2).toEqual(59.90964298666699);
        expect(l2).toEqual(30.2970196724112);
    });

    it("Success p42Wgs 1 Чайковская", async () => {
        const {b2, l2} = GeoFuncs.p42Wgs(56.43485839787765,53.57638654176837);
        expect(b2).toEqual(56.43516679288444);
        expect(l2).toEqual(53.57482909455251);
    });

    it("Success p42Wgs 2 Санкт-Петербург", async () => {
        const {b2, l2} = GeoFuncs.p42Wgs(59.90964298666699,30.2970196724112);
        expect(b2).toEqual(59.90959899459707);
        expect(l2).toEqual(30.29479980733522);
    });


});
