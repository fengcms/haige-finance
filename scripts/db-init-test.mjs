import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { migrateSql } from '../dist/main/db/migrations.js';
import { defaultAccounts, defaultCategories, seedDefaultData } from '../dist/main/db/seedData.js';

const dataDir = path.join(process.cwd(), 'data');
const databasePath = path.join(dataDir, 'haige-finance.sqlite');

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(migrateSql);

const now = Date.now();
db.prepare(
  `
    INSERT INTO app_meta (key, value, created_at, updated_at)
    VALUES (@key, @value, @createdAt, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `,
).run({
  key: 'db_init_test',
  value: 'ok',
  createdAt: now,
  updatedAt: now,
});

seedDefaultData(db, now);

const result = db.prepare('SELECT value FROM app_meta WHERE key = ?').get('db_init_test');

if (result?.value !== 'ok') {
  throw new Error('SQLite init test failed');
}

const requiredTables = [
  'app_meta',
  'customers',
  'projects',
  'contracts',
  'employees',
  'accounts',
  'categories',
  'transactions',
  'operation_logs',
];

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
  .all()
  .map((row) => row.name);

for (const table of requiredTables) {
  if (!tables.includes(table)) {
    throw new Error(`Missing required table: ${table}`);
  }
}

function getColumn(table, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  return columns.find((column) => column.name === columnName);
}

function assertColumn(table, columnName) {
  const column = getColumn(table, columnName);
  if (!column) {
    throw new Error(`Missing column: ${table}.${columnName}`);
  }

  return column;
}

for (const [table, columnName] of [
  ['contracts', 'amount_cents'],
  ['accounts', 'opening_balance_cents'],
  ['transactions', 'amount_cents'],
]) {
  const column = assertColumn(table, columnName);
  if (!String(column.type).toUpperCase().includes('INTEGER')) {
    throw new Error(`Money column must be INTEGER: ${table}.${columnName}`);
  }
}

for (const columnName of ['status', 'voided_at', 'void_reason', 'deleted_at']) {
  assertColumn('transactions', columnName);
}

const accountCount = defaultAccounts.filter((account) =>
  db.prepare('SELECT 1 AS ok FROM accounts WHERE id = ?').get(account.id),
).length;

if (accountCount !== defaultAccounts.length) {
  throw new Error(`Default accounts seed failed: expected ${defaultAccounts.length}, got ${accountCount}`);
}

const categoryCount = defaultCategories.filter((category) =>
  db.prepare('SELECT 1 AS ok FROM categories WHERE id = ?').get(category.id),
).length;

if (categoryCount !== defaultCategories.length) {
  throw new Error(`Default categories seed failed: expected ${defaultCategories.length}, got ${categoryCount}`);
}

db.close();

console.log(`SQLite init test passed: ${databasePath}`);
console.log(`Verified tables: ${requiredTables.join(', ')}`);
console.log(`Verified default accounts: ${defaultAccounts.length}`);
console.log(`Verified default categories: ${defaultCategories.length}`);
