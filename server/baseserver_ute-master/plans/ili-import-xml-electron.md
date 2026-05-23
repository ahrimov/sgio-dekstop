# План адаптации `ili-import-xml` для Electron-приложения

## 1. Как работает текущий эндпоинт (сводка)

### Входные данные
HTTP POST `/api/ute/ili-import-xml` с телом:
```json
{
  "input": "<input process_id=\"...\" xml_file_name=\"path/to/file.xml\" pipe=\"1305491\" km_start=\"1430.6\" km_end=\"1553\" date=\"25.11.2020\" format=\"xml\" company=\"UNKNOWN\" do_calc_inspection=\"true\" do_calc_cluster=\"true\" do_calc_pressure=\"true\" do_calc_sto=\"true\" do_calc_sto_for_ehz=\"true\" ps_idx=\"false\" />"
}
```

### Полный pipeline обработки

```
HTTP Request
  └─ uteBlockingValidation
  └─ utePrepare → PrepareService.parseRequest()
       └─ camaro: парсит XML-строку из body.input в JSON-объект
  └─ uteValidation → ValidationService.validate()
       └─ строит uteParams: { data, do_calc_*, xmlFileName, processId }
  └─ Controller: iliImportXml()
       └─ IliImportXmlService.call(req)
            ├─ load_types:         DB ← UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_9  (SELECT справочник аномалий)
            ├─ sub_template:       parseSourceFile(xmlFileName)
            │    ├─ iconv cp1251→utf8
            │    └─ camaro: парсит DEF/PLOBJ/WLD из XML
            ├─ check_anomaly_types: IliImportXml.checkAnomalyTypes()
            ├─ set_weld_nums:       IliImportXml.setWeldNums()
            ├─ set_srv_district_id: IliImportXml.setSrvDistrictId()  ← gdal + DB PODS.SRV_DISTRICT_G
            ├─ BEGIN TRANSACTION
            ├─ get_first_weld_number: IliImportXml.getFirstWeldNumber()
            ├─ create_report:      DB ← UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_7  (INSERT/UPDATE отчёт, OUT: ILI_INSPECTION_ID)
            ├─ load_ili_data:      DB ← UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_8  (INSERT дефекты построчно)
            ├─ prepare_data:       DB ← UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_1  (UPDATE ANOMALY_EXTENSION_CL)
            ├─ set_weld_nums_old:  DB ← UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_4  (UPDATE простановка швов)
            ├─ prepare_pipe_len:   DB ← UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_5  (UPDATE длины труб)
            ├─ [do_calc_inspection]
            │    ├─ get_route_id:  DB ← UTE_SEM.xml#ILI_ILI_ZIP_IMP_C_55_0  (SELECT ROUTE_ID)
            │    ├─ LinkRepersService.process()
            │    │    ├─ load_repers: DB ← UTE_SEM.xml#CALC_LINK_REPERS_1    (SELECT реперы)
            │    │    ├─ load_gp:    DB ← UTE_SEM.xml#CALC_LINK_REPERS_2    (SELECT пикеты)
            │    │    ├─ LinkRepers.process()  ← чистая математика
            │    │    └─ write_cp:  DB ← UTE_SEM.xml#CALC_LINK_REPERS_3     (INSERT контрольные точки)
            │    └─ IliInspCalcService.process()
            │         ├─ load_def:  DB ← UTE_SEM.xml#CALC_CALC_DEF_1        (SELECT дефекты с реперами)
            │         ├─ load_piket: DB ← UTE_SEM.xml#CALC_CALC_DEF_2       (SELECT пикеты)
            │         ├─ IliInspCalc.process()  ← чистая математика
            │         ├─ DB ← UTE_SEM.xml#CALC_CALC_DEF_8   (UPDATE старые EVENT_RANGE)
            │         ├─ DB ← UTE_SEM.xml#CALC_CALC_DEF_3   (INSERT дефекты с координатами)
            │         ├─ DB ← UTE_SEM.xml#CALC_CALC_DEF_5   (SELECT длины труб)
            │         ├─ DB ← UTE_SEM.xml#CALC_CALC_DEF_6   (INSERT EVENT_RANGE для ILI_PIPE_LENGTH)
            │         ├─ DB ← UTE_SEM.xml#CALC_CALC_DEF_7   (INSERT ILI_PIPE_LENGTH)
            │         ├─ DB ← UTE_SEM.xml#CALC_CALC_DEF_10  (UPDATE обнуление ссылок)
            │         ├─ DB ← UTE_SEM.xml#CALC_CALC_DEF_11  (UPDATE обнуление ссылок)
            │         ├─ DB ← UTE_SEM.xml#CALC_CALC_DEF_12  (UPDATE отчёт)
            │         └─ DB ← UTE_SEM.xml#CALC_CALC_DEF_13  (UPDATE reset_is_dirty)
            ├─ COMMIT TRANSACTION
            ├─ [do_calc_cluster]   IliClusterService.process()
            ├─ [do_calc_pressure]  IliPressureService.process()
            ├─ [do_calc_sto]       StoIliInspService.process()
            ├─ [do_calc_sto_for_ehz] StoEnzInspService.process()
            └─ delete_xml_file
```

