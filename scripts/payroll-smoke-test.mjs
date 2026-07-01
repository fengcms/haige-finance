import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'haige-payroll-smoke-'));
process.chdir(tempRoot);

const { migrateDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/migrate.js')).href);
const { seedDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/seed.js')).href);
const { getDatabasePath, closeDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/index.js')).href);
const { PayrollService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/payrollService.js')).href);

migrateDatabase();
seedDatabase();

const now = Date.now();
const db = new Database(getDatabasePath());
const insertEmployee = db.prepare(
  `
    INSERT INTO employees (id, name, phone, position, entry_date, status, remark, created_at, updated_at, deleted_at)
    VALUES (@id, @name, @phone, @position, @entryDate, @status, @remark, @createdAt, @updatedAt, NULL)
  `,
);
insertEmployee.run({
  id: 'employee-payroll-smoke',
  name: '工资测试员工',
  phone: '13800000000',
  position: '木工',
  entryDate: '2026-01-01',
  status: 'active',
  remark: null,
  createdAt: now,
  updatedAt: now,
});
insertEmployee.run({
  id: 'employee-payroll-batch-1',
  name: '批量工资员工一',
  phone: '13800000001',
  position: '油工',
  entryDate: '2026-01-01',
  status: 'active',
  remark: null,
  createdAt: now,
  updatedAt: now,
});
insertEmployee.run({
  id: 'employee-payroll-batch-2',
  name: '批量工资员工二',
  phone: '13800000002',
  position: '瓦工',
  entryDate: '2026-01-01',
  status: 'active',
  remark: null,
  createdAt: now,
  updatedAt: now,
});
db.close();

const service = new PayrollService();
const batchEntryBatch = service.createBatch({
  month: '2026-07',
  name: '2026-07 批量工资',
});

const batchItems = service.createItemsBatch({
  batchId: batchEntryBatch.id,
  items: [
    {
      employeeId: 'employee-payroll-batch-1',
      baseSalaryCents: 80000,
      attendanceBonusCents: 5000,
      phoneAllowanceCents: 2000,
      bonusCents: 3000,
      commissionCents: 10000,
      deductionCents: 5000,
      socialInsuranceCents: 1000,
      housingFundCents: 2000,
      taxCents: 300,
    },
    {
      employeeId: 'employee-payroll-batch-2',
      baseSalaryCents: 90000,
      attendanceBonusCents: 0,
      phoneAllowanceCents: 3000,
      bonusCents: 7000,
      commissionCents: 0,
      deductionCents: 10000,
      socialInsuranceCents: 2000,
      housingFundCents: 3000,
      taxCents: 400,
    },
  ],
});

if (batchItems.length !== 2) {
  throw new Error(`Batch payroll create should return 2 items, got ${batchItems.length}`);
}

let batchEntryDetail = service.getDetail(batchEntryBatch.id);
if (batchEntryDetail.batch.totalGrossCents !== 200000 || batchEntryDetail.batch.totalDeductionCents !== 15000 || batchEntryDetail.batch.totalNetCents !== 185000) {
  throw new Error('Batch payroll entry totals were not recalculated correctly');
}

try {
  service.createItemsBatch({
    batchId: batchEntryBatch.id,
    items: [
      {
        employeeId: 'employee-payroll-batch-1',
        baseSalaryCents: 100,
      },
    ],
  });
  throw new Error('Duplicate payroll batch employee should fail');
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes('已存在工资明细')) {
    throw error;
  }
}

const batch = service.createBatch({
  month: '2026-07',
  name: '2026-07 第一周工资',
  payDate: '2026-07-07',
  remark: '工资 smoke test',
});

const item = service.createItem({
  batchId: batch.id,
  employeeId: 'employee-payroll-smoke',
  baseSalaryCents: 100000,
  attendanceBonusCents: 10000,
  phoneAllowanceCents: 5000,
  bonusCents: 20000,
  commissionCents: 30000,
  deductionCents: 15000,
  socialInsuranceCents: 8000,
  housingFundCents: 6000,
  taxCents: 3000,
});

if (item.grossSalaryCents !== 165000) {
  throw new Error(`Gross salary should be 165000, got ${item.grossSalaryCents}`);
}

if (item.netSalaryCents !== 150000) {
  throw new Error(`Net salary should be 150000, got ${item.netSalaryCents}`);
}

let detail = service.getDetail(batch.id);
if (detail.batch.totalGrossCents !== 165000 || detail.batch.totalDeductionCents !== 15000 || detail.batch.totalNetCents !== 150000) {
  throw new Error('Payroll batch totals were not recalculated correctly');
}

const updatedItem = service.updateItem(item.id, {
  bonusCents: 25000,
  socialInsuranceCents: 12000,
  taxCents: 9000,
});

if (updatedItem.grossSalaryCents !== 170000 || updatedItem.netSalaryCents !== 155000) {
  throw new Error('Payroll item update did not recalculate gross/net salary correctly');
}

detail = service.getDetail(batch.id);
if (detail.batch.totalGrossCents !== 170000 || detail.batch.totalNetCents !== 155000) {
  throw new Error('Payroll batch totals were not recalculated after item update');
}

const confirmed = service.confirmBatch(batch.id);
if (confirmed.status !== 'confirmed') {
  throw new Error(`Payroll batch should be confirmed, got ${confirmed.status}`);
}

const cancelled = service.cancelConfirmBatch(batch.id);
if (cancelled.status !== 'draft') {
  throw new Error(`Payroll batch should return to draft, got ${cancelled.status}`);
}

service.confirmBatch(batch.id);
const paid = service.payBatch({
  id: batch.id,
  accountId: 'account_cash',
  payDate: '2026-07-07',
});

if (paid.status !== 'paid' || !paid.paidTransactionId) {
  throw new Error('Payroll batch should be paid with a linked transaction');
}

service.updateItem(item.id, {
  commissionCents: 35000,
});

detail = service.getDetail(batch.id);
if (detail.batch.totalNetCents !== 160000) {
  throw new Error(`Paid payroll adjustment should update batch total, got ${detail.batch.totalNetCents}`);
}

const transactionAfterAdjustDb = new Database(getDatabasePath(), { readonly: true });
const transactionAfterAdjust = transactionAfterAdjustDb
  .prepare('SELECT amount_cents, status, affects_project_profit FROM transactions WHERE id = ?')
  .get(paid.paidTransactionId);
transactionAfterAdjustDb.close();

if (transactionAfterAdjust.amount_cents !== 160000 || transactionAfterAdjust.status !== 'normal' || transactionAfterAdjust.affects_project_profit !== 0) {
  throw new Error('Paid payroll adjustment should sync normal non-project-profit transaction amount');
}

const voided = service.voidBatch(batch.id, '工资测试作废');
if (voided.status !== 'voided') {
  throw new Error(`Payroll batch should be voided, got ${voided.status}`);
}

const transactionAfterVoidDb = new Database(getDatabasePath(), { readonly: true });
const transactionAfterVoid = transactionAfterVoidDb
  .prepare('SELECT status, void_reason FROM transactions WHERE id = ?')
  .get(paid.paidTransactionId);
transactionAfterVoidDb.close();

if (transactionAfterVoid.status !== 'voided' || !String(transactionAfterVoid.void_reason).includes('工资测试作废')) {
  throw new Error('Voiding paid payroll should void linked transaction');
}

detail = service.getDetail(batch.id);
const actions = detail.logs.map((log) => log.action);
for (const action of ['create', 'update', 'confirm', 'cancel_confirm', 'pay', 'adjust', 'void']) {
  if (!actions.includes(action)) {
    throw new Error(`Missing payroll operation log action: ${action}`);
  }
}

closeDatabase();

console.log('Payroll smoke test passed');
console.log(`Verified payroll batch, item calculation, totals, confirm/cancel and logs in temp directory: ${tempRoot}`);
