import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DOMParser, XMLSerializer, DOMImplementation } from '@xmldom/xmldom';
import KML from 'ol/format/KML.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import {
	prepareKMLFeatures,
	getKMLAttributes,
	updateKMLDocument,
	formatKMLForExport,
	kmlElements,
} from './kmlDocument.js';

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

test('desktop export uses the web KML structure and valid coordinates', () => {
	const source =
		'<kml xmlns="http://www.opengis.net/kml/2.2">' +
		'<Placemark><description>Тест</description><ExtendedData>' +
		data('id', '1301413') +
		'</ExtendedData><MultiGeometry><LineString>' +
		'<coordinates>54.23015451000225,56.61221645000137,NaN 54.230169509999,56.61224744999981,3.57</coordinates>' +
		'</LineString></MultiGeometry></Placemark></kml>';
	const layer = {
		id: 'pods_route',
		atribs: [{ name: 'id' }, { name: 'description' }],
	};

	const exported = formatKMLForExport(source, layer);
	const doc = new DOMParser().parseFromString(exported, 'application/xml');
	const documentNode = kmlElements(doc, 'Document')[0];
	const schema = kmlElements(doc, 'Schema')[0];
	const folder = kmlElements(doc, 'Folder')[0];
	const schemaData = kmlElements(doc, 'SchemaData')[0];
	const simpleData = Object.fromEntries(
		kmlElements(schemaData, 'SimpleData').map(node => [
			node.getAttribute('name'),
			node.textContent,
		])
	);

	assert.match(exported, /^<\?xml version="1\.0" encoding="utf-8" \?>/);
	assert.equal(documentNode.getAttribute('id'), 'root_doc');
	assert.equal(schema.getAttribute('name'), 'PODS_ROUTE');
	assert.equal(schema.getAttribute('id'), 'PODS_ROUTE');
	assert.deepEqual(
		kmlElements(schema, 'SimpleField').map(node => node.getAttribute('name')),
		['ID', 'DESCRIPTION']
	);
	assert.equal(childText(folder, 'name'), 'PODS_ROUTE');
	assert.equal(schemaData.getAttribute('schemaUrl'), '#PODS_ROUTE');
	assert.deepEqual(simpleData, { ID: '1301413', DESCRIPTION: 'Тест' });
	assert.equal(kmlElements(doc, 'MultiGeometry').length, 0);
	assert.equal(
		kmlElements(doc, 'coordinates')[0].textContent,
		'54.23015451,56.61221645,0 54.23016951,56.61224745,3.57'
	);
	assert.doesNotMatch(exported, /nan/i);

	const importedFeatures = format.readFeatures(exported, {
		dataProjection: 'EPSG:4326',
		featureProjection: 'EPSG:4326',
	});
	assert.equal(importedFeatures.length, 1);
	assert.equal(importedFeatures[0].get('ID'), '1301413');
	assert.ok(importedFeatures[0].getGeometry().getCoordinates().flat().every(Number.isFinite));
});

function childText(node, name) {
	return Array.from(node.childNodes).find(childNode => childNode.localName === name)?.textContent;
}