---

## 2. Полный список файлов для переноса в Electron

### Условные обозначения
- ✅ **COPY** — копируется без изменений
- ⚠️ **ADAPT** — копируется с изменениями (описаны ниже)
- ❌ **SKIP** — не переносится, заменяется новым кодом
- 🆕 **NEW** — создаётся новый файл в Electron

---

### Группа A: Чистая бизнес-логика (копируется без изменений)

| Файл в baseserver | Файл в Electron | Статус | Примечание |
|---|---|---|---|
| `src/service/ute/ili/ili-import-xml/IliImportXml.js` | `src/services/ili-import-xml/IliImportXml.js` | ✅ COPY | Убрать только `require('../../db')` — заменить `DB.createEmptyTable()` на локальную утилиту |
| `src/service/ute/ili/ili-insp-link/LinkRepers.js` | `src/services/ili-insp-link/LinkRepers.js` | ✅ COPY | Убрать `require('../../db')` — заменить `DB.createEmptyTable()` на локальную утилиту |
| `src/service/ute/ili/ili-insp-calc/IliInspCalc.js` | `src/services/ili-insp-calc/IliInspCalc.js` | ✅ COPY | Убрать `require('../../db')` — заменить `DB.createEmptyTable()` на локальную утилиту |
| `src/utils/MathUtils.js` | `src/utils/MathUtils.js` | ✅ COPY | Нет внешних зависимостей |

> **Единственное изменение** в этих файлах: заменить `DB.createEmptyTable()` на вызов утилиты:
> ```js
> // Было:
> const DB = require('../../db');
> let resTab = DB.createEmptyTable();
> // Станет:
> const { createEmptyTable } = require('../../utils/tableUtils');
> let resTab = createEmptyTable();
> ```

---

### Группа B: Файлы, требующие адаптации

#### `IliImportXmlService.js`
| Файл в baseserver | Файл в Electron | Статус |
|---|---|---|
| `src/service/ute/ili/ili-import-xml/IliImportXmlService.js` | `src/services/ili-import-xml/IliImportXmlService.js` | ⚠️ ADAPT |

**Изменения:**

1. **Убрать Express/HTTP зависимости** — метод `call(req)` принимает `req.uteParams`. В Electron заменить на `call(params)`.

2. **Заменить `iconv` (shell) → `iconv-lite`**:
```js
// Было:
static async changeEncoding(fileName, from, to){
    let rewritingFileName = fileName + '~';
    fs.renameSync(fileName, rewritingFileName);
    let command = `iconv -f ${from} -t ${to} "${rewritingFileName}" -o "${fileName}"`;
    await exec(command);
    fs.unlink(rewritingFileName, ...);
}
// Станет:
static changeEncoding(fileName, from, to){
    const iconv = require('iconv-lite');
    const buf = fs.readFileSync(fileName);
    const str = iconv.decode(buf, from);
    fs.writeFileSync(fileName, str, 'utf8');
}
```

