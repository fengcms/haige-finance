import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { migrateSql } from '../dist/main/db/migrations.js';
import { defaultDictionaryItems } from '../dist/shared/constants/dictionaries.js';
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
  'dictionary_items',
  'customers',
  'projects',
  'contracts',
  'contract_attachments',
  'employees',
  'accounts',
  'categories',
  'transactions',
  'payroll_batches',
  'payroll_items',
  'payroll_operation_logs',
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
  ['contract_attachments', 'sort_order'],
  ['accounts', 'opening_balance_cents'],
  ['transactions', 'amount_cents'],
  ['payroll_batches', 'total_gross_cents'],
  ['payroll_batches', 'total_deduction_cents'],
  ['payroll_batches', 'total_net_cents'],
  ['payroll_items', 'base_salary_cents'],
  ['payroll_items', 'attendance_bonus_cents'],
  ['payroll_items', 'phone_allowance_cents'],
  ['payroll_items', 'bonus_cents'],
  ['payroll_items', 'commission_cents'],
  ['payroll_items', 'deduction_cents'],
  ['payroll_items', 'social_insurance_cents'],
  ['payroll_items', 'housing_fund_cents'],
  ['payroll_items', 'tax_cents'],
  ['payroll_items', 'gross_salary_cents'],
  ['payroll_items', 'net_salary_cents'],
]) {
  const column = assertColumn(table, columnName);
  if (!String(column.type).toUpperCase().includes('INTEGER')) {
    throw new Error(`Money column must be INTEGER: ${table}.${columnName}`);
  }
}

for (const columnName of ['status', 'voided_at', 'void_reason', 'deleted_at']) {
  assertColumn('transactions', columnName);
}

for (const columnName of ['contract_id', 'file_type', 'source_type', 'stored_path', 'deleted_at']) {
  assertColumn('contract_attachments', columnName);
}

for (const columnName of ['dict_type', 'code', 'name', 'sort_order', 'status', 'is_system', 'deleted_at']) {
  assertColumn('dictionary_items', columnName);
}

for (const columnName of ['month', 'name', 'pay_date', 'account_id', 'status', 'paid_transaction_id', 'voided_at', 'void_reason', 'deleted_at']) {
  assertColumn('payroll_batches', columnName);
}

for (const columnName of ['batch_id', 'employee_id', 'remark', 'deleted_at']) {
  assertColumn('payroll_items', columnName);
}

for (const columnName of ['batch_id', 'item_id', 'action', 'detail', 'created_at']) {
  assertColumn('payroll_operation_logs', columnName);
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

const dictionaryCount = defaultDictionaryItems.filter((item) =>
  db.prepare('SELECT 1 AS ok FROM dictionary_items WHERE dict_type = ? AND code = ?').get(item.dictType, item.code),
).length;

if (dictionaryCount !== defaultDictionaryItems.length) {
  throw new Error(`Default dictionary seed failed: expected ${defaultDictionaryItems.length}, got ${dictionaryCount}`);
}

db.close();

console.log(`SQLite init test passed: ${databasePath}`);
console.log(`Verified tables: ${requiredTables.join(', ')}`);
console.log(`Verified default accounts: ${defaultAccounts.length}`);
console.log(`Verified default categories: ${defaultCategories.length}`);
console.log(`Verified default dictionary items: ${defaultDictionaryItems.length}`);
