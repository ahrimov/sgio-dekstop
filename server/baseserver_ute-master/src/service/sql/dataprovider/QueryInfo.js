/**
 * @readonly
 * @enum
 */
const QUERY_TYPE = {
    XY: /** @type {'XY'} */ ('XY'),
    WKB: /** @type {'WKB'} */ ('WKB'),
};

class QueryInfo {
    constructor(idField, geoField) {
        this.idFields_ = (idField) ? idField.replace(/\s+/g, '').split(',') : [];
        this.geoFields_ = (geoField) ? geoField.replace(/\s+/g, '').split(',') : ['X', 'Y'];
        this.qType_ = (this.geoFields_.length > 1) ? QUERY_TYPE.XY : QUERY_TYPE.WKB;
    }

    inferFields(fields = []) {
        let xField = null;
        let yField = null;

        const idFields = [];
        const geoFields = [];
        for (const fld of fields) {
            const fldName = fld.name;
            switch (fldName.toUpperCase()) {
                case 'X':
                    xField = fldName;
                    break;
                case 'Y':
                    yField = fldName;
                    break;
                case 'ID':
                case 'GID':
                case 'UID':
                    idFields.push(fldName);
                    break;
            }
            if (fld.type === 'sss') geoFields.push(fldName);
        }

        if (this.idFields_ === null) {
            this.idFields_ = idFields;
        }

        if (this.idFields_ === null) {
            if (geoFields.length === 0 && xField !== null && yField !== null) {
                geoFields.push(xField);
                geoFields.push(yField);
            }
            this.geoFields_ = geoFields;
        }
    }

    idFields() {
        return this.idFields_;
    }

    geoFields() {
        return this.geoFields_;
    }

    qType() {
        return this.qType_;
    }

    getId(data) {
        if (this.idFields_.length === 0 || !data) return null;
        if (this.idFields_.length === 1) return data[this.idFields_[0]];
        let res = '';
        for (const fld of this.idFields_) res += data[fld];
        return res;
    }

    getBaseId(data) {
        if (this.idFields_.length === 0 || !data) return null;
        return data[this.idFields_[0]];
    }

    isGeoField(fldName) {
        for (const field of this.geoFields_) {
            if (field === fldName) return true;
        }
        return false;
    }

    isExtIdField(fldName) {
        for (let i = 1; i < this.idFields_.length; i++) {
            if (this.idFields_[i] === fldName) return true;
        }
        return false;
    }
}

module.exports = {
    QueryInfo,
    QUERY_TYPE,
};
