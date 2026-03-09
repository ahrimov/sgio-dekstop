import { useCallback, useEffect, useRef } from 'react';
import { useUnit } from 'effector-react';
import {
	$mapInteractionMode,
	changeInteractionMode,
	DEFAULT_INTERACTION,
	GEOMETRY_EDIT_INTERACTION,
} from '../../../store/mapInteractionMode.js';
import { finishGeometryEdit, startGeometryEdit } from '../../../features/draw/store.js';
import { updateFeatureGeometry } from '../../../features/saveFeature/updateFeature.js';

/**
 * Hook for managing geometry editing functionality
 * @param {Object} feature - OpenLayers feature object
 * @param {Object} layer - Layer object
 * @param {string} featureId - Feature ID
 * @param {Function} setFeature - State setter for feature
 * @param {Function} setLoading - State setter for loading
 */
export function useGeometryEditing(feature, layer, featureId, setFeature, setLoading) {
	const isGeometryEditing = useUnit($mapInteractionMode) === GEOMETRY_EDIT_INTERACTION;
	const isGeometryEditingRef = useRef(isGeometryEditing);

	const handleCancelEditGeometry = useCallback(() => {
		changeInteractionMode(DEFAULT_INTERACTION);
	}, []);

	const handleCancelEditGeometryRef = useRef(handleCancelEditGeometry);

	useEffect(() => {
		isGeometryEditingRef.current = isGeometryEditing;
		handleCancelEditGeometryRef.current = handleCancelEditGeometry;
	}, [isGeometryEditing, handleCancelEditGeometry]);

	const handleSaveGeometryEdit = useCallback(() => {
		try {
			setLoading(true);

			const features = layer.getSource().getFeatures();
			const updatedFeature = features.find(f => f.id === featureId);

			if (updatedFeature) {
				updateFeatureGeometry(
					layer,
					featureId,
					updatedFeature.getGeometry(),
					() => {
						setFeature(updatedFeature);
					},
					error => {
						console.error(`Ошибка сохранения геометрии: ${error.message}`);
					}
				);
			}
		} catch (error) {
			console.error('Error saving geometry:', error);
		} finally {
			setLoading(false);
		}
	}, [layer, featureId, setFeature, setLoading]);

	const handleEditGeometryClick = useCallback(() => {
		if (isGeometryEditing) {
			handleCancelEditGeometry();
			return;
		}
		if (!feature) {
			console.error('Не удалось начать редактирование геометрии');
			return;
		}

		startGeometryEdit({ feature, layer });
	}, [feature, handleCancelEditGeometry, isGeometryEditing, layer]);

	return {
		isGeometryEditing,
		isGeometryEditingRef,
		handleCancelEditGeometry,
		handleCancelEditGeometryRef,
		handleSaveGeometryEdit,
		handleEditGeometryClick,
		finishGeometryEdit,
	};
}