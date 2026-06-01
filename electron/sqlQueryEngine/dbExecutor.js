import { parseXmlQuery } from './xmlQueryParser.js';
import { prepareQuery } from './queryPrepare.js';

/**
 * SQL execution wrapper that reads queries from XML files and executes them
 * against a Spatialite database. Mirrors the server's DB class methods.
 *
 * Ported from server/baseserver_ute-master/src/service/ute/db/index.js
 */

/**
 * Execute a SELECT query defined in an XML file.
 * @param {object} db - Spatialite database instance
 * @param {string} descrId - Query descriptor "FILE.xml#ID"
 * @param {object} params - Parameter values for substitution
 * @param {string} sqlQueriesDir - Path to SqlQueries directory
 * @returns {Promise<{columns: string[], rows: object[]}>}
 */
export async function dbReader(db, descrId, params, sqlQueriesDir) {
	const queryBlock = parseXmlQuery(descrId, sqlQueriesDir);
	const prepared = prepareQuery(queryBlock, 'select', params);

	console.log(`dbReader: ${descrId}`);
	const rows = await dbAll(db, prepared.query);

	if (rows && rows.length > 0) {
		const columns = Object.keys(rows[0]);
		console.log(`dbReader: got ${rows.length} rows`);
		return { columns, rows };
	}

	console.log('dbReader: got 0 rows');
	return { columns: [], rows: [] };
}

/**
 * Execute a SELECT query and return a single scalar value.
 * @param {object} db - Spatialite database instance
 * @param {string} descrId - Query descriptor "FILE.xml#ID"
 * @param {object} params - Parameter values
 * @param {string} outputParam - Column name to extract
 * @param {string} sqlQueriesDir - Path to SqlQueries directory
 * @returns {Promise<*>}
 */
export async function dbScalarReader(db, descrId, params, outputParam, sqlQueriesDir) {
	const queryBlock = parseXmlQuery(descrId, sqlQueriesDir);
	const prepared = prepareQuery(queryBlock, 'select', params);

	console.log(`dbScalarReader: ${descrId}`);
	const rows = await dbAll(db, prepared.query);

	if (outputParam && rows && rows.length > 0) {
		return rows[0][outputParam];
	}
	return undefined;
}

/**
 * Execute an INSERT/UPDATE/DELETE command defined in an XML file.
 * @param {object} db - Spatialite database instance
 * @param {string} descrId - Query descriptor "FILE.xml#ID"
 * @param {string} descrType - 'insert', 'update', or 'delete'
 * @param {object} params - Parameter values
 * @param {string} sqlQueriesDir - Path to SqlQueries directory
 * @returns {Promise<{lastID: number, changes: number}>}
 */
export async function dbCommand(db, descrId, descrType, params, sqlQueriesDir) {
	const queryBlock = parseXmlQuery(descrId, sqlQueriesDir);
	const prepared = prepareQuery(queryBlock, descrType, params);

	console.log(`dbCommand [${descrType}]: ${descrId}`);
	const result = await dbRun(db, prepared.query);
	return result;
}

/**
 * Execute an INSERT command for each row in a data table.
 * Reports progress via optional callback.
 * @param {object} db - Spatialite database instance
 * @param {string} descrId - Query descriptor "FILE.xml#ID"
 * @param {string} descrType - 'insert' or 'update'
 * @param {object[]} dataRows - Array of row objects
 * @param {object} baseParams - Base parameter values (merged with each row)
 * @param {string} sqlQueriesDir - Path to SqlQueries directory
 * @param {function} [onProgress] - Optional callback (current, total) => void
 * @returns {Promise<void>}
 */
export async function dbWriter(db, descrId, descrType, dataRows, baseParams, sqlQueriesDir, onProgress) {
	const queryBlock = parseXmlQuery(descrId, sqlQueriesDir);

	console.log(`dbWriter [${descrType}]: ${descrId}, ${dataRows.length} rows`);

	let prevPcnt = 0;
	for (let i = 0; i < dataRows.length; i++) {
		const rowParams = { ...baseParams, ...dataRows[i] };
		const prepared = prepareQuery(queryBlock, descrType, rowParams);
		await dbRun(db, prepared.query);

		const pcnt = Math.round(((i + 1) * 100) / dataRows.length);
		if (pcnt !== prevPcnt && pcnt % 5 === 0) {
			console.log(`dbWriter: ${pcnt}%`);
			prevPcnt = pcnt;
		}

		if (onProgress) {
			onProgress(i + 1, dataRows.length);
		}
	}
}

/**
 * Execute a raw SQL query (SELECT) and return all rows.
 * @param {object} db - Spatialite database instance
 * @param {string} sql - SQL query string
 * @returns {Promise<object[]>}
 */
export function dbAll(db, sql) {
	return new Promise((resolve, reject) => {
		db.all(sql, [], (err, rows) => {
			if (err) {
				console.error('SQL Error in dbAll:', err.message);
				console.error('Query:', sql.substring(0, 200));
				reject(err);
			} else {
				resolve(rows || []);
			}
		});
	});
}

/**
 * Execute a raw SQL command (INSERT/UPDATE/DELETE).
 * @param {object} db - Spatialite database instance
 * @param {string} sql - SQL command string
 * @returns {Promise<{lastID: number, changes: number}>}
 */
export function dbRun(db, sql) {
	return new Promise((resolve, reject) => {
		db.run(sql, [], function (err) {
			if (err) {
				console.error('SQL Error in dbRun:', err.message);
				console.error('Query:', sql.substring(0, 200));
				reject(err);
			} else {
				resolve({ lastID: this.lastID, changes: this.changes });
			}
		});
	});
}

/**
 * Execute BEGIN TRANSACTION.
 * @param {object} db
 * @returns {Promise<void>}
 */
export function beginTransaction(db) {
	return dbRun(db, 'BEGIN TRANSACTION');
}

/**
 * Execute COMMIT.
 * @param {object} db
 * @returns {Promise<void>}
 */
export function commitTransaction(db) {
	return dbRun(db, 'COMMIT');
}

/**
 * Execute ROLLBACK.
 * @param {object} db
 * @returns {Promise<void>}
 */
export function rollbackTransaction(db) {
	return dbRun(db, 'ROLLBACK');
}
