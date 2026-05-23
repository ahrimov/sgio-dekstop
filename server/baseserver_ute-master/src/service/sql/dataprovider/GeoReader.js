const fs = require('fs');
const wkx = require('wkx');
const path = require('path');
const convert = require("xml-js");

const {errors} = require("../../../resources");
const {ErrorHandler, Database, Utils, config} = require("gis-core");
const dataTypeTransform = Utils.dataTypeTransform;
const {QueryInfo, QUERY_TYPE} = require("./QueryInfo");
const DataProvider = require('./DataProvider');
const DB = require("../../ute/db");

class GeoReader {
	constructor(fillBounds = true, idFields = 'ID', outGeoField = 'WKB_GEOMETRY') {
		this.fillBound = fillBounds;
		this.idFields = idFields;
		this.outGeoField = outGeoField;
	}



	//TODO move to helper class
	getGeometry(coordinates, stride) {
		if (!coordinates || coordinates.length === 0)
			return;
		if (coordinates.length === 1) {//point
			let coordinate = coordinates[0];
			if (stride === 2)
				return new wkx.Point(coordinate[0], coordinate[1]);
			if (stride === 3)
				return new wkx.Point(coordinate[0], coordinate[1], coordinate[2]);
		} else if (coordinates.length === 2) {//line
			let coordinate1 = coordinates[0];
			let coordinate2 = coordinates[1];
			let p1, p2;
			if (stride === 2) {
				p1 = new wkx.Point(coordinate1[0], coordinate1[1]);
				p2 = new wkx.Point(coordinate2[0], coordinate2[1]);
			}
			if (stride === 3) {
				p1 = new wkx.Point(coordinate1[0], coordinate1[1], coordinate1[2]);
				p2 = new wkx.Point(coordinate2[0], coordinate2[1], coordinate2[2]);
			}
			return new wkx.LineString([p1, p2]);
		} else {//line or polygon
			let firstP = coordinates[0], lastP = coordinates[coordinates.length - 1];
			let isPolygon = false;
			if (stride === 2)
				isPolygon = (firstP[0] === lastP[0] && firstP[1] === lastP[1]);
			else
				isPolygon = (firstP[0] === lastP[0] && firstP[1] === lastP[1] && firstP[2] === lastP[2]);
			let points = [];
			coordinates.forEach(coordinate => {
				if (stride === 2)
					points.push(new wkx.Point(coordinate[0], coordinate[1]));
				else
					points.push(new wkx.Point(coordinate[0], coordinate[1], coordinate[2]));
			});
			if (!isPolygon)
				return new wkx.LineString(points);
			else
				return new wkx.Polygon(points);
		}
	}
	async composeGeoReaderResult(outResult, queryBlock, fillBounds, idFields = 'ID', geoField = 'X,Y', outGeoField = 'WKB_GEOMETRY') {
		let res = outResult[0];
		let fields = outResult[1] && outResult[1].fields;
		let rows = [];
		let geoColumn = this.getColumn(fields, outGeoField);

		try {
			let qi = new QueryInfo(idFields, geoField);
			let minX = Number.MAX_VALUE;
			let minY = Number.MAX_VALUE;
			let maxX = Number.MIN_VALUE;
			let maxY = Number.MIN_VALUE;

			let geoList = [], coords = [];//List<ICoordinate>
			let prevId = null, prevBaseId = null;
			let newRow;
			let wrongGeo = false;
			let stride = 2;
			let minXCol, minYCol, maxXCol, maxYCol;
			if (fillBounds) {
				minXCol = 'MINX';
				minYCol = 'MINY';
				maxXCol = 'MAXX';
				maxYCol = 'MAXY';
			}
			for(let fItem of res){
				let id = qi.getId(fItem);
				let baseId = qi.getBaseId(fItem);
				if (id === null || id !== prevId) {
					if (coords.length > 0) {
						geoList.push(...coords);
						coords = [];
					}
					if( id === null || baseId !== prevBaseId){
						if(newRow){
							let isWkb = geoList.length > 0 && geoList[0] instanceof Buffer;
							let geo = (!isWkb) ? this.getGeometry(this.simplify(geoList), stride) : geoList[0];
							this.writeGeo(newRow, outGeoField, geo);
							if (minXCol){
								newRow[minXCol] = minX;
								newRow[minYCol] = minY;
								newRow[maxXCol] = maxX;
								newRow[maxYCol] = maxY;
								minX = minY = Number.MAX_VALUE;
								maxX = maxY = Number.MIN_VALUE;
							}
							rows.push(newRow);
						}
						newRow = {};
						wrongGeo = false;
						geoList = [];
						Object.keys(fItem).forEach(key => {
							if(qi.isExtIdField(key) || qi.isGeoField(key))
								return;
							newRow[key.toUpperCase()] = fItem[key];
						});
					}
				}
				switch (qi.qType()){
					case QUERY_TYPE.WKB:
						let geoData = fItem[qi.geoFields()[0]];
						if (geoData)
							geoList.push(geoData);
						break;
					case QUERY_TYPE.XY:
						let coord = {};
						for (let i = 0; i < qi.geoFields().length; i++) {
							let field = qi.geoFields()[i];
							let valObj = fItem[field];
							let val = parseFloat(valObj);
							if (i === 0)
								coord.x = val;
							if (i === 1)
								coord.y = val;
							if (i === 2)
								coord.z = val;
						}
						/*if (coords.length > 0 && coords[coords.length - 1].Equals2D(coord))
							return;*/
						coords.push(coord);

						minX = Math.min(minX, coord.x);
						minY = Math.min(minY, coord.y);
						maxX = Math.max(maxX, coord.x);
						maxY = Math.max(maxY, coord.y);
						break;
				}
				prevId = id;
				prevBaseId = baseId;
			}
			if (coords.length > 0)
				geoList.push(...coords);

			if (newRow){
				let geo = this.getGeometry(this.simplify(geoList), stride);
				this.writeGeo(newRow, outGeoField, geo);

				if (minXCol){
					newRow[minXCol] = minX;
					newRow[minYCol] = minY;
					newRow[maxXCol] = maxX;
					newRow[maxYCol] = maxY;
				}
				rows.push(newRow);
			}
		} catch (e) {
		}

		return rows;
	}

	simplify(geoList){
		let coords = [];
		for(let geo of geoList){
			if(!geo.z)
				coords.push([geo.x, geo.y])
			else
				coords.push([geo.x, geo.y, geo.z]);
		}
		return coords;
	}

	writeGeo(row, geoCol, geo){
		switch (geoCol){
			case 'WKB_GEOMETRY':
				row[geoCol] = (geo instanceof Buffer )?geo/*as Buffer*/:geo.toWkb();
				break;
			case 'WKT':
				row[geoCol] = geo.toWkt();
				break;
			default://wkx geo
				row[geoCol] = geo;
				break;
		}

	}

	getColumn(fields, outGeoField = 'WKB_GEOMETRY'){
		if(fields){
			for(let field of fields){
				if(field.name === outGeoField){
					return field;
				}
			}
		}
		return {
			name: outGeoField,
			tableID: 1765951829,
			columnID: 9,
			dataTypeID: 1700,
			dataTypeSize: -1,
			dataTypeModifier: 1179666,
			format: "text",
		};

	}
}

module.exports = GeoReader;