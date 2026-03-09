import { useEffect } from 'react';
import { getFeatureAttributes } from '../../../features/getDataForFeatures/getFeatureAttribute.js';
import { filterSystemProperties } from '../../../utils/filterSystemProperties.js';

/**
 * Helper function to get feature attributes from KML layer
 */
export function getFeatureAttributesFromKML(layer, featureId) {
	const features = layer.getSource().getFeatures();
	const feature = features.find(f =>
		String(f.get('ID')) === String(featureId)
	);
	if (!feature) return null;
	const props = feature.getProperties();
	// eslint-disable-next-line no-unused-vars
	const { geometry, id, lgAttach, ...attrs } = props;
	return attrs;
}

/**
 * Hook for fetching and managing feature data
 * @param {Object} layer - Layer object
 * @param {string} featureId - Feature ID
 * @param {Object} form - Ant Design form instance
 * @param {Object} config - Application config
 * @param {Object} initialFeature - Initial feature for new features
 * @param {Function} setFeatureData - State setter for feature data
 * @param {Function} setFeature - State setter for feature
 * @param {Function} setIsNewFeature - State setter for isNewFeature flag
 */
export function useFeatureData(
	layer,
	featureId,
	form,
	config,
	initialFeature,
	setFeatureData,
	setFeature,
	setIsNewFeature
) {
	useEffect(() => {
		const fetchFeatureAttributes = async () => {
			try {
				if (initialFeature) {
					const atribs = filterSystemProperties(layer.atribs, config);
					const data = {};
					atribs.forEach(atrib => {
						data[atrib.name] = initialFeature.get(atrib.name) || '';
					});
					setFeatureData(data);
					setFeature(initialFeature);
					
					const initialValues = {};
					atribs.forEach(atrib => {
						initialValues[atrib.name] = data[atrib.name] || '';
					});
					form.setFieldsValue(initialValues);
					setIsNewFeature(true);
					return;
				}

				const data = layer.get('kmlType') 
					? getFeatureAttributesFromKML(layer, featureId) 
					: await getFeatureAttributes(layer, featureId);
				
				const atribs = filterSystemProperties(layer.atribs, config);
				if (data) {
					setFeatureData(data);
					const features = layer.getSource().getFeatures();
					const featureObj = features.find(feature => feature.id === featureId);
					setFeature(featureObj);

					const initialValues = {};
					atribs.forEach(atrib => {
						initialValues[atrib.name] = data[atrib.name] || '';
					});
					form.setFieldsValue(initialValues);
					setIsNewFeature(false);
				}
			} catch (err) {
				console.error('Error fetching feature attributes:', err);
			}
		};

		fetchFeatureAttributes();
	}, [layer, featureId, form, config, initialFeature, setFeatureData, setFeature, setIsNewFeature]);
}