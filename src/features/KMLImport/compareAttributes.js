import KML from 'ol/format/KML';
import { map } from '../../legacy/globals';

export async function readKMLForComparison(pathToKML) {
  try {
    const data = await electronAPI.readFile(pathToKML);
    
    const cleanedData = data.replace(/nan/g, '0');
    
    const format = new KML();
    const mapProjection = map.getView().getProjection().getCode();
    const features = format.readFeatures(cleanedData, {
      dataProjection: 'EPSG:3857',
      featureProjection: mapProjection
    });
    
    if (!features || features.length === 0) {
      throw new Error('Элементы не найдены');
    }
    
    const properties = Object.keys(features[0].getProperties()).filter(
      key => key !== 'geometry'
    );
    
    return { features, properties };
  } catch (error) {
    console.error('Error reading KML file:', error);
    throw error;
  }
}

export async function selectKMLFile() {
  try {
    const result = await electronAPI.openFileDialog({
      title: 'Выберите KML файл',
      filters: [
        { name: 'KML Files', extensions: ['kml'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    return result;
  } catch (error) {
    console.error('Error selecting KML file:', error);
    throw error;
  }
}