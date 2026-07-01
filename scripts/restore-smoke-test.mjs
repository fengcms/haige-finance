import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'haige-restore-smoke-'));
process.chdir(tempRoot);

const { BackupService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/backup/backupService.js')).href);
const { getDatabasePath, getSqlite, closeDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/index.js')).href);
const { migrateDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/migrate.js')).href);
const { seedDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/seed.js')).href);
const { migrateSql } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/migrations.js')).href);
const { seedDefaultData } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/seedData.js')).href);

function insertCustomer(db, id, name) {
  const now = Date.now();
  db.prepare("INSERT INTO customers (id, name, status, created_at, updated_at) VALUES (@id, @name, 'signed', @now, @now)").run({
    id,
    name,
    now,
  });
}

function hasCustomer(databasePath, id) {
  const db = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    return Boolean(db.prepare('SELECT 1 AS ok FROM customers WHERE id = ?').get(id));
  } finally {
    db.close();
  }
}

migrateDatabase();
seedDatabase();
insertCustomer(getSqlite(), 'restore_smoke_current', '恢复测试当前客户');

const sourcePath = path.join(tempRoot, 'restore-source.sqlite');
const sourceDb = new Database(sourcePath);
sourceDb.pragma('journal_mode = WAL');
sourceDb.pragma('foreign_keys = ON');
sourceDb.exec(migrateSql);
seedDefaultData(sourceDb);
insertCustomer(sourceDb, 'restore_smoke_source', '恢复测试来源客户');
sourceDb.close();

const service = new BackupService();
const databasePath = getDatabasePath();

await service.restoreFromFile(sourcePath);
closeDatabase();

if (!hasCustomer(databasePath, 'restore_smoke_source')) {
  throw new Error('Restore smoke test failed: source customer not found after restore');
}

if (hasCustomer(databasePath, 'restore_smoke_current')) {
  throw new Error('Restore smoke test failed: current customer should have been replaced');
}

await service.undoLastRestore();
closeDatabase();

if (!hasCustomer(databasePath, 'restore_smoke_current')) {
  throw new Error('Restore smoke test failed: current customer not found after undo');
}

if (hasCustomer(databasePath, 'restore_smoke_source')) {
  throw new Error('Restore smoke test failed: source customer should be absent after undo');
}

console.log('Restore smoke test passed');
console.log(`Verified restore and undo in temp directory: ${tempRoot}`);
