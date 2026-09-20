import KML from 'ol/format/KML.js';

const NS = 'http://www.opengis.net/kml/2.2';
const hiddenFields = new Set(['geometry', 'styleUrl', 'name', 'description', 'geometryType']);
export const kmlElements = (node, name) => Array.from(node.getElementsByTagNameNS('*', name));
const child = (node, name) => Array.from(node.childNodes).find(n => n.localName === name);
const append = (node, name) => node.appendChild(node.ownerDocument.createElementNS(NS, name));

const directChildren = (node, name) =>
	Array.from(node.childNodes).filter(n => n.nodeType === 1 && n.localName === name);

const formatCoordinate = (value, precision) => {
	const number = Number(value);
	if (!Number.isFinite(number)) return '0';
	return precision == null ? String(number) : String(Number(number.toFixed(precision)));
};

function normalizeCoordinates(documentNode) {
	for (const node of kmlElements(documentNode, 'coordinates')) {
		node.textContent = node.textContent
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.map(tuple => {
				const values = tuple.split(',');
				const longitude = formatCoordinate(values[0], 8);
				const latitude = formatCoordinate(values[1], 8);
				const altitude = formatCoordinate(values[2] ?? 0);
				return `${longitude},${latitude},${altitude}`;
			})
			.join(' ');
	}
}

function unwrapSingleGeometries(documentNode) {
	for (const multiGeometry of kmlElements(documentNode, 'MultiGeometry')) {
		const geometries = Array.from(multiGeometry.childNodes).filter(n => n.nodeType === 1);
		if (geometries.length === 1) {
			multiGeometry.parentNode.replaceChild(geometries[0], multiGeometry);
		}
	}
}

/**
 * Convert OpenLayers KML output to the structure produced by the web application.
 * The desktop importer also uses Schema.name as a stable, filesystem-safe layer name.
 */
export function formatKMLForExport(kml, layer) {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(kml, 'application/xml');
	const root = xmlDoc.documentElement;
	const schemaName = String(
		layer?.table || layer?.id || layer?.get?.('id') || 'LAYER'
	).toUpperCase();
	const attributes = Array.from(
		new Set((layer?.atribs || []).map(attribute => attribute.name).filter(Boolean))
	);

	let documentNode = directChildren(root, 'Document')[0];
	if (!documentNode) {
		documentNode = xmlDoc.createElementNS(NS, 'Document');
		while (root.firstChild) documentNode.appendChild(root.firstChild);
		root.appendChild(documentNode);
	}
	documentNode.setAttribute('id', 'root_doc');

	for (const oldSchema of directChildren(documentNode, 'Schema')) {
		documentNode.removeChild(oldSchema);
	}
	const schema = xmlDoc.createElementNS(NS, 'Schema');
	schema.setAttribute('name', schemaName);
	schema.setAttribute('id', schemaName);
	for (const attributeName of attributes) {
		const field = append(schema, 'SimpleField');
		field.setAttribute('name', attributeName.toUpperCase());
		field.setAttribute('type', 'string');
	}
	documentNode.insertBefore(schema, documentNode.firstChild);

	const placemarks = kmlElements(documentNode, 'Placemark');
	for (const placemark of placemarks) {
		const values = new Map();
		for (const dataNode of kmlElements(placemark, 'Data')) {
			values.set(
				dataNode.getAttribute('name')?.toLowerCase(),
				child(dataNode, 'value')?.textContent ?? ''
			);
		}
		for (const dataNode of kmlElements(placemark, 'SimpleData')) {
			values.set(dataNode.getAttribute('name')?.toLowerCase(), dataNode.textContent ?? '');
		}
		for (const extendedData of directChildren(placemark, 'ExtendedData')) {
			placemark.removeChild(extendedData);
		}
		if (attributes.length) {
			const extendedData = append(placemark, 'ExtendedData');
			const schemaData = append(extendedData, 'SchemaData');
			schemaData.setAttribute('schemaUrl', `#${schemaName}`);
			for (const attributeName of attributes) {
				const normalizedName = attributeName.toLowerCase();
				const simpleData = append(schemaData, 'SimpleData');
				simpleData.setAttribute('name', attributeName.toUpperCase());
				simpleData.textContent =
					values.get(normalizedName) ??
					child(placemark, normalizedName)?.textContent ??
					'';
			}
		}
	}

	for (const oldFolder of directChildren(documentNode, 'Folder')) {
		while (oldFolder.firstChild) documentNode.appendChild(oldFolder.firstChild);
		documentNode.removeChild(oldFolder);
	}
	const folder = xmlDoc.createElementNS(NS, 'Folder');
	append(folder, 'name').textContent = schemaName;
	for (const placemark of placemarks) folder.appendChild(placemark);
	documentNode.appendChild(folder);

	normalizeCoordinates(documentNode);
	unwrapSingleGeometries(documentNode);

	return `<?xml version="1.0" encoding="utf-8" ?>\n${new XMLSerializer().serializeToString(xmlDoc)}`;
}

// Keep the same identity in the table, map source and persisted ExtendedData.
export function prepareKMLFeatures(features, layerId, xmlDoc) {
	const reserved = new Set(
		features
			.map(f => f.get('ID'))
			.filter(v => v != null && v !== '')
			.map(String)
	);
	const used = new Set();
	const placemarks = xmlDoc ? kmlElements(xmlDoc, 'Placemark') : [];
	let nextId = 1;
	features.forEach((feature, index) => {
		let id = feature.get('ID');
		if (id == null || id === '' || used.has(String(id))) {
			while (reserved.has(String(nextId)) || used.has(String(nextId))) nextId++;
			id = String(nextId++);
		}
		id = String(id);
		used.add(id);
		feature.set('ID', id);
		feature.id = id;
		feature.setId(id);
		feature.layerID = layerId;
		feature.type = 'default';
		if (placemarks[index]) setKMLProperty(placemarks[index], 'ID', id);
	});
}

export function getKMLAttributes(features, xmlDoc) {
	const names = new Set(kmlElements(xmlDoc, 'SimpleField').map(n => n.getAttribute('name')));
	features.forEach(feature => feature.getKeys().forEach(key => names.add(key)));
	return Array.from(names)
		.filter(name => name && !hiddenFields.has(name))
		.map(name => ({
			name,
			label: name,
			visible: true,
			type: 'STRING',
		}));
}

export function setKMLProperty(placemark, key, value) {
	const existing = kmlElements(placemark, 'SimpleData').find(n => n.getAttribute('name') === key);
	const data = kmlElements(placemark, 'Data').find(n => n.getAttribute('name') === key);
	if (existing) existing.textContent = value == null ? '' : String(value);
	if (data)
		(child(data, 'value') || append(data, 'value')).textContent =
			value == null ? '' : String(value);
	if (existing || data) return;
	const extended = child(placemark, 'ExtendedData') || append(placemark, 'ExtendedData');
	const newData = append(extended, 'Data');
	newData.setAttribute('name', key);
	append(newData, 'value').textContent = value == null ? '' : String(value);
}

// Retain the original document, folders and styles; let OpenLayers serialize all geometry types.
export function updateKMLDocument(xmlDoc, features, projection) {
	const placemarks = new Map(
		kmlElements(xmlDoc, 'Placemark').map(node => {
			const simple = kmlElements(node, 'SimpleData').find(
				n => n.getAttribute('name') === 'ID'
			);
			const data = kmlElements(node, 'Data').find(n => n.getAttribute('name') === 'ID');
			return [simple?.textContent ?? (data && child(data, 'value')?.textContent), node];
		})
	);
	const format = new KML({ writeStyles: false });
	for (const feature of features) {
		let placemark = placemarks.get(String(feature.get('ID')));
		if (feature.deleted) {
			placemark?.parentNode.removeChild(placemark);
			continue;
		}
		if (!placemark) {
			if (!feature.isNew) throw new Error(`Не найден объект KML с ID ${feature.id}`);
			const parent =
				kmlElements(xmlDoc, 'Folder')[0] ||
				kmlElements(xmlDoc, 'Document')[0] ||
				xmlDoc.documentElement;
			placemark = append(parent, 'Placemark');
		}
		for (const [key, value] of Object.entries(feature.getProperties())) {
			if (key === feature.getGeometryName() || key === 'styleUrl') continue;
			if (key === 'name' || key === 'description') {
				(child(placemark, key) || append(placemark, key)).textContent = value ?? '';
			} else setKMLProperty(placemark, key, value);
		}
		const serialized = format.writeFeaturesNode([feature], {
			featureProjection: projection,
			dataProjection: 'EPSG:4326',
		});
		const generated = kmlElements(serialized, 'Placemark')[0];
		const geometryNames = new Set([
			'Point',
			'LineString',
			'LinearRing',
			'Polygon',
			'MultiGeometry',
			'Track',
			'MultiTrack',
		]);
		const geometry = Array.from(generated.childNodes).find(n => geometryNames.has(n.localName));
		for (const node of Array.from(placemark.childNodes)) {
			if (geometryNames.has(node.localName)) placemark.removeChild(node);
		}
		if (geometry) placemark.appendChild(xmlDoc.importNode(geometry, true));
	}
	return new XMLSerializer().serializeToString(xmlDoc);
}
