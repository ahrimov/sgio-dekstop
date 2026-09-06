import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DOMParser, XMLSerializer, DOMImplementation } from '@xmldom/xmldom';
import KML from 'ol/format/KML.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import { prepareKMLFeatures, getKMLAttributes, updateKMLDocument } from './kmlDocument.js';

// Supply the browser XML APIs used by OpenLayers for these Node regression tests.
globalThis.DOMParser = DOMParser;
globalThis.XMLSerializer = XMLSerializer;
globalThis.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3, CDATA_SECTION_NODE: 4 };
globalThis.document = new DOMImplementation().createDocument(null, null, null);
const elementPrototype = Object.getPrototypeOf(document.createElement('test'));
Object.defineProperties(elementPrototype, {
	firstElementChild: {
		get() {
			return Array.from(this.childNodes).find(n => n.nodeType === 1) || null;
		},
	},
	nextElementSibling: {
		get() {
			let n = this.nextSibling;
			while (n && n.nodeType !== 1) n = n.nextSibling;
			return n;
		},
	},
});
const wrap = body =>
	`<kml xmlns="http://www.opengis.net/kml/2.2"><Document>${body}</Document></kml>`;
const point = '<Point><coordinates>37,55,0</coordinates></Point>';
const data = (name, value) => `<Data name="${name}"><value>${value}</value></Data>`;
const mark = (fields = '', geometry = point) =>
	`<Placemark><ExtendedData>${fields}</ExtendedData>${geometry}</Placemark>`;
const format = new KML();
const projection = 'EPSG:3857';
function load(content) {
	const doc = new DOMParser().parseFromString(content, 'application/xml');
	const features = format.readFeatures(content, { featureProjection: projection });
	prepareKMLFeatures(features, 'test.kml', doc);
	return { doc, features, fields: getKMLAttributes(features, doc).map(a => a.name) };
}

test('missing, zero and duplicate IDs survive restart; table selection resolves one or several map features', () => {
	const initial = load(
		wrap(mark(data('ID', '0')) + mark(data('ID', '0')) + mark() + mark(data('ID', '1')))
	);
	const source = new VectorSource({ features: initial.features });
	assert.equal(source.getFeatures().length, 4);
	const ids = initial.features.map(f => f.id);
	assert.equal(new Set(ids).size, 4);
	assert.equal(ids[0], '0');
	const restored = load(new XMLSerializer().serializeToString(initial.doc));
	assert.deepEqual(
		restored.features.map(f => f.id),
		ids
	);
	for (const selectedIds of [[ids[0]], [ids[0], ids[2]]]) {
		const selected = restored.features.filter(f => selectedIds.includes(f.id));
		assert.equal(selected.length, selectedIds.length);
		assert.ok(selected.every(f => f.getGeometry().getExtent().every(Number.isFinite)));
	}
});

test('fields from Schema and every feature remain present after saving and restarting', () => {
	const initial = load(
		wrap(
			'<Schema><SimpleField name="empty" type="string"/></Schema>' +
				mark(data('first', 'a')) +
				mark(data('later', 'b'))
		)
	);
	assert.ok(['empty', 'first', 'later', 'ID'].every(name => initial.fields.includes(name)));
	initial.features[1].set('later', 'Изменено & <значение>');
	const restored = load(updateKMLDocument(initial.doc, initial.features, projection));
	assert.deepEqual(restored.fields, initial.fields);
	assert.equal(restored.features[1].get('later'), 'Изменено & <значение>');
});

test('attribute edits preserve mixed/nested MultiGeometry, polygon holes and altitude', () => {
	const polygon =
		'<Polygon><outerBoundaryIs><LinearRing><coordinates>37,55,3 38,55,3 38,56,3 37,55,3</coordinates></LinearRing></outerBoundaryIs><innerBoundaryIs><LinearRing><coordinates>37.2,55.1,3 37.4,55.1,3 37.4,55.2,3 37.2,55.1,3</coordinates></LinearRing></innerBoundaryIs></Polygon>';
	const line = '<LineString><coordinates>37,55,4 38,56,5</coordinates></LineString>';
	for (const geometry of [
		point,
		line,
		polygon,
		`<MultiGeometry>${point}<MultiGeometry>${line}${polygon}</MultiGeometry></MultiGeometry>`,
		`<MultiGeometry>${polygon}${polygon}</MultiGeometry>`,
		`<MultiGeometry>${line}${line}</MultiGeometry>`,
	]) {
		const initial = load(wrap(mark(data('attribute', 'old'), geometry)));
		initial.features[0].set('attribute', 'new');
		const restored = load(updateKMLDocument(initial.doc, initial.features, projection));
		assert.equal(restored.features[0].get('attribute'), 'new');
		const before = format.writeFeatures(initial.features, { featureProjection: projection });
		const after = format.writeFeatures(restored.features, { featureProjection: projection });
		assert.equal(after, before);
	}
});

test('legacy files without SchemaData can be edited, deleted, and extended without a Folder', () => {
	const initial = load(wrap(mark() + mark()));
	initial.features[0].deleted = true;
	const added = new Feature({ geometry: new Point([0, 0]), attribute: 'new' });
	added.isNew = true;
	initial.features.push(added);
	prepareKMLFeatures(initial.features, 'test.kml');
	const restored = load(updateKMLDocument(initial.doc, initial.features, projection));
	assert.equal(restored.features.length, 2);
	assert.equal(restored.features[1].get('attribute'), 'new');
	assert.ok(
		restored.features[1]
			.getGeometry()
			.getCoordinates()
			.every(v => Math.abs(v) < 1e-6)
	);
});