3. **Заменить `gis-core` зависимости**:
```js
// Было:
const {ErrorHandler, config, logger} = require("gis-core");
// Станет:
const log = require('electron-log');
const { ErrorHandler } = require('../../utils/errorHandler');
// config.ROOT_PATH → передавать как параметр или брать из electron-store
```

4. **Убрать `delete_xml_file`** — в Electron файл не удаляется (пользователь сам управляет файлами).

5. **Заменить `DB` на SQLite-обёртку** — все вызовы `DB.dbReader/dbCommand/dbWriter` остаются по структуре, но `DB` теперь работает с `better-sqlite3`.

---

#### `LinkRepersService.js`
| Файл в baseserver | Файл в Electron | Статус |
|---|---|---|
| `src/service/ute/ili/ili-insp-link/LinkRepersService.js` | `src/services/ili-insp-link/LinkRepersService.js` | ⚠️ ADAPT |

**Изменения:**
- Убрать метод `call(req)` (HTTP-вариант) — оставить только `process(params, transaction, connection)`
- Заменить `gis-core` на локальные утилиты
- `DB` → SQLite-обёртка

---

#### `IliInspCalcService.js`
| Файл в baseserver | Файл в Electron | Статус |
|---|---|---|
| `src/service/ute/ili/ili-insp-calc/IliInspCalcService.js` | `src/services/ili-insp-calc/IliInspCalcService.js` | ⚠️ ADAPT |

**Изменения:**
- Убрать метод `call(req)` — оставить только `process(params, transaction, connection)`
- Заменить `gis-core` на локальные утилиты
- `DB` → SQLite-обёртка

---

#### `IliImportXml.js` — метод `setSrvDistrictId`
| Метод | Статус |
|---|---|
| `setSrvDistrictId` | ⚠️ ADAPT |

**Изменения:**
- Запрос `SELECT GID, WKB_GEOMETRY FROM PODS.SRV_DISTRICT_G` → читать из локальной SQLite
- `gdal` остаётся, но требует пересборки: `npx electron-rebuild -f -w gdal`
- `BufProcessor` — нужно проверить его зависимости (см. ниже)

---

#### `src/utils/IOUtils.js`
| Файл в baseserver | Файл в Electron | Статус |
|---|---|---|
| `src/utils/IOUtils.js` | `src/utils/IOUtils.js` | ⚠️ ADAPT |

**Изменения:**
- Убрать `parseXml()` — в Electron SQL-запросы хранятся в `UTE_SEM.xml` и читаются так же через `camaro`. Этот метод **переиспользуется**.
- Убрать зависимость от `gis-core/config` для `config.Query_Path` → передавать путь явно или через конфиг Electron.
- `unlink()` — переиспользуется без изменений.

---

### Группа C: Новые файлы, создаваемые в Electron

| Файл | Назначение |
|---|---|
| 🆕 `src/db/index.js` | SQLite-обёртка (замена `gis-core/Database` + `src/service/ute/db/index.js`) |
| 🆕 `src/utils/tableUtils.js` | `createEmptyTable()` — вынесенная утилита |
| 🆕 `src/utils/errorHandler.js` | Простой `ErrorHandler` (замена `gis-core/ErrorHandler`) |
| 🆕 `src/ipc/importXmlHandler.js` | IPC-обработчик (замена HTTP-контроллера) |
| 🆕 `src/config/index.js` | Конфиг приложения (замена `gis-core/config`) |

---

### Группа D: Файлы, которые НЕ переносятся

