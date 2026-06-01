import fs from 'fs';
import iconv from 'iconv-lite';
import { XMLParser } from 'fast-xml-parser';

/**
 * ILI vendor XML file parser.
 * Parses ILI inspection report files in IPL_INSPECT format.
 *
 * Ported from server/baseserver_ute-master/src/service/ute/ili/ili-import-xml/IliImportXmlService.parseSourceFile()
 */

const xmlParserOptions = {
	ignoreAttributes: false,
	attributeNamePrefix: '',
	textNodeName: '#text',
	trimValues: true,
	parseAttributeValue: false,
	isArray: (name) => ['DEF', 'PLOBJ', 'WLD', 'TYPEOBJ'].includes(name),
};

/**
 * Parse an ILI XML report file and extract defect/weld/line object data.
 * Handles cp1251 encoding conversion automatically.
 *
 * @param {string} filePath - Absolute path to the ILI XML file
 * @returns {Promise<{rows: object[], types: object[]}>} Parsed defect rows and type definitions
 */
export async function parseIliXmlFile(filePath) {
	if (!fs.existsSync(filePath)) {
		throw new Error(`ILI XML file not found: ${filePath}`);
	}

	// Read file and handle encoding
	let xmlContent = await readWithEncodingDetection(filePath);

	// Parse XML
	const parser = new XMLParser(xmlParserOptions);
	let parsed;
	try {
		parsed = parser.parse(xmlContent);
	} catch (e) {
		throw new Error(`Failed to parse ILI XML file: ${e.message}`);
	}

	const iliInspect = parsed.IPL_INSPECT;
	if (!iliInspect) {
		throw new Error('Invalid ILI XML: missing <IPL_INSPECT> root element');
	}

	// Extract defects, line objects, and welds
	const defects = extractArray(iliInspect, 'DEFECTS', 'DEF');
	const lineObjs = extractArray(iliInspect, 'LINEOBJS', 'PLOBJ');
	const welds = extractArray(iliInspect, 'WELDS', 'WLD');

	// Extract type definitions
	const typeObjs = extractArray(iliInspect, 'TYPEOBJS', 'TYPEOBJ');
	const typeMap = buildTypeMap(typeObjs);

	// Convert all items to unified row format
	const rows = [];

	for (const def of defects) {
		rows.push(mapDefectRow(def, 'DEF', typeMap));
	}
	for (const plobj of lineObjs) {
		rows.push(mapDefectRow(plobj, 'PLOBJ', typeMap));
	}
	for (const wld of welds) {
		rows.push(mapDefectRow(wld, 'WLD', typeMap));
	}

	// Extract report name (NLCH attribute from IPL_INSPECT root element)
	const reportName = iliInspect.NLCH || '';

	return { rows, types: typeObjs, reportName };
}

/**
 * Read a file with automatic encoding detection.
 * Tries UTF-8 first, falls back to cp1251 if BOM or encoding declaration detected.
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function readWithEncodingDetection(filePath) {
	const rawBuffer = fs.readFileSync(filePath);

	// Check for UTF-8 BOM
	if (rawBuffer[0] === 0xEF && rawBuffer[1] === 0xBB && rawBuffer[2] === 0xBF) {
		return rawBuffer.toString('utf8');
	}

	// Try to detect encoding from XML declaration
	const head = rawBuffer.slice(0, 200).toString('ascii');
	const encodingMatch = head.match(/encoding\s*=\s*["']([^"']+)["']/i);

	if (encodingMatch) {
		const declaredEncoding = encodingMatch[1].toLowerCase();
		if (declaredEncoding === 'windows-1251' || declaredEncoding === 'cp1251') {
			const decoded = iconv.decode(rawBuffer, 'cp1251');
			// Replace encoding declaration with utf-8 so the parser is happy
			return decoded.replace(/encoding\s*=\s*["'][^"']+["']/i, 'encoding="utf-8"');
		}
	}

	// Default: try utf-8
	let content = rawBuffer.toString('utf8');

	// If it looks garbled (common cp1251 indicator), try cp1251
	if (content.includes('\ufffd') || containsCyrillicCp1251(rawBuffer)) {
		const decoded = iconv.decode(rawBuffer, 'cp1251');
		return decoded.replace(/encoding\s*=\s*["'][^"']+["']/i, 'encoding="utf-8"');
	}

	return content;
}

/**
 * Check if a buffer likely contains cp1251-encoded Cyrillic text.
 * @param {Buffer} buf
 * @returns {boolean}
 */
