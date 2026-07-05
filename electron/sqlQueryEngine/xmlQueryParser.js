import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

/**
 * Parses an XML file containing SQL query definitions (like UTE_SEM.xml).
 * Extracts query blocks by ID, returning the query text, variables, and type.
 *
 * Ported from server/baseserver_ute-master/src/utils/IOUtils.parseXml()
 * Uses fast-xml-parser instead of camaro (pure JS, no native deps).
 */

const parserOptions = {
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	textNodeName: '#text',
	trimValues: true,
	parseAttributeValue: false,
	isArray: (name) => ['data', 'var', 'param'].includes(name),
};

/**
 * Parse an XML SQL file and extract a specific query block.
 * @param {string} fileRequest - Format: "FILENAME.xml#QUERY_ID" (e.g. "UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_8")
 * @param {string} sqlQueriesDir - Absolute path to the SqlQueries directory
 * @returns {object} Parsed query definition with { id, select?, insert?, update?, delete? }
 */
export function parseXmlQuery(fileRequest, sqlQueriesDir) {
	if (!fileRequest) {
		throw new Error(`Invalid file request: ${fileRequest}`);
	}

	const firstHash = fileRequest.indexOf('#');
	const fileName = firstHash >= 0 ? fileRequest.substring(0, firstHash) : '';
	const queryId  = firstHash >= 0 ? fileRequest.substring(firstHash + 1) : '';
	if (!fileName || !queryId) {
		throw new Error(`Invalid file request format. Expected "FILE.xml#ID", got: ${fileRequest}`);
	}

	const filePath = path.join(sqlQueriesDir, fileName);
	let xmlContent;
	try {
		xmlContent = fs.readFileSync(filePath, 'utf8');
	} catch (e) {
		throw new Error(`Cannot read SQL XML file: ${filePath} — ${e.message}`);
	}

	const parser = new XMLParser(parserOptions);
	const parsed = parser.parse(xmlContent);

	if (!parsed.root || !parsed.root.data) {
		throw new Error(`Invalid XML structure in ${fileName}: missing <root><data> elements`);
	}

	const dataBlocks = Array.isArray(parsed.root.data) ? parsed.root.data : [parsed.root.data];
	const block = dataBlocks.find(d => d['@_id'] === queryId);

	if (!block) {
		throw new Error(`Query block "${queryId}" not found in ${fileName}`);
	}

	return normalizeQueryBlock(block);
}

/**
 * Normalize a raw parsed XML data block into a standard format.
 * @param {object} block - Raw parsed XML block
 * @returns {object} Normalized query block
 */
function normalizeQueryBlock(block) {
	const result = {
		id: block['@_id'],
		comment: block['@_comment'] || '',
	};

	// Process each query type: select, insert, update, delete
	for (const queryType of ['select', 'insert', 'update', 'delete']) {
		if (!block[queryType]) continue;

		const section = block[queryType];
		// select uses <dbQuery>, others use <dbCommand>
		const container = section.dbQuery || section.dbCommand;
		if (!container) continue;

		const vars = extractVars(container.var);
		const queryText = extractQueryText(container.query);

		result[queryType] = {
			query: queryText,
			vars,
			params: extractVars(container.param),
		};
	}

	return result;
}

/**
 * Extract variable definitions from parsed XML var elements.
 * @param {Array|object|undefined} varElements
 * @returns {Array<{name: string, type?: string, default?: string, direction?: string}>}
 */
function extractVars(varElements) {
	if (!varElements) return [];
	const arr = Array.isArray(varElements) ? varElements : [varElements];
	return arr.map(v => ({
		name: v['@_name'] || '',
		type: v['@_type'] || undefined,
		default: v['@_default'] || undefined,
		direction: v['@_direction'] || undefined,
	})).filter(v => v.name);
}

/**
 * Extract query text from the parsed query element.
 * @param {string|object} queryElement
 * @returns {string}
 */
function extractQueryText(queryElement) {
	if (typeof queryElement === 'string') {
		return queryElement.trim();
	}
	if (queryElement && typeof queryElement === 'object') {
		// fast-xml-parser may wrap text in #text
		if (queryElement['#text']) {
			return String(queryElement['#text']).trim();
		}
	}
	return '';
}
