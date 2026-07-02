import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'haige-project-expense-smoke-'));
process.chdir(tempRoot);

const { migrateDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/migrate.js')).href);
const { seedDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/seed.js')).href);
const { closeDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/index.js')).href);
const { MasterDataService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/masterDataService.js')).href);
const { ProjectExpenseService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/projectExpenseService.js')).href);
const { ProjectStatsService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/projectStatsService.js')).href);
const { TransactionRepository } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/repositories/transactionRepository.js')).href);

migrateDatabase();
seedDatabase();

const masterData = new MasterDataService();
const projectExpenses = new ProjectExpenseService();
const projectStats = new ProjectStatsService();
const transactionRepository = new TransactionRepository();

const suffix = Date.now();
const customer = masterData.create('customers', {
  name: `项目费用单测试客户-${suffix}`,
  phone: '13800000000',
  status: 'signed',
});
const project = masterData.create('projects', {
  customerId: customer.id,
  name: `项目费用单测试项目-${suffix}`,
  status: 'in_progress',
});
masterData.create('contracts', {
  customerId: customer.id,
  projectId: project.id,
  name: `项目费用单测试合同-${suffix}`,
  amountCents: 500000,
  status: 'signed',
});
const supplier = masterData.create('suppliers', {
  name: `项目费用单测试供应商-${suffix}`,
  type: 'material',
  status: 'active',
});

const order = projectExpenses.createOrder({
  projectId: project.id,
  supplierId: supplier.id,
  expenseType: 'material',
  occurredDate: '2026-07-02',
  accountId: 'account_cash',
  remark: '项目费用单 smoke test',
});

projectExpenses.createItemsBatch({
  orderId: order.id,
  items: [
    {
      name: '板材',
      spec: '18mm',
      quantity: 2,
      unit: '张',
      unitPriceCents: 50000,
      remark: '主材',
    },
    {
      name: '五金',
      quantity: 1,
      unit: '批',
      unitPriceCents: 20000,
    },
  ],
});

let detail = projectExpenses.getDetail(order.id);

if (detail.order.status !== 'draft') {
  throw new Error(`New project expense order should be draft, got ${detail.order.status}`);
}

if (detail.order.totalAmountCents !== 120000) {
  throw new Error(`Project expense order total should be 120000, got ${detail.order.totalAmountCents}`);
}

if (detail.items.length !== 2) {
  throw new Error(`Project expense order should have 2 items, got ${detail.items.length}`);
}

const confirmed = projectExpenses.confirmOrder({ id: order.id, accountId: 'account_cash' });

if (confirmed.status !== 'confirmed') {
  throw new Error(`Confirmed project expense order status should be confirmed, got ${confirmed.status}`);
}

if (!confirmed.paidTransactionId) {
  throw new Error('Confirmed project expense order should have paidTransactionId');
}

const transaction = transactionRepository.findById(confirmed.paidTransactionId);

if (!transaction) {
  throw new Error('Linked transaction should exist after confirming project expense order');
}

if (transaction.status !== 'normal') {
  throw new Error(`Linked transaction should be normal, got ${transaction.status}`);
}

if (transaction.amountCents !== 120000 || transaction.direction !== 'expense') {
  throw new Error(`Linked transaction should be a 120000 expense, got ${transaction.direction} ${transaction.amountCents}`);
}

if (!transaction.affectsProjectProfit || transaction.affectsReceivable) {
  throw new Error('Linked transaction project accounting flags are incorrect');
}

let stats = projectStats.detail(project.id).stats;

if (stats.expenseCents !== 120000) {
  throw new Error(`Project expense stats should be 120000 after confirm, got ${stats.expenseCents}`);
}

if (stats.expectedProfitCents !== 380000) {
  throw new Error(`Expected profit should be 380000 after confirm, got ${stats.expectedProfitCents}`);
}

const voided = projectExpenses.voidOrder(order.id, 'smoke test 作废');

if (voided.status !== 'voided') {
  throw new Error(`Voided project expense order status should be voided, got ${voided.status}`);
}

const voidedTransaction = transactionRepository.findById(confirmed.paidTransactionId);

if (voidedTransaction?.status !== 'voided') {
  throw new Error(`Linked transaction should be voided, got ${voidedTransaction?.status}`);
}

stats = projectStats.detail(project.id).stats;

if (stats.expenseCents !== 0) {
  throw new Error(`Project expense stats should return to 0 after void, got ${stats.expenseCents}`);
}

detail = projectExpenses.getDetail(order.id);

if (detail.logs.length < 4) {
  throw new Error(`Project expense logs should include create/item/confirm/void actions, got ${detail.logs.length}`);
}

closeDatabase();

console.log('Project expense smoke test passed');
console.log(`Verified project expense order lifecycle in temp directory: ${tempRoot}`);
