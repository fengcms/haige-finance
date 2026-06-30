import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { migrateSql } from '../dist/main/db/migrations.js';
import { seedDefaultData } from '../dist/main/db/seedData.js';

const dataDir = path.join(process.cwd(), 'data');
const databasePath = path.join(dataDir, 'haige-finance.sqlite');
const backupDir = path.join(dataDir, 'backups');
const backupPath = path.join(backupDir, `haige-finance-backup-smoke-${Date.now()}.sqlite`);

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(backupDir, { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(migrateSql);
seedDefaultData(db);
await db.backup(backupPath);
db.close();

if (!fs.existsSync(backupPath)) {
  throw new Error('Backup file was not created');
}

const backupStat = fs.statSync(backupPath);
if (backupStat.size <= 0) {
  throw new Error('Backup file is empty');
}

console.log('Backup smoke test passed');
console.log(`Created backup file: ${backupPath}`);
