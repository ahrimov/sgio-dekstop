import { createEvent, createStore } from 'effector';

/**
 * Store that tracks the currently viewed feature in the InfoAttributeView panel.
 * The MapComponent subscribes to this store and highlights the feature on the
 * overlay layer so it is always visible on top of all other layers.
 *
 * Payload: { feature: <OL Feature> } | null
 */
export const setInfoHighlight = createEvent();
export const clearInfoHighlight = createEvent();

export const $infoHighlightFeature = createStore(null)
	.on(setInfoHighlight, (_, payload) => payload)
	.on(clearInfoHighlight, () => null);
