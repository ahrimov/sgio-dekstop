import { requestToDB } from "../../legacy/DBManage";
import { refreshFeatureTable } from "../../shared/refreshTable";

export function deleteFeature(featureId, layer, callback) {
    const deleteQuery = `
        DELETE FROM ${layer.id} 
        WHERE id = ${featureId};
    `;

    requestToDB(
        deleteQuery, 
        (_) => {
            deleteFeatureFromLayer(featureId, layer);
            setTimeout(() => refreshFeatureTable(), 100);
            if (callback) callback();
        },
        `Error deleting feature ${featureId} from database`
    );
}

function deleteFeatureFromLayer(featureId, layer) {  
    if (!layer) {
        console.error(`Layer not found`);
        return;
    }
    
    const source = layer.getSource();
    const features = source.getFeatures();
    const feature = features.find(f => f.get('id') === featureId);
    
    if (feature) {
        source.removeFeature(feature);
        source.changed();
    } else {
        console.warn(`Feature ${featureId} not found in layer ${layer.id}`);
    }
}