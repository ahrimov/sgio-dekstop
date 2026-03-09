import { useCallback, useMemo, useState } from 'react';

/**
 * Hook for managing navigation between multiple features
 * @param {Array} featuresByLayer - Array of features grouped by layer
 * @param {string} featureId - Initial feature ID
 * @param {Object} layer - Initial layer
 * @param {boolean} isGeometryEditing - Whether geometry is being edited
 */
export function useFeatureNavigation(featuresByLayer, featureId, layer, isGeometryEditing) {
	const [currentIndex, setCurrentIndex] = useState(0);

	const allFeatures = useMemo(() => {
		if (!featuresByLayer) return null;
		return featuresByLayer.flatMap(({ layer, features }) =>
			features.map(feature => ({ feature, layer }))
		);
	}, [featuresByLayer]);

	const currentFeatureData = useMemo(() => {
		if (allFeatures && allFeatures.length > 0) {
			return allFeatures[currentIndex];
		}
		return { feature: { id: featureId }, layer };
	}, [allFeatures, currentIndex, featureId, layer]);

	const isMultiple = allFeatures && allFeatures.length > 1;

	const handlePrevious = useCallback(() => {
		if (isGeometryEditing) return;
		setCurrentIndex(prev => (prev > 0 ? prev - 1 : allFeatures.length - 1));
	}, [isGeometryEditing, allFeatures]);

	const handleNext = useCallback(() => {
		if (isGeometryEditing) return;
		setCurrentIndex(prev => (prev < allFeatures.length - 1 ? prev + 1 : 0));
	}, [isGeometryEditing, allFeatures]);

	return {
		currentIndex,
		allFeatures,
		currentFeatureData,
		isMultiple,
		handlePrevious,
		handleNext,
	};
}