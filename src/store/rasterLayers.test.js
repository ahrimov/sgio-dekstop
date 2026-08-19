import assert from 'node:assert/strict';
import test from 'node:test';

import { applyRasterLayerReorder, applyRasterLayerVisibilityToggle } from './rasterLayers.js';

function createLayer({ id, kind, visible = false }) {
	const properties = { id, kind };
	let isVisible = visible;
	let zIndex = 0;

	return {
		get: key => properties[key],
		getVisible: () => isVisible,
		setVisible: value => {
			isVisible = value;
		},
		getZIndex: () => zIndex,
		setZIndex: value => {
			zIndex = value;
		},
	};
}

function createLayerSet() {
	return [
		createLayer({ id: 'rosreestr', kind: 'overlay' }),
		createLayer({ id: 'map', kind: 'base', visible: true }),
		createLayer({ id: 'satellite', kind: 'base' }),
	];
}

test('независимо включает базовый растровый слой', () => {
	const layers = createLayerSet();
	const result = applyRasterLayerVisibilityToggle(layers, 'satellite');

	assert.notEqual(result, layers);
	assert.equal(layers[1].getVisible(), true);
	assert.equal(layers[2].getVisible(), true);
	assert.equal(layers[0].getVisible(), false);
});

test('позволяет выключить базовый растровый слой', () => {
	const layers = createLayerSet();
	const result = applyRasterLayerVisibilityToggle(layers, 'map');

	assert.notEqual(result, layers);
	assert.equal(layers[1].getVisible(), false);
});

test('независимый overlay не меняет базовую карту', () => {
	const layers = createLayerSet();
	applyRasterLayerVisibilityToggle(layers, 'rosreestr');

	assert.equal(layers[0].getVisible(), true);
	assert.equal(layers[1].getVisible(), true);
	assert.equal(layers[2].getVisible(), false);
});

test('меняет порядок и пересчитывает zIndex', () => {
	const layers = createLayerSet();
	const reordered = applyRasterLayerReorder(layers, { fromIndex: 2, toIndex: 0 });

	assert.deepEqual(
		reordered.map(layer => layer.get('id')),
		['satellite', 'rosreestr', 'map']
	);
	assert.deepEqual(
		reordered.map(layer => layer.getZIndex()),
		[3, 2, 1]
	);
});
