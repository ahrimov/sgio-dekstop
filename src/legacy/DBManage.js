import { Vector } from 'ol/source.js';
import WKT from 'ol/format/WKT.js';
import Feature from 'ol/Feature.js';

let db;

const VIRT_MARKER_LAYER_ID = 'SGIO_ILI_DATA_VIRT_MARKER';
const VIRT_MARKER_WHERE_CLAUSE = 'anomaly_type_cl in (1004,1003)';
const VIRT_MARKER_STYLE_CLAUSE =
	"ANOMALY_TYPE_CL||CASE WHEN control_point_lf = 'Y' THEN '_LNK' ELSE '_NOTLNK' END";

function applyRuntimeLayerRules(layer) {
	if (layer.id !== VIRT_MARKER_LAYER_ID) return;

	// Project XML is copied into the application data directory and may already be cached
	// by a running renderer. Keep the critical visibility/style rule current on every reload.
	layer.whereClause = VIRT_MARKER_WHERE_CLAUSE;
	layer.styleClause = VIRT_MARKER_STYLE_CLAUSE;
}

/**
 * Returns the current database file path, or null if DB is not initialized.
 * @returns {string|null}
 */
export function getDbPath() {
	return db?.path ?? null;
}

let dbLoadState = {
	totalLayers: 0,
	loadedLayers: 0,
	onProgress: null,
	onLayerComplete: null,
};

export function setDBProgressCallbacks(onProgress, onLayerComplete = null) {
	dbLoadState.onProgress = onProgress;
	dbLoadState.onLayerComplete = onLayerComplete;
}

async function openDB(filename, name, sourceDirName) {
	try {
		const appDataPath = await electronAPI.getAppDataPath();
		const dbPath = `${appDataPath}/database/${filename}`;

		console.log('Opening database:', dbPath);

		const dbInfo = await electronAPI.openDatabase(dbPath);
		console.log('Database opened, info:', dbInfo);

		dbInfo.filename = filename;
		dbInfo.sourceDirName = sourceDirName;

		return dbInfo;
	} catch (error) {
		console.error('Error opening database:', error);
		throw error;
	}
}

export async function initialDB(_sourceDirName, dbName, name) {
	try {
		const appDataPath = await electronAPI.getAppDataPath();
		const targetDBPath = `${appDataPath}/database/${dbName}`;

		if (dbLoadState.onProgress) {
			dbLoadState.onProgress('Инициализация базы данных...');
		}

		await electronAPI.mkdir(`${appDataPath}/database`);

		try {
			const targetExists = await electronAPI.exists(targetDBPath);
			if (!targetExists) {
				if (dbLoadState.onProgress) {
					dbLoadState.onProgress('Копирование базы данных...');
				}
				// Seed DB is stored in the app bundle under resources/Project/db/
				// and is never copied to sgio-data/Project/db/ anymore.
				const resourcePath = await electronAPI.getResourcePath();
				const seedDBPath = `${resourcePath}/Project/db/${dbName}`;
				await electronAPI.copyFile(seedDBPath, targetDBPath);
				console.log('Database copied from bundle resources');
			}
		} catch (err) {
			console.log('No source database found, will create new one: ' + err);
		}

		db = await openDB(dbName, name, `${appDataPath}/database/`);

		if (dbLoadState.onProgress) {
			dbLoadState.onProgress('База данных готова');
		}

		return db;
	} catch (error) {
		console.error('Error initializing database:', error);
		throw error;
	}
}

export function requestToDB(query, callback, notification = 'Неизвестная ошибка') {
	if (!db) {
		console.log('Database not initialized, retrying...');
		setTimeout(() => requestToDB(query, callback, notification), 50);
		return;
	}

	electronAPI
		.executeSQL(db.path, query)
		.then(result => {
			const compatibleResult = {
				rows: {
					length: result.rows.length,
					item: index => result.rows[index],
				},
			};
			callback(compatibleResult);
		})
		.catch(error => {
			console.error('Query:', query);
			console.error('Database transaction error:', error);
			throw new Error(`Database transaction error: ${error?.message || error}`);
		});
}

export function requestToDBPromise(query, notification = 'Неизвестная ошибка') {
	return new Promise((resolve, reject) => {
		if (!db) {
			console.log('Database not initialized, retrying...');
			setTimeout(() => {
				requestToDB(query, notification).then(resolve).catch(reject);
			}, 50);
			return;
		}

		electronAPI
			.executeSQL(db.path, query)
			.then(result => {
				const compatibleResult = {
					rows: {
						length: result.rows.length,
						item: index => result.rows[index],
					},
				};
				resolve(compatibleResult);
			})
			.catch(error => {
				console.error('Query:', query);
				console.error('Database transaction error:', error);
				reject(new Error(notification || 'Database transaction error'));
			});
	});
}

