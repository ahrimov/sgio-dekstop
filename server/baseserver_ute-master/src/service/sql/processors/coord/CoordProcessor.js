class CoordProcessor {
    constructor() {
        this._priority = 0;
    }

    get priority() {
        return this._priority;
    }

    set priority(value) {
        this._priority = value;
    }

    setParams(params) {
        throw new Error('setParams in abstract class CoordProcessor!');
    }

    process(coords, attrs) {
        if (coords.length !== attrs.length) throw new Error('Число атрибутивных записей не соответствует числу координат');
        return attrs;
    }
}

module.exports = CoordProcessor;
