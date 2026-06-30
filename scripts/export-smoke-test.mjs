import Database from 'better-sqlite3';
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import { migrateSql } from '../dist/main/db/migrations.js';
import { seedDefaultData } from '../dist/main/db/seedData.js';

const dataDir = path.join(process.cwd(), 'data');
const exportDir = path.join(dataDir, 'exports');
const databasePath = path.join(dataDir, 'haige-finance.sqlite');
const exportPath = path.join(exportDir, `haige-finance-export-smoke-${Date.now()}.xlsx`);

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(exportDir, { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(migrateSql);
seedDefaultData(db);

const workbook = new ExcelJS.Workbook();
const customers = db.prepare('SELECT name, phone, community FROM customers WHERE deleted_at IS NULL ORDER BY created_at DESC').all();
const accounts = db.prepare('SELECT name, ROUND(opening_balance_cents / 100.0, 2) AS opening_balance_yuan FROM accounts WHERE deleted_at IS NULL ORDER BY created_at ASC').all();

const customerSheet = workbook.addWorksheet('客户');
customerSheet.columns = [
  { header: '客户名称', key: 'name', width: 20 },
  { header: '电话', key: 'phone', width: 16 },
  { header: '小区', key: 'community', width: 18 },
];
customerSheet.addRows(customers);

const accountSheet = workbook.addWorksheet('账户余额表');
accountSheet.columns = [
  { header: '账户', key: 'name', width: 20 },
  { header: '期初余额(元)', key: 'opening_balance_yuan', width: 16 },
];
accountSheet.addRows(accounts);

await workbook.xlsx.writeFile(exportPath);
db.close();

if (!fs.existsSync(exportPath)) {
  throw new Error('Excel file was not created');
}

const verifyWorkbook = new ExcelJS.Workbook();
await verifyWorkbook.xlsx.readFile(exportPath);
const sheetNames = verifyWorkbook.worksheets.map((sheet) => sheet.name);

for (const sheetName of ['客户', '账户余额表']) {
  if (!sheetNames.includes(sheetName)) {
    throw new Error(`Missing sheet: ${sheetName}`);
  }
}

console.log('Export smoke test passed');
console.log(`Created Excel file: ${exportPath}`);
