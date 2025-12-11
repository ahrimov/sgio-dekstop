export function writeFeatureInKML(feature) {
    const sourceGeometryType = feature.getGeometry().getType().toUpperCase();
    let geometryType = ''
    if (sourceGeometryType === 'POINT' || sourceGeometryType === 'LINESTRING' || sourceGeometryType === 'POLYGON') {
        geometryType += 'MULTI';
    }
    geometryType += feature.getGeometry().getType().toUpperCase();
    let coordinates = feature.getGeometry().getCoordinates();
    if (geometryType === 'MULTILINESTRING' || geometryType === 'MULTIPOLYGON') {
        coordinates = coordinates[0];
    if (geometryType === 'MULTIPOLYGON')
        coordinates = coordinates[0];
    }
    const numberOfBrackets = geometryType === 'MULTIPOLYGON' ? 3 : 2;
    const brackets = [...Array(numberOfBrackets).keys()]; 
    return `${geometryType} Z ${brackets.map(_ => '(').join('')}\
    ${coordinates.map(coord => ` ${coord[0]} ${coord[1]} 0`).join(',')}${brackets.map(_ => ')').join('')}`;
}