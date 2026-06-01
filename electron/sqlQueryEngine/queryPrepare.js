import { toNumber, toString, toDateTime } from './mathUtils.js';

/**
 * Query parameter preparation and substitution engine.
 * Ported from server/baseserver_ute-master/src/service/sql/prepareService.js
 *
 * Takes a parsed query block (from xmlQueryParser) and a params object,
 * substitutes {PARAM_NAME} placeholders with actual values.
 */

/**
 * Prepare a query by finding the right query type section and substituting parameters.
 * @param {object} queryBlock - Parsed query block from xmlQueryParser
 * @param {string} descrType - Query type: 'select', 'insert', 'update', 'delete'
 * @param {object} data - Parameter values to substitute (flat key-value object)
 * @returns {{ query: string, vars: Array }} The prepared query with substituted values
 */
export function prepareQuery(queryBlock, descrType, data) {
	const section = queryBlock[descrType];
	if (!section) {
		throw new Error(`Query type "${descrType}" not found in block "${queryBlock.id}"`);
	}

	const preparedQuery = generateQuery(section, data);
	return {
		query: preparedQuery,
		vars: section.vars || [],
	};
}

/**
 * Generate a SQL query string by substituting {PARAM} placeholders with values.
 * Ported from PrepareService.generateQuery() on the server.
 *
 * @param {object} querySection - Query section with { query, vars }
 * @param {object} requestVariables - Key-value pairs of parameter values
 * @returns {string} SQL query with all parameters substituted
 */
export function generateQuery(querySection, requestVariables) {
	const variables = {};
	const tempReqVarsData = { ...requestVariables };

	// Process declared variables from the XML definition
	if (querySection.vars) {
		for (const rawVar of querySection.vars) {
			if (rawVar.direction === 'Output') continue;

			if (rawVar.name in tempReqVarsData) {
				const resValue = getValidValue(rawVar, tempReqVarsData[rawVar.name]);
				variables[rawVar.name] = resValue !== null ? resValue : 'NULL';
				delete tempReqVarsData[rawVar.name];
			} else if (rawVar.default !== undefined) {
				if (rawVar.type && rawVar.type === 'DateTime' && rawVar.default === '') {
					variables[rawVar.name] = 'NULL_DATE_TIME';
				} else {
					variables[rawVar.name] = rawVar.default;
				}
			}
		}
	}

	// Add remaining request variables that weren't declared in XML
	for (const tempVar of Object.keys(tempReqVarsData)) {
		variables[tempVar] = tempReqVarsData[tempVar];
	}

	// Substitute placeholders in the query text
	let result = replaceVars(querySection.query, variables);

	// Clean up NULL placeholders
	result = result.replace(/'NULL_DATE_TIME'/g, 'NULL').replace(/'NULL'/g, 'NULL');

	return result;
}

/**
 * Get a properly typed value for a parameter based on its declared type.
 * @param {object} param - Variable definition { name, type }
 * @param {*} value - Raw value
 * @returns {*} Typed value or null
 */
function getValidValue(param, value) {
	try {
		if (param.type) {
			switch (param.type) {
			case 'Decimal':
			case 'Double':
			case 'Int32':
			case 'Int64':
				return toNumber(value);
			case 'String':
				return toString(value);
			case 'DateTime':
				return toDateTime(value);
			}
		}
	} catch {
		return null;
	}
	return value;
}

/**
 * Replace {PARAM_NAME} placeholders in a string with values from a data object.
 * Two-pass replacement: first handle bare {PARAM} that should become NULL when empty,
 * then replace all remaining {PARAM} with their values.
 *
 * @param {string} oldString - Template string with {PARAM} placeholders
 * @param {object} data - Key-value pairs for substitution
 * @returns {string} String with all placeholders replaced
 */
function replaceVars(oldString, data) {
	// First pass: replace bare {PARAM} with NULL when value is empty string
	// (but not when inside quotes like '{PARAM}')
	for (const repTempl of Object.keys(data)) {
		if (oldString.indexOf(`'{${repTempl}}'`) === -1 && data[repTempl] === '') {
			// Check if the param is part of a larger quoted string
			if (oldString.indexOf(`'{${repTempl}}`) !== -1 || oldString.indexOf(`{${repTempl}}'`) !== -1) {
				// Inside a quoted string — don't replace with NULL
				continue;
			}
			oldString = oldString.replace(new RegExp(`\\{${escapeRegex(repTempl)}\\}`, 'g'), 'NULL');
		}
	}

	// Second pass: replace all remaining {PARAM} with their values
	for (const repTempl of Object.keys(data)) {
		oldString = oldString.replace(
			new RegExp(`\\{${escapeRegex(repTempl)}\\}`, 'g'),
			() => data[repTempl]
		);
	}

	// Third pass: replace any leftover unsubstituted {PARAM} placeholders with NULL.
	// This handles variables that were declared in the XML but not provided in the
	// data object (e.g. Z, DEPTH when they are JS null and never added to variables).
	oldString = oldString.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, 'NULL');

	return oldString;
}

/**
 * Escape special regex characters in a string.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
