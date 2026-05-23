/**
 * Инициализация и миграция SQLite-схемы для Electron-приложения ВТД.
 * ESM-модуль.
 *
 * Использование:
 *   import { runMigrations } from './db/migrate.js';
 *   await runMigrations(db);   // db — экземпляр better-sqlite3
 *
 * Или как CLI-скрипт:
 *   node electron-src/db/migrate.js [path/to/database.sqlite]
 *
 * Логика:
 *   - Создаёт таблицу _migrations для отслеживания применённых миграций.
 *   - Применяет schema.sql как миграцию '001_initial_schema' (идемпотентно).
 *   - Каждая последующая миграция добавляется как отдельная запись.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import BetterSqlite3 from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Список миграций ──────────────────────────────────────────────────────────
// Каждая запись: { id: string, file: string }
// id — уникальный идентификатор (применяется один раз)
// file — путь к SQL-файлу относительно __dirname
const MIGRATIONS = [
    {
        id: '001_initial_schema',
        file: path.join(__dirname, 'schema.sql'),
        description: 'Начальная схема: ROUTE, STATION_POINT, ILI_INSPECTION, ILI_DATA, ...',
    },
];

// ─── Публичный API ────────────────────────────────────────────────────────────

/**
 * Применяет все непримененные миграции к переданному экземпляру БД.
 * Идемпотентно: повторный вызов не применяет уже выполненные миграции.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {string[]} список применённых миграций
 */
export function runMigrations(db) {
    ensureMigrationsTable(db);

    const applied = [];

    for (const migration of MIGRATIONS) {
        if (isMigrationApplied(db, migration.id)) {
            console.log(`[migrate] Пропускаю (уже применена): ${migration.id}`);
            continue;
        }

        console.log(`[migrate] Применяю: ${migration.id} — ${migration.description}`);

        const sql = fs.readFileSync(migration.file, 'utf8');

        // Выполняем весь SQL-файл в одной транзакции
        const runMigration = db.transaction(() => {
            db.exec(sql);
            db.prepare(
                `INSERT INTO _migrations (id, description, applied_at)
                 VALUES (?, ?, datetime('now'))`
            ).run(migration.id, migration.description || '');
        });

        try {
            runMigration();
            applied.push(migration.id);
            console.log(`[migrate] Применена: ${migration.id}`);
        } catch (err) {
            console.error(`[migrate] Ошибка при применении ${migration.id}:`, err.message);
            throw err;
        }
    }

    if (applied.length === 0) {
        console.log('[migrate] Все миграции уже применены, схема актуальна.');
    } else {
        console.log(`[migrate] Применено миграций: ${applied.length}`);
    }

    return applied;
}

/**
 * Инициализирует БД: открывает файл и применяет миграции.
 * Удобная обёртка для использования в main-процессе Electron.
 *
 * @param {string} dbPath — путь к файлу SQLite
 * @returns {import('better-sqlite3').Database}
 */
export function initDatabase(dbPath) {
    console.log(`[migrate] Открываю БД: ${dbPath}`);
    const db = new BetterSqlite3(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    return db;
}

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function ensureMigrationsTable(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS _migrations (
            id          TEXT PRIMARY KEY,
            description TEXT,
            applied_at  TEXT NOT NULL
        )
    `);
}

function isMigrationApplied(db, id) {
    const row = db.prepare('SELECT 1 FROM _migrations WHERE id = ?').get(id);
    return !!row;
}

// ─── CLI-режим ────────────────────────────────────────────────────────────────
// Запуск: node electron-src/db/migrate.js [path/to/db.sqlite]

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    const dbPath = process.argv[2] || path.join(__dirname, '..', '..', 'data', 'ute.sqlite');

    // Создаём директорию если не существует
    const dbDir = dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`[migrate] Создана директория: ${dbDir}`);
    }

    try {
        const db = initDatabase(dbPath);
        db.close();
        console.log('[migrate] Готово.');
        process.exit(0);
    } catch (err) {
        console.error('[migrate] Критическая ошибка:', err.message);
        process.exit(1);
    }
}