export function getDataLayerFromBD(layer) {
	return new Promise((resolve, reject) => {
		if (!db) {
			setTimeout(() => {
				getDataLayerFromBD(layer).then(resolve).catch(reject);
			}, 50);
			return;
		}

		if (dbLoadState.onProgress) {
			dbLoadState.loadedLayers++;
			const progress = Math.round((dbLoadState.loadedLayers / dbLoadState.totalLayers) * 100);
			dbLoadState.onProgress(
				dbLoadState.loadedLayers,
				`Текущий слой: ${layer.label}`,
				progress
			);
		}

		applyRuntimeLayerRules(layer);

		const source = new Vector();
		let selectTypeQuery = '';
		let selectLabelQuery = '';

		// If layer has a style_clause (computed SQL expression for type), use it directly.
		// Otherwise fall back to styleTypeColumn (simple column name).
		if (layer.styleClause) {
			selectTypeQuery = ` (${layer.styleClause}) as type, `;
		} else {
			const atribType = layer.atribs.filter(atrib => atrib.name === layer.styleTypeColumn);
			if (atribType.length > 0) {
				selectTypeQuery = ` ${layer.styleTypeColumn} as type, `;
			}
		}

		const atribDescription = layer.atribs.filter(atrib => atrib.name === layer.labelColumn);
		if (atribDescription.length > 0) {
			selectLabelQuery = ` ${layer.labelColumn} as description, `;
		}

		const whereClause = layer.whereClause ? ` WHERE ${layer.whereClause}` : '';
		const pk = layer.primaryKey || 'id';
		const geomExpr = layer.geometryColumn || 'AsText(Geometry) as geom';
		// When style_clause is present we need a table alias 'd' since the expression may reference 'd.column'
		const tableRef = layer.styleClause ? `${layer.table} d` : layer.table;
		const query =
			`SELECT ${pk} as id,${selectTypeQuery} ${selectLabelQuery} ${geomExpr} FROM ` +
			tableRef + whereClause;

		requestToDB(
			query,
			function (res) {
				try {
					const format = new WKT();

					for (let i = 0; i < res.rows.length; i++) {
						let wkt = res.rows.item(i).geom;
						let feature = new Feature();
						if (wkt) {
							feature = format.readFeature(wkt.replace(/nan/g, '0'));
							
							// Apply coordinate transformation for ILI layers
							// These layers have coordinates in EPSG:4326 but layer CRS is EPSG:3857
							const iliLayers = [
								'SGIO_ILI_DATA',
								'SGIO_ILI_DATA_FEATURE',
								'SGIO_ILI_DATA_VIRT_MARKER',
								'SGIO_ILI_PIPE_LENGTH'
							];
							
							if (iliLayers.includes(layer.id)) {
								const geometry = feature.getGeometry();
								if (geometry) {
									geometry.transform('EPSG:4326', 'EPSG:3857');
								}
							}
						}
						feature.id = res.rows.item(i).id;
						feature.set(pk, res.rows.item(i).id);
						feature.layerID = layer.id;
						feature.type = res.rows.item(i).type;
						feature.label = res.rows.item(i).description;
						source.addFeature(feature);
					}
					layer.setSource(source);

					if (dbLoadState.onLayerComplete) {
						dbLoadState.onLayerComplete(layer);
					}

					resolve(layer);
				} catch (error) {
					console.error(`Ошибка загрузки слоя "${layer.label}":`, error);
					reject(error);
				}
			},
			'Ошибка в базе данных.'
		);
	});
}

export async function loadAllLayers(layers) {
	if (!layers || layers.length === 0) {
		console.log('Нет слоев для загрузки');
		return [];
	}

	setTotalLayersCount(layers.length);

	const results = [];

	for (let i = 0; i < layers.length; i++) {
		const layer = layers[i];
		if (layer.get('kmlType')) {
			continue;
		}
		try {
			if (dbLoadState.onProgress) {
				dbLoadState.onProgress(
					i + 1,
					`Загрузка: ${layer.label}`,
					Math.round(((i + 1) / layers.length) * 100)
				);
			}

			const result = await getDataLayerFromBD(layer);
			results.push(result);
		} catch (error) {
			console.error(`Ошибка загрузки слоя ${layer.label}:`, error);
			results.push(null);
		}
	}

	if (dbLoadState.onProgress) {
		dbLoadState.onProgress(layers.length, 'Все слои загружены', 100);
	}

	return results;
}

export function setTotalLayersCount(count) {
	dbLoadState.totalLayers = count;
	dbLoadState.loadedLayers = 0;
}

export function updateTotalLayersCount(count) {
	dbLoadState.totalLayers += count;
}

export function resetDBLoadState() {
	dbLoadState.totalLayers = 0;
	dbLoadState.loadedLayers = 0;
}

export function onProgress(message, currentFile = '', progress = 0) {
	if (window.dbProgressCallbacks && window.dbProgressCallbacks.onProgress) {
		window.dbProgressCallbacks.onProgress(message, currentFile, progress);
	}
}

/**
 * Reload specific DB layers by their IDs, re-querying the database and
 * replacing the OpenLayers Vector source with fresh data.
 * Used after ILI import to refresh the 4 VTD map layers.
 * Does NOT touch the progress counter — safe to call at any time.
 *
 * @param {string[]} layerIds - Array of layer IDs to reload (e.g. ['SGIO_ILI_DATA', ...])
 * @param {Array} layerList - The current layers array from globals
 */
export async function reloadLayersByIds(layerIds, layerList) {
	const targets = layerList.filter(l => layerIds.includes(l.id));
	if (targets.length === 0) {
		console.warn('[reloadLayersByIds] No matching layers found for IDs:', layerIds);
		return;
	}
	console.log(`[reloadLayersByIds] Reloading ${targets.length} layer(s):`, targets.map(l => l.id));

	// Temporarily suppress progress callbacks so the reload doesn't corrupt
	// the dbLoadState counter that was set during initial startup loading.
	const savedProgress = dbLoadState.onProgress;
	const savedLayerComplete = dbLoadState.onLayerComplete;
	dbLoadState.onProgress = null;
	dbLoadState.onLayerComplete = null;

	try {
		for (const layer of targets) {
			try {
				await getDataLayerFromBD(layer);
				console.log(`[reloadLayersByIds] Reloaded layer: ${layer.id}`);
			} catch (err) {
				console.error(`[reloadLayersByIds] Failed to reload layer ${layer.id}:`, err);
			}
		}
	} finally {
		dbLoadState.onProgress = savedProgress;
		dbLoadState.onLayerComplete = savedLayerComplete;
	}
}
