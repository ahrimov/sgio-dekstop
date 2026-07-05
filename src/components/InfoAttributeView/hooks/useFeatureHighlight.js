import { useEffect } from 'react';
import { setInfoHighlight, clearInfoHighlight } from '../../../store/infoHighlightFeature.js';

/**
 * Hook for managing feature highlighting on the map.
 *
 * Instead of directly changing the feature style (which can be hidden behind
 * other layers), this hook dispatches the current feature to the
 * $infoHighlightFeature store.  The MapComponent's useShowOnMapHighlight hook
 * picks it up and renders the highlight on a dedicated overlay layer with a
 * high zIndex — guaranteeing visibility.
 *
 * @param {Object} feature - OpenLayers feature object
 * @param {boolean} isGeometryEditing - Whether geometry is being edited
 */
export function useFeatureHighlight(feature, isGeometryEditing) {
	useEffect(() => {
		if (!feature || isGeometryEditing) {
			clearInfoHighlight();
			return;
		}

		setInfoHighlight({ feature });

		return () => {
			clearInfoHighlight();
		};
	}, [feature, isGeometryEditing]);
}