| Файл | Причина |
|---|---|
| `src/app.js` | Express-сервер — не нужен |
| `src/routes/index.js` | HTTP-роутинг — не нужен |
| `src/controllers/ute.js` | HTTP-контроллер — заменяется IPC |
| `src/middlewares/utePrepare.js` | Express middleware — не нужен |
| `src/middlewares/uteValidation.js` | Express middleware — не нужен |
| `src/middlewares/uteBlockingValidation.js` | Express middleware — не нужен |
| `src/middlewares/auth.js` | Авторизация — не нужна в оффлайн |
| `src/service/ute/ili/ili-import-xml/prepareService.js` | Парсинг XML `body.input` — в Electron параметры передаются напрямую из UI |

---

## 3. SQL-запросы из UTE_SEM.xml для адаптации

Все запросы, используемые в пайплайне `ili-import-xml`, нужно адаптировать из Oracle SQL → SQLite.

### Запросы основного пайплайна

| Идентификатор | Тип | Назначение | Приоритет |
|---|---|---|---|
| `ILI_ILI_ZIP_IMP_C_55_9` | SELECT | Справочник аномалий `ILI_ANOMALY_TYPE_CL` | 🔴 Обязательный |
| `ILI_ILI_ZIP_IMP_C_55_7` | INSERT/UPDATE | Создание записи отчёта, возвращает `ILI_INSPECTION_ID` | 🔴 Обязательный |
| `ILI_ILI_ZIP_IMP_C_55_8` | INSERT | Вставка дефектов построчно | 🔴 Обязательный |
| `ILI_ILI_ZIP_IMP_C_55_1` | UPDATE | Заполнение `ANOMALY_EXTENSION_CL` | 🔴 Обязательный |
| `ILI_ILI_ZIP_IMP_C_55_4` | UPDATE | Простановка номеров швов через SQL | 🔴 Обязательный |
| `ILI_ILI_ZIP_IMP_C_55_5` | UPDATE | Расчёт длин труб | 🔴 Обязательный |
| `ILI_ILI_ZIP_IMP_C_55_0` | SELECT | Получение `ROUTE_ID` по `ILI_INSPECTION_ID` | 🔴 Обязательный |

### Запросы привязки реперов (do_calc_inspection)

| Идентификатор | Тип | Назначение | Приоритет |
|---|---|---|---|
| `ILI_ILI_INSP_PROC_C_1` | SELECT | Получение `ROUTE_ID` | 🔴 Обязательный |
| `CALC_LINK_REPERS_1` | SELECT | Загрузка реперов (REP) | 🔴 Обязательный |
| `CALC_LINK_REPERS_2` | SELECT | Загрузка пикетов (GP) | 🔴 Обязательный |
| `CALC_LINK_REPERS_3` | INSERT | Запись контрольных точек | 🔴 Обязательный |
| `CALC_LINK_REPERS_4` | UPDATE | Отвязка реперов (unlink) | 🔴 Обязательный |

### Запросы расчёта координат (do_calc_inspection)

| Идентификатор | Тип | Назначение | Приоритет |
|---|---|---|---|
| `CALC_CALC_DEF_1` | SELECT | Загрузка дефектов с реперами | 🔴 Обязательный |
| `CALC_CALC_DEF_2` | SELECT | Загрузка пикетов | 🔴 Обязательный |
| `CALC_CALC_DEF_3` | INSERT | Запись дефектов с координатами | 🔴 Обязательный |
| `CALC_CALC_DEF_5` | SELECT | Загрузка длин труб | 🔴 Обязательный |
| `CALC_CALC_DEF_6` | INSERT | EVENT_RANGE для ILI_PIPE_LENGTH | 🔴 Обязательный |
| `CALC_CALC_DEF_7` | INSERT | Обновление ILI_PIPE_LENGTH | 🔴 Обязательный |
| `CALC_CALC_DEF_8` | UPDATE | Перевод старых EVENT_RANGE в неактуальное | 🔴 Обязательный |
| `CALC_CALC_DEF_10` | UPDATE | Обнуление ссылок на старые EVENT_RANGE | 🔴 Обязательный |
| `CALC_CALC_DEF_11` | UPDATE | Обнуление ссылок (длины труб) | 🔴 Обязательный |
| `CALC_CALC_DEF_12` | UPDATE | Обновление отчёта | 🔴 Обязательный |
| `CALC_CALC_DEF_13` | UPDATE | Сброс флага is_dirty | 🔴 Обязательный |

