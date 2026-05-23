-- =============================================================================
-- SQLite-схема для Electron-приложения ВТД (ИЛИ).
-- Адаптировано из Oracle-схемы PODS.
--
-- Порядок создания таблиц важен из-за FOREIGN KEY.
-- Все FK объявлены, но SQLite требует PRAGMA foreign_keys = ON для их проверки.
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------------------------
-- ROUTE — маршруты/трубопроводы
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ROUTE (
    ROUTE_ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    NAME            TEXT    NOT NULL,
    DESCRIPTION     TEXT,
    NOMINAL_DIAMETER REAL,
    CREATED_AT      TEXT    DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------------------
-- STATION_POINT — геодезические пикеты (ось трубопровода)
-- Используется в CALC_LINK_REPERS_2 и CALC_CALC_DEF_2
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS STATION_POINT (
    STATION_POINT_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ROUTE_ID         INTEGER NOT NULL REFERENCES ROUTE(ROUTE_ID),
    STATION          REAL    NOT NULL,   -- км-отметка
    DISTANCE         REAL    NOT NULL DEFAULT 0,  -- смещение от оси
    X                REAL,              -- долгота / E
    Y                REAL,              -- широта / N
    Z                REAL               -- высота
);

CREATE INDEX IF NOT EXISTS idx_station_point_route
    ON STATION_POINT(ROUTE_ID, STATION, DISTANCE);

-- -----------------------------------------------------------------------------
-- ANOMALY_EXTENSION_CL — справочник типов аномалий
-- Используется в ILI_ILI_ZIP_IMP_C_55_9 и ILI_ILI_ZIP_IMP_C_55_1
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ANOMALY_EXTENSION_CL (
    ANOMALY_EXTENSION_CL_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    CODE                    TEXT    UNIQUE,        -- числовой код (0 = неизвестно)
    EXTENDED_DESCRIPTION    TEXT    NOT NULL,      -- текстовое описание
    SHORT_DESCRIPTION       TEXT,
    CATEGORY                TEXT
);

-- Запись "неизвестно" по умолчанию
INSERT OR IGNORE INTO ANOMALY_EXTENSION_CL (CODE, EXTENDED_DESCRIPTION, SHORT_DESCRIPTION)
VALUES ('0', 'НЕИЗВЕСТНО,НЕИЗВЕСТНО', 'НЕИЗВЕСТНО');

-- -----------------------------------------------------------------------------
-- ILI_INSPECTION — отчёты ВТД
-- Используется в ILI_ILI_ZIP_IMP_C_55_7, ILI_ILI_ZIP_IMP_C_55_0,
--   ILI_ILI_INSP_PROC_C_1, CALC_CALC_DEF_12, CALC_CALC_DEF_13
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ILI_INSPECTION (
    ILI_INSPECTION_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ROUTE_ID          INTEGER NOT NULL REFERENCES ROUTE(ROUTE_ID),
    KM_START          TEXT,
    KM_END            TEXT,
    INSPECTION_DATE   TEXT,              -- дата в формате DD.MM.YYYY или ISO
    COMPANY           TEXT,
    FORMAT            TEXT    DEFAULT 'xml',
    SOURCE_GCL        TEXT,
    CREATED_BY        TEXT,
    FIRST_WELD_NUMBER TEXT,
    STATION_RANGE     REAL,              -- диапазон станций (заполняется после расчёта)
    IS_DIRTY          INTEGER DEFAULT 1, -- 1 = требует пересчёта
    CREATED_AT        TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ili_inspection_route
    ON ILI_INSPECTION(ROUTE_ID);

-- -----------------------------------------------------------------------------
-- ILI_DATA — дефекты, швы (WLD), линейные объекты (PLOBJ)
-- Используется в ILI_ILI_ZIP_IMP_C_55_8, ILI_ILI_ZIP_IMP_C_55_1,
--   ILI_ILI_ZIP_IMP_C_55_4, CALC_CALC_DEF_1, CALC_CALC_DEF_10
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ILI_DATA (
    ILI_DATA_ID           INTEGER PRIMARY KEY AUTOINCREMENT,
    ILI_INSPECTION_ID     INTEGER NOT NULL REFERENCES ILI_INSPECTION(ILI_INSPECTION_ID),
    -- Идентификация
    SOURCE                TEXT,          -- 'DEF' | 'WLD' | 'PLOBJ'
    WELD_NUMBER           TEXT,          -- номер шва
    US_WELD_NUMBER        TEXT,          -- номер предыдущего шва
    -- Одометрия
    ABSOLUTE_ODOMETER     REAL,          -- абсолютный одометр (м)
    US_WELD_ODOMETER      REAL,          -- одометр предыдущего шва
    DS_WELD_ODOMETER      REAL,          -- одометр следующего шва
    MILEPOST              TEXT,          -- пикет
    DL_TUBE               REAL,          -- длина трубы (м)
    -- Геометрия дефекта
    AVERAGE_DEPTH         TEXT,
    LENGTH                TEXT,
    WIDTH                 TEXT,
    ORIENTATION_DEG       TEXT,          -- ориентация в градусах
    BPR_PIG               TEXT,
    NOMINAL_WALL_THICKNESS REAL,
    -- Координаты
    X                     TEXT,          -- долгота
    Y                     TEXT,          -- широта
    Z                     TEXT,          -- высота
    -- Классификация
    ANOMALY_TYPE_CL       TEXT,          -- тип аномалии (текст)
    ANOMALY_CODE          TEXT,          -- код аномалии (из ANOMALY_EXTENSION_CL)
    FEATURE_DESCRIPTION   TEXT,
    -- Описание
    DESCRIPTION           TEXT,
    COMMENTS              TEXT,
    -- ЛПУ
    SRV_DISTRICT_GCL      TEXT    DEFAULT '0',
    -- Ссылка на EVENT_RANGE (заполняется после расчёта)
    EVENT_RANGE_ID        INTEGER REFERENCES EVENT_RANGE(EVENT_RANGE_ID)
);

CREATE INDEX IF NOT EXISTS idx_ili_data_inspection
    ON ILI_DATA(ILI_INSPECTION_ID, ABSOLUTE_ODOMETER);

CREATE INDEX IF NOT EXISTS idx_ili_data_source
    ON ILI_DATA(ILI_INSPECTION_ID, SOURCE);

-- -----------------------------------------------------------------------------
-- ILI_CONTROL_POINT — контрольные точки (реперы)
-- Используется в CALC_LINK_REPERS_1, CALC_LINK_REPERS_3, CALC_LINK_REPERS_4,
--   CALC_CALC_DEF_1
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ILI_CONTROL_POINT (
    ILI_CONTROL_POINT_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ILI_INSPECTION_ID    INTEGER NOT NULL REFERENCES ILI_INSPECTION(ILI_INSPECTION_ID),
    SOURCE               TEXT    DEFAULT 'WLD',  -- тип точки
    ABSOLUTE_ODOMETER    REAL,
    X                    TEXT,
    Y                    TEXT,
    Z                    TEXT,
    STATION              REAL,           -- пикет (из исходных данных)
    DISTANCE             REAL,           -- смещение
    ROUTE_ID             INTEGER REFERENCES ROUTE(ROUTE_ID),
    -- Результаты привязки (заполняются LinkRepersService)
    LINKED_STATION       REAL,
    LINKED_DISTANCE      REAL,
    LINKED_ROUTE_ID      INTEGER REFERENCES ROUTE(ROUTE_ID),
    IS_LINKED            INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ili_control_point_inspection
    ON ILI_CONTROL_POINT(ILI_INSPECTION_ID, ABSOLUTE_ODOMETER);

-- -----------------------------------------------------------------------------
-- EVENT_RANGE — диапазоны событий (координаты дефектов на оси трубопровода)
-- Используется в CALC_CALC_DEF_3, CALC_CALC_DEF_6, CALC_CALC_DEF_8,
--   CALC_CALC_DEF_10, CALC_CALC_DEF_11
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS EVENT_RANGE (
    EVENT_RANGE_ID       INTEGER PRIMARY KEY AUTOINCREMENT,
    ILI_INSPECTION_ID    INTEGER REFERENCES ILI_INSPECTION(ILI_INSPECTION_ID),
    ROUTE_ID             INTEGER REFERENCES ROUTE(ROUTE_ID),
    -- Ссылки на источник
    ILI_DATA_ID          INTEGER REFERENCES ILI_DATA(ILI_DATA_ID),
    ILI_PIPE_LENGTH_ID   INTEGER,        -- заполняется для записей ILI_PIPE_LENGTH
    -- Координаты начала
    STATION_FROM         REAL,
    DISTANCE_FROM        REAL,
    -- Координаты конца
    STATION_TO           REAL,
    DISTANCE_TO          REAL,
    -- Геодезические координаты центра
    X                    REAL,
    Y                    REAL,
    Z                    REAL,
    -- Актуальность (0 = устаревшая запись, 1 = актуальная)
    IS_ACTUAL            INTEGER DEFAULT 1,
    CREATED_AT           TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_range_inspection
    ON EVENT_RANGE(ILI_INSPECTION_ID, IS_ACTUAL);

CREATE INDEX IF NOT EXISTS idx_event_range_data
    ON EVENT_RANGE(ILI_DATA_ID);

-- -----------------------------------------------------------------------------
-- ILI_PIPE_LENGTH — длины труб (из швов WLD)
-- Используется в ILI_ILI_ZIP_IMP_C_55_5, CALC_CALC_DEF_5,
--   CALC_CALC_DEF_6, CALC_CALC_DEF_7, CALC_CALC_DEF_11
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ILI_PIPE_LENGTH (
    ILI_PIPE_LENGTH_ID   INTEGER PRIMARY KEY AUTOINCREMENT,
    ILI_INSPECTION_ID    INTEGER NOT NULL REFERENCES ILI_INSPECTION(ILI_INSPECTION_ID),
    WELD_NUMBER          TEXT,
    ABSOLUTE_ODOMETER    REAL,
    DL_TUBE              REAL,           -- длина трубы (м)
    NOMINAL_WALL_THICKNESS REAL,
    -- Координаты (заполняются после расчёта)
    STATION_FROM         REAL,
    DISTANCE_FROM        REAL,
    STATION_TO           REAL,
    DISTANCE_TO          REAL,
    X                    REAL,
    Y                    REAL,
    Z                    REAL,
    -- Ссылка на EVENT_RANGE
    EVENT_RANGE_ID       INTEGER REFERENCES EVENT_RANGE(EVENT_RANGE_ID),
    UNIQUE (ILI_INSPECTION_ID, WELD_NUMBER)
);

CREATE INDEX IF NOT EXISTS idx_ili_pipe_length_inspection
    ON ILI_PIPE_LENGTH(ILI_INSPECTION_ID, ABSOLUTE_ODOMETER);

-- -----------------------------------------------------------------------------
-- SRV_DISTRICT_G — ЛПУ (линейно-производственные управления)
-- Используется в IliImportXml.setSrvDistrictId (через gdal point-in-polygon).
-- В SQLite хранится как текстовый WKT/WKB или просто bbox для упрощённой проверки.
-- Для полноценной геометрии используется gdal в коде.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS SRV_DISTRICT_G (
    GID              INTEGER PRIMARY KEY AUTOINCREMENT,
    NAME             TEXT,
    WKB_GEOMETRY     BLOB,   -- бинарный WKB для gdal
    BBOX_MIN_X       REAL,   -- bounding box для быстрой фильтрации
    BBOX_MIN_Y       REAL,
    BBOX_MAX_X       REAL,
    BBOX_MAX_Y       REAL
);