function containsCyrillicCp1251(buf) {
	let cp1251Count = 0;
	for (let i = 0; i < Math.min(buf.length, 500); i++) {
		const b = buf[i];
		// cp1251 Cyrillic range: 0xC0-0xFF (А-я)
		if (b >= 0xC0 && b <= 0xFF) {
			cp1251Count++;
		}
	}
	return cp1251Count > 10;
}

/**
 * Safely extract an array of elements from a parent container.
 * @param {object} parent - Parent XML element
 * @param {string} containerName - Container element name (e.g. 'DEFECTS')
 * @param {string} childName - Child element name (e.g. 'DEF')
 * @returns {object[]}
 */
function extractArray(parent, containerName, childName) {
	if (!parent[containerName]) return [];
	const container = parent[containerName];
	const children = container[childName];
	if (!children) return [];
	return Array.isArray(children) ? children : [children];
}

/**
 * Build a map from IDTYPEOBJ to TITLE for type resolution.
 * @param {object[]} typeObjs
 * @returns {object}
 */
function buildTypeMap(typeObjs) {
	const map = {};
	for (const t of typeObjs) {
		const id = t.IDTYPEOBJ || t['IDTYPEOBJ'];
		const title = t.TITLE || t['TITLE'] || '';
		if (id) {
			map[id] = title;
		}
	}
	return map;
}

/**
 * Convert hour-based orientation to degrees.
 * @param {number|string} orientationMinHours
 * @returns {string}
 */
function hourToDeg(orientationMinHours) {
	const deg = Number(orientationMinHours) * 30;
	if (!isNaN(deg)) return String(deg);
	return '';
}

/**
 * Convert NaN to null.
 * @param {*} value
 * @returns {*}
 */
function convertNaNToNull(value) {
	if (value === '' || value === undefined) return null;
	const num = Number(value);
	return isNaN(num) ? null : num;
}

/**
 * Map a raw XML element to a unified defect row object.
 * @param {object} elem - Raw XML element attributes
 * @param {string} source - Source type: 'DEF', 'PLOBJ', or 'WLD'
 * @param {object} typeMap - IDTYPEOBJ → TITLE mapping
 * @returns {object}
 */
function mapDefectRow(elem, source, typeMap) {
	const odometerRaw = elem.ODOMETER || '0';
	const absoluteOdometer = Number(odometerRaw) / 100;

	const dlTubeRaw = elem.DL_TUBE || '0';
	const dlTube = convertNaNToNull(Number(dlTubeRaw) / 100);

	const anomalyTypeId = elem.IDTYPEOBJ || '';
	const anomalyTypeCl = typeMap[anomalyTypeId] || anomalyTypeId;
	const featureDescription = typeMap[anomalyTypeId] || anomalyTypeId;

	let description = '';
	let comments = '';

	if (source === 'PLOBJ') {
		description = elem.NAME_MARKER || '';
		comments = elem.REM || '';
	} else if (source === 'DEF' || source === 'WLD') {
		description = elem.REM || '';
	}

	return {
		WELD_NUMBER: elem.NUM_TUBE || '',
		ABSOLUTE_ODOMETER: isNaN(absoluteOdometer) ? null : absoluteOdometer,
		AVERAGE_DEPTH: elem.V_MAX_OTCH || '',
		LENGTH: elem.L_OTCH || '',
		WIDTH: elem.W_OTCH || '',
		ORIENTATION_DEG: hourToDeg(elem.ORIENT1 || ''),
		BPR_PIG: elem.KBD || '',
		MILEPOST: elem.L_LCH || '',
		NOMINAL_WALL_THICKNESS: elem.THICK || '',
		X: elem.B || '',
		Y: elem.L || '',
		Z: elem.H || '',
		SOURCE: source,
		US_WELD_ODOMETER: null,
		DS_WELD_ODOMETER: null,
		US_WELD_NUMBER: null,
		ANOMALY_TYPE_CL: anomalyTypeCl,
		FEATURE_DESCRIPTION: featureDescription,
		DL_TUBE: dlTube,
		DESCRIPTION: description,
		COMMENTS: comments,
		SRV_DISTRICT_GCL: 0,
	};
}
