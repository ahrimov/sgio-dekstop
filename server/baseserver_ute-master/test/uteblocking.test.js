const fs = require('fs');
const path = require('path');
const {canCallUteProcess} = require("../src/utils/blocking");
const REPO_ROOT = path.dirname(__dirname);
const testData = path.join(REPO_ROOT,'./test/data/blocking/');
describe("UteBlocking tests", () => {
	it("ute block success 1", async () => {
		let data = fs.readFileSync(path.join(testData, 'log1.txt'), 'utf8');
		let res = canCallUteProcess(data,'sto-ili-insp-proc');
		expect(res).toBe(true);
	});

	it("ute block fail 2", async () => {
		let data = fs.readFileSync(path.join(testData, 'log2.txt'), 'utf8');
		let res = canCallUteProcess(data,'sto-ili-insp-proc');
		expect(res).toBe(false);
	});

	it("ute block success 3", async () => {
		let data = fs.readFileSync(path.join(testData, 'log3.txt'), 'utf8');
		let res = canCallUteProcess(data,'ili-import-xml');
		expect(res).toBe(true);
	});

	it("ute block fail 4", async () => {
		let data = fs.readFileSync(path.join(testData, 'log4.txt'), 'utf8');
		let res = canCallUteProcess(data,'ili-import-xml');
		expect(res).toBe(false);
	});

	it("ute block success 5 ili-insp-link", async () => {
		let data = fs.readFileSync(path.join(testData, 'log5.txt'), 'utf8');
		let res = canCallUteProcess(data,'ili-insp-link');
		expect(res).toBe(true);
	});

	it("ute block fail 6 ili-import-xml", async () => {
		let data = fs.readFileSync(path.join(testData, 'log6.txt'), 'utf8');
		let res = canCallUteProcess(data,'ili-import-xml');
		expect(res).toBe(false);
	});

	it("ute block success 7 interval-divining", async () => {
		let data = fs.readFileSync(path.join(testData, 'log6.txt'), 'utf8');
		let res = canCallUteProcess(data,'interval-divining');
		expect(res).toBe(false);
	});

	it("ute block success empty file", async () => {
		let data = "";
		let res = canCallUteProcess(data,'ili-import-xml');
		expect(res).toBe(true);
	});

	it("ute block success no log", async () => {
		let data = '';
		try{
			data = fs.readFileSync(path.join(testData, 'log6aa.txt'), 'utf8');
		}
		catch(ex){}
		let res = canCallUteProcess(data,'interval-divining');
		expect(res).toBe(true);
	});

	it("ute block fail 7 OFFLINE_LINE_Idx.xml", async () => {
		let data = fs.readFileSync(path.join(testData, 'log7.txt'), 'utf8');
		let res = canCallUteProcess(data,'offline-line-idx');
		expect(res).toBe(false);
	});

	it("ute block fail 8 cluster", async () => {
		let data = fs.readFileSync(path.join(testData, 'log8.txt'), 'utf8');
		let res = canCallUteProcess(data,'ili-cluster');
		expect(res).toBe(false);
	});

	it("ute block success 9 cluster", async () => {
		let data = fs.readFileSync(path.join(testData, 'log9.txt'), 'utf8');
		let res = canCallUteProcess(data,'line-route-idx');
		expect(res).toBe(true);
	});

});
