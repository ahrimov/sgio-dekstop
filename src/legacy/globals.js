import Map from 'ol/Map.js';

export let layers = [];
export const features = [];

export let dbMetaData;

export let map = new Map();

export let numberNodesOnMap = window.defaultNumberNodesOnMap || 10;
