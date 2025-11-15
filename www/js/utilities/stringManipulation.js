function insert(main_string, ins_string, pos) {
    if(typeof(pos) == "undefined") {
      pos = 0;
    }
    if(typeof(ins_string) == "undefined") {
      ins_string = '';
    }
      return main_string.slice(0, pos) + ins_string + main_string.slice(pos);
}

function clipping(string, limit){
    if(string.length > limit){
        return string.slice(0, limit) + "..."
      }
    return string
}

function formatDate(date){
  return `_${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}_${date.getHours()}${date.getMinutes()}${date.getSeconds()}`
}

function writeFeatureInKML(feature){
  const sourceGeometryType = feature.getGeometry().getType().toUpperCase();
  let geometryType = ''
  if(sourceGeometryType === 'POINT' || sourceGeometryType === 'LINESTRING' || sourceGeometryType === 'POLYGON')
    geometryType += 'MULTI';
  geometryType += feature.getGeometry().getType().toUpperCase();
  let coordinates = feature.getGeometry().getCoordinates();
  if(geometryType === 'MULTILINESTRING' || geometryType === 'MULTIPOLYGON'){
    coordinates = coordinates[0];
    if(geometryType === 'MULTIPOLYGON')
      coordinates = coordinates[0];
  }
  const numberOfBrackets = geometryType === 'MULTIPOLYGON' ? 3 : 2;
  const brackets = [...Array(numberOfBrackets).keys()]; 
  return `${geometryType} Z ${brackets.map(i => '(').join('')}\
  ${coordinates.map(coord => ` ${coord[0]} ${coord[1]} 0`).join(',')}${brackets.map(i => ')').join('')}`;
}

function toBase64(str) {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(str);
  let binaryString = '';
  uint8Array.forEach(byte => {
      binaryString += String.fromCharCode(byte);
  });
  return btoa(binaryString);
}