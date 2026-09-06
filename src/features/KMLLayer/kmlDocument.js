import KML from 'ol/format/KML.js';

const NS = 'http://www.opengis.net/kml/2.2';
const hiddenFields = new Set(['geometry', 'styleUrl', 'name', 'description', 'geometryType']);
export const kmlElements = (node, name) => Array.from(node.getElementsByTagNameNS('*', name));
const child = (node, name) => Array.from(node.childNodes).find(n => n.localName === name);
const append = (node, name) => node.appendChild(node.ownerDocument.createElementNS(NS, name));

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
