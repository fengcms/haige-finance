import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import * as schema from './schema.js';

let sqlite: Database.Database | null = null;
const require = createRequire(import.meta.url);

function resolveDatabasePath(): string {
  const electronApp = getElectronApp();
  const baseDir = electronApp?.isPackaged
    ? electronApp.getPath('userData')
    : path.join(process.cwd(), 'data');

  fs.mkdirSync(baseDir, { recursive: true });
  return path.join(baseDir, 'haige-finance.sqlite');
}

function getElectronApp(): { isPackaged: boolean; getPath: (name: 'userData') => string } | null {
  try {
    const electron = require('electron') as unknown;
    if (typeof electron === 'object' && electron && 'app' in electron) {
      return (electron as { app: { isPackaged: boolean; getPath: (name: 'userData') => string } }).app;
    }
  } catch {
    return null;
  }

  return null;
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