### Запросы дочерних расчётов (опциональные)

| Идентификатор | Сервис | Приоритет |
|---|---|---|
| `ILI_CLUSTER_1`, `ILI_CLUSTER_2`, `CALC_ILI_CALC_CLUSTER_1..6`, `CALC_ILI_GEOLIZE_CLUSTER_1` | IliClusterService | 🟡 Опциональный |
| `CALC_ILI_CALC_PRESSURE_1`, `CALC_ILI_CALC_PRESSURE_2` | IliPressureService | 🟡 Опциональный |
| `CALC_ILI_INSP_CALC_STO_2..9`, `ILI_INTEGR_2_13` | StoIliInspService | 🟡 Опциональный |
| `CALC_EHZ_INSP_CALC_STO_1..9`, `ILI_INTEGR_2_13` | StoEnzInspService | 🟡 Опциональный |

---

## 4. Новый DB-слой для Electron (better-sqlite3)

Класс `DB` в Electron сохраняет **тот же интерфейс**, что и текущий `src/service/ute/db/index.js`, но внутри использует `better-sqlite3` вместо Oracle.

```js
// src/db/index.js (новый файл в Electron)
const Database = require('better-sqlite3');
const IOUtils = require('../utils/IOUtils'); // переиспользуется parseXml

class DB {
    static _db = null;

    static init(dbPath) {
        this._db = new Database(dbPath);
        this._db.pragma('journal_mode = WAL');
    }

    // Интерфейс идентичен текущему DB
    static async dbReader(descrId, descrType, params, transaction = null) { ... }
    static async dbCommand(descrId, descrType, params, transaction = null) { ... }
    static async dbWriter(descrId, descrType, dataTable, params, transaction = null) { ... }
    static async dbScalarReader(descrId, descrType, params, outputParam, transaction = null) { ... }
    static beginTransaction() { return this._db.transaction; } // better-sqlite3 синхронный
    static createEmptyTable() { return { columns: [], rows: [] }; }
}
```

> **Ключевое отличие**: `better-sqlite3` — синхронный API. Методы `dbReader/dbCommand/dbWriter` можно сделать синхронными или обернуть в `Promise.resolve()` для совместимости с существующим `async/await` кодом сервисов.

---

## 5. Структура файлов в Electron-приложении

```
electron-app/
  src/
    main/
      ipc/
        importXmlHandler.js          🆕 IPC-обработчик
      services/
        ili-import-xml/
          IliImportXmlService.js     ⚠️ ADAPT
          IliImportXml.js            ✅ COPY (мин. правки)
        ili-insp-link/
          LinkRepersService.js       ⚠️ ADAPT
          LinkRepers.js              ✅ COPY (мин. правки)
        ili-insp-calc/
          IliInspCalcService.js      ⚠️ ADAPT
          IliInspCalc.js             ✅ COPY (мин. правки)
      db/
        index.js                     🆕 SQLite-обёртка (better-sqlite3)
      utils/
        IOUtils.js                   ⚠️ ADAPT (убрать gis-core/config)
        MathUtils.js                 ✅ COPY
        tableUtils.js                🆕 createEmptyTable()
        errorHandler.js              🆕 простой ErrorHandler
      config/
        index.js                     🆕 конфиг (замена gis-core/config)
    queries/
      UTE_SEM.xml                    ⚠️ ADAPT (Oracle SQL → SQLite SQL)
    renderer/
      components/
        ImportXmlButton.vue          🆕 кнопка в UI
```

---

## 6. Поток данных в Electron

