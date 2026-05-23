const ObjProcessor = require('./ObjProcessor');
const gdal = require('gdal');
const wkx = require('wkx');
const GeoReader = require("../../dataprovider/GeoReader");
const QueryService = require("../../QueryService");

class BufProcessor extends ObjProcessor{
	/**
	 *
	 * @param {string} query
	 * @param {string} idField
	 * @param {string} geoField
	 * @param {Sequelize.Transaction} transaction
	 */
	constructor(query, idField = 'GID', geoField = 'WKB_GEOMETRY' , transaction = null, connection = null) {
		super();
		this.transaction_ = transaction;
		this.connection_ = connection;
		this.query_ = query;
		this.idField_ = idField;
		this.geoField_ = geoField;
		this.bufs_ = []; //массив буферов
	}
	setParams(params) {

	}

	async init(){
		let outResult = await QueryService.rawQuery(this.query_, null, this.transaction_, this.connection_); //TODO -> move to GeoQuery
		let geoReader = new GeoReader();
		this.bufs_ = await geoReader.composeGeoReaderResult(outResult, null, false, this.idField_, this.geoField_);
	}

	process(geometry, attrs = {}){
		if(geometry){
			let pnt = geometry.centroid();
			for(let buf of this.bufs_){
				if(!buf.WKB_GEOMETRY)
					continue;
				let geo = gdal.Geometry.fromWKB(buf.WKB_GEOMETRY)
				if(geo && geo.contains(pnt)) {
					attrs[this.idField_] = buf[this.idField_];
					return attrs;
				}
			}
		}
	}
}

module.exports = BufProcessor;