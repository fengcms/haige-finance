import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'haige-project-finance-smoke-'));
process.chdir(tempRoot);

const { migrateDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/migrate.js')).href);
const { seedDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/seed.js')).href);
const { closeDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/index.js')).href);
const { MasterDataService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/masterDataService.js')).href);
const { TransactionService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/transactionService.js')).href);
const { ProjectStatsService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/projectStatsService.js')).href);

migrateDatabase();
seedDatabase();

const masterData = new MasterDataService();
const transactions = new TransactionService();
const projectStats = new ProjectStatsService();

const suffix = Date.now();
const customer = masterData.create('customers', {
  name: `项目收支测试客户-${suffix}`,
  phone: '13800000000',
  status: 'signed',
});
const project = masterData.create('projects', {
  customerId: customer.id,
  name: `项目收支测试项目-${suffix}`,
  status: 'in_progress',
});
masterData.create('contracts', {
  customerId: customer.id,
  projectId: project.id,
  name: `项目收支测试合同-${suffix}`,
  amountCents: 300000,
  status: 'signed',
});
const employee = masterData.create('employees', {
  name: `项目收支测试员工-${suffix}`,
  status: 'active',
});

transactions.create({
  direction: 'income',
  amountCents: 120000,
  occurredDate: '2026-07-02',
  accountId: 'account_cash',
  categoryId: 'category_customer_payment',
  fundType: 'customer_payment',
  isCompanyFund: true,
  affectsReceivable: true,
  affectsProjectProfit: false,
  customerId: customer.id,
  projectId: project.id,
  remark: '项目收款 smoke test',
});

transactions.create({
  direction: 'expense',
  amountCents: 30000,
  occurredDate: '2026-07-02',
  accountId: 'account_cash',
  categoryId: 'category_project_material',
  fundType: 'project_expense',
  isCompanyFund: true,
  affectsReceivable: false,
  affectsProjectProfit: true,
  customerId: customer.id,
  projectId: project.id,
  remark: '材料支出 smoke test',
});

transactions.create({
  direction: 'expense',
  amountCents: 20000,
  occurredDate: '2026-07-02',
  accountId: 'account_cash',
  categoryId: 'category_salary',
  fundType: 'salary',
  isCompanyFund: true,
  affectsReceivable: false,
  affectsProjectProfit: true,
  customerId: customer.id,
  projectId: project.id,
  employeeId: employee.id,
  remark: '人工支出 smoke test',
});

const detail = projectStats.detail(project.id);

if (detail.stats.contractAmountCents !== 300000) {
  throw new Error(`Contract amount should be 300000, got ${detail.stats.contractAmountCents}`);
}

if (detail.stats.receivedCents !== 120000) {
  throw new Error(`Received amount should be 120000, got ${detail.stats.receivedCents}`);
}

if (detail.stats.expenseCents !== 50000) {
  throw new Error(`Project expense should be 50000, got ${detail.stats.expenseCents}`);
}

if (detail.stats.receivableCents !== 180000) {
  throw new Error(`Receivable should be 180000, got ${detail.stats.receivableCents}`);
}

if (detail.stats.expectedProfitCents !== 250000) {
  throw new Error(`Expected profit should be 250000, got ${detail.stats.expectedProfitCents}`);
}

closeDatabase();

console.log('Project finance smoke test passed');
console.log(`Verified project receipt and project expenses in temp directory: ${tempRoot}`);
