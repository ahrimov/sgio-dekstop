import Map from 'ol/Map.js';

import { createEvent, createStore } from 'effector';

export let layers = [];
export const features = [];

export let dbMetaData;

export let map = new Map();

export let numberNodesOnMap = window.defaultNumberNodesOnMap || 10;

export const setLayerList = createEvent();

export const $layers = createStore(layers)
    .on(setLayerList, (_, payload) => payload)


export function addLayerToList(layer) {
    layers.push(layer);
    const newLayersList = [...layers];
    setLayerList(newLayersList);
    layers = newLayersList;
}

export function deleteLayerFromList(layerID) {
    const newLayersList = layers.filter(layer => layer.id !== layerID);
    setLayerList(newLayersList);
    layers = newLayersList;
}

