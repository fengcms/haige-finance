import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema.js';

let sqlite: Database.Database | null = null;

function resolveDatabasePath(): string {
  const baseDir = app.isPackaged
    ? app.getPath('userData')
    : path.join(process.cwd(), 'data');

  fs.mkdirSync(baseDir, { recursive: true });
  return path.join(baseDir, 'haige-finance.sqlite');
}

export function getDatabasePath(): string {
  return resolveDatabasePath();
}

export function getSqlite() {
  if (!sqlite) {
    sqlite = new Database(resolveDatabasePath());
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
  }

  return sqlite;
}

export function getDb() {
  return drizzle(getSqlite(), { schema });
}

export function closeDatabase() {
  sqlite?.close();
  sqlite = null;
}