```
Renderer (UI)
  └─ Пользователь нажимает "Импортировать отчёт ВТД"
  └─ dialog.showOpenDialog() → выбор XML-файла
  └─ Пользователь заполняет параметры: pipe, km_start, km_end, date, company, флаги do_calc_*
  └─ ipcRenderer.invoke('import-xml', { filePath, params })
       └─ Main Process: importXmlHandler.js
            └─ DB.init(sqliteDbPath)
            └─ IliImportXmlService.call(params)
                 ├─ iconv-lite: перекодировка файла
                 ├─ camaro: парсинг XML ВТД
                 ├─ IliImportXml: чистая бизнес-логика
                 ├─ better-sqlite3: запись в локальную БД
                 └─ [опционально] дочерние расчёты
            └─ return { status: 200, inspectionId: ... }
  └─ Renderer: показывает результат / ошибку
```

---

## 7. Порядок выполнения работ

### Фаза 1 — Подготовка инфраструктуры
1. Создать `src/utils/tableUtils.js` с `createEmptyTable()`
2. Создать `src/utils/errorHandler.js` — простой класс ошибок
3. Создать `src/config/index.js` — конфиг с путями
4. Адаптировать `src/utils/IOUtils.js` — убрать `gis-core/config`
5. Создать `src/db/index.js` — SQLite-обёртка с тем же интерфейсом

### Фаза 2 — Перенос чистой бизнес-логики
6. Скопировать `IliImportXml.js` — заменить `DB.createEmptyTable()` → `createEmptyTable()`
7. Скопировать `LinkRepers.js` — то же самое
8. Скопировать `IliInspCalc.js` — то же самое
9. Скопировать `MathUtils.js` — без изменений

### Фаза 3 — Адаптация сервисов
10. Адаптировать `IliImportXmlService.js` — заменить `iconv`→`iconv-lite`, `gis-core`→локальные утилиты, `DB`→SQLite
11. Адаптировать `LinkRepersService.js` — убрать `call(req)`, заменить зависимости
12. Адаптировать `IliInspCalcService.js` — убрать `call(req)`, заменить зависимости

### Фаза 4 — SQL-запросы
13. Получить `UTE_SEM.xml` с сервера
14. Адаптировать все SQL-запросы из Oracle → SQLite (список в разделе 3)
15. Создать SQLite-схему БД (таблицы: `ILI_DATA`, `ILI_INSPECTION`, `ANOMALY_EXTENSION_CL`, `ILI_PIPE_LENGTH`, `EVENT_RANGE`, `SRV_DISTRICT_G` и др.)

### Фаза 5 — IPC и UI
16. Создать `importXmlHandler.js` — IPC-обработчик
17. Создать компонент кнопки в Renderer с формой параметров

---

## 8. Зависимости npm для Electron

```json
{
  "dependencies": {
    "better-sqlite3": "^9.x",
    "iconv-lite": "^0.6.x",
    "camaro": "^6.x",
    "decimal.js": "^10.x",
    "electron-log": "^5.x",
    "electron-store": "^8.x",
    "gdal": "^3.x"
  },
  "devDependencies": {
    "electron-rebuild": "^3.x"
  }
}
```

> **Важно**: `gdal` и `better-sqlite3` — нативные модули. После установки обязательно выполнить:
> ```bash
> npx electron-rebuild
> ```

---

## 9. Открытые вопросы

1. **Схема SQLite**: нужно ли воспроизводить полную Oracle-схему или упрощённую? Какие таблицы нужны минимально?
2. **Данные ЛПУ** (`SRV_DISTRICT_G`): предзагружены в SQLite или шаг `setSrvDistrictId` пропускается?
3. **Дочерние расчёты**: все ли нужны в первой версии (`cluster`, `pressure`, `sto`, `ehz`)?
4. **`gdal`**: есть ли уже опыт использования в Electron-проекте?
5. **`UTE_SEM.xml`**: файл находится вне репозитория — нужно получить его с сервера для адаптации SQL.
