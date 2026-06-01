-- =============================================================================
-- Миграция 001: Исправление типов первичных ключей в ILI-таблицах
-- =============================================================================
-- Проблема:
--   Таблицы sgio_ili_inspection, sgio_ili_data, sgio_ili_pipe_length были
--   созданы с PostgreSQL-типом BIGSERIAL для первичных ключей.
--   SQLite не распознаёт BIGSERIAL как автоинкремент, что приводило к ошибке:
--     SQLITE_CONSTRAINT: NOT NULL constraint failed: sgio_ili_inspection.ili_inspection_id
--   при попытке вставить запись без явного указания ID.
--
-- Решение:
--   Пересоздать таблицы с типом INTEGER PRIMARY KEY AUTOINCREMENT,
--   который является стандартным способом автоинкремента в SQLite.
--
-- Применено: 2026-05-24 к файлу src/assets/resources/Project/db/default_.db (исходно)
-- Применено: 2026-05-27 к файлу src/assets/resources/Project/db/default.db (основная БД приложения)
-- =============================================================================

PRAGMA foreign_keys = OFF;

-- -----------------------------------------------------------------------------
-- sgio_ili_inspection
-- -----------------------------------------------------------------------------
ALTER TABLE sgio_ili_inspection RENAME TO sgio_ili_inspection_old;

CREATE TABLE sgio_ili_inspection (
	ili_inspection_id INTEGER PRIMARY KEY AUTOINCREMENT,
	route_id INTEGER NULL,
	begin_date TEXT NULL,
	end_date TEXT NULL,
	tool_type_cl TEXT NULL,
	model TEXT NULL,
	ili_comments TEXT NULL,
	tool_vendor_cl TEXT NULL,
	description TEXT NULL,
	comments TEXT NULL,
	source_gcl TEXT NULL
);

INSERT INTO sgio_ili_inspection SELECT * FROM sgio_ili_inspection_old;
DROP TABLE sgio_ili_inspection_old;

-- -----------------------------------------------------------------------------
-- sgio_ili_data
-- -----------------------------------------------------------------------------
ALTER TABLE sgio_ili_data RENAME TO sgio_ili_data_old;

CREATE TABLE sgio_ili_data (
	ili_data_id INTEGER PRIMARY KEY AUTOINCREMENT,
	ili_inspection_id INTEGER,
	weld_number TEXT,
	absolute_odometer NUMERIC NOT NULL,
	average_depth NUMERIC,
	length NUMERIC,
	width NUMERIC,
	internal_external_cl TEXT,
	source_gcl TEXT,
	date_collected TEXT,
	orientation_deg NUMERIC,
	anomaly_type_cl NUMERIC,
	anomaly_extension_cl TEXT,
	measured_wall_thickness NUMERIC,
	feature_description TEXT,
	control_point_lf TEXT,
	ref_event_id INTEGER,
	calibrated_measure NUMERIC,
	certainty_interval REAL,
	description TEXT,
	milepost TEXT,
	nominal_wall_thickness NUMERIC,
	ds_weld_distance NUMERIC,
	comments TEXT,
	us_weld_odometer NUMERIC,
	ds_weld_odometer NUMERIC,
	us_weld_number TEXT,
	srv_district_gcl INTEGER,
	x_coord NUMERIC,
	y_coord NUMERIC,
	create_date TEXT,
	pods_user TEXT,
	z_coord NUMERIC,
	tube_height NUMERIC,
	station NUMERIC,
	pipe_measure NUMERIC,
	us_weld_distance NUMERIC
);

INSERT INTO sgio_ili_data SELECT * FROM sgio_ili_data_old;
DROP TABLE sgio_ili_data_old;

-- -----------------------------------------------------------------------------
-- sgio_ili_pipe_length
-- -----------------------------------------------------------------------------
ALTER TABLE sgio_ili_pipe_length RENAME TO sgio_ili_pipe_length_old;

CREATE TABLE sgio_ili_pipe_length (
	ili_pipe_length_id INTEGER PRIMARY KEY AUTOINCREMENT,
	ili_inspection_id INTEGER,
	description TEXT,
	weld_number TEXT,
	sequence_number NUMERIC,
	start_odometer NUMERIC,
	end_odometer NUMERIC,
	measured_wall_thickness NUMERIC,
	nominal_wall_thickness NUMERIC,
	source_gcl TEXT,
	comments TEXT,
	x_coord_start NUMERIC,
	y_coord_start NUMERIC,
	x_coord_end NUMERIC,
	y_coord_end NUMERIC,
	create_date TEXT,
	pods_user TEXT,
	seam_orientation_deg NUMERIC
);

INSERT INTO sgio_ili_pipe_length SELECT * FROM sgio_ili_pipe_length_old;
DROP TABLE sgio_ili_pipe_length_old;

PRAGMA foreign_keys = ON;
