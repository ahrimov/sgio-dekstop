import { requestToDB } from "../../legacy/DBManage.js";
import { writeFeatureInKML } from "./writeFeatureInKml.js";

export function addNewFeature(layer, feature) {
    if (!feature.get('id')) {
        feature.set('id', generateId(layer));
    }
    const properties = feature.getProperties();
    const filteredProps = Object.entries(properties)
        .filter(([key, value]) => !!value && key !== 'geometry')
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
    const atribNames = Object.keys(filteredProps);
    const atribValues = Object.values(filteredProps).map((value) => typeof value === 'string' ? `'${value}'` : value);
    const feautureString = writeFeatureInKML(feature);
    const query = `
                INSERT INTO ${layer.id} (${atribNames.join(', ')}, Geometry)
                VALUES (${atribValues.join(',')}, GeomFromText('${feautureString}', 3857));
                ;`
    requestToDB(query, () => {
        feature.id = feature.get('id');
        feature.layerID = layer.id;

        const typeIndex = atribNames.indexOf(layer.styleTypeColumn);
        if (typeIndex >= 0) {
            feature.type = values[typeIndex];
        } else { 
            feature.type = 'default';
        }

        const labelIndex = atribNames.indexOf(layer.labelColumn);
        if (labelIndex >= 0) {
            feature.label = values[labelIndex];
        }

        // if (fromMap) {
        //     finishDraw();
        // }
        // else {
        //     layer.getSource().addFeature(feature);
        // }
 
        feature.changed();
    });
} 

function generateId(layer) {
    const features = layer.getSource().getFeatures();
    let maxId = 0;
    features.forEach((feature) => {
        const id = feature.get('ID');
        if (id > maxId) {
            maxId = id;
        }
    });
    return maxId + 1;
} 
