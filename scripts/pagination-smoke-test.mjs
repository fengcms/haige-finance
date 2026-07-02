import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'haige-pagination-smoke-'));
process.chdir(tempRoot);

const { migrateDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/migrate.js')).href);
const { seedDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/seed.js')).href);
const { closeDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/index.js')).href);
const { MasterDataService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/masterDataService.js')).href);
const { SettingsService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/settingsService.js')).href);
const { TransactionService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/transactionService.js')).href);

migrateDatabase();
seedDatabase();

const masterData = new MasterDataService();
const settings = new SettingsService();
const transactions = new TransactionService();

if (settings.get().defaultPageSize !== 20) {
  throw new Error(`Default page size should be 20, got ${settings.get().defaultPageSize}`);
}

settings.update({ defaultPageSize: 50 });

if (settings.get().defaultPageSize !== 50) {
  throw new Error(`Updated page size should be 50, got ${settings.get().defaultPageSize}`);
}

const suffix = Date.now();
const customerIds = [];

for (let index = 0; index < 5; index += 1) {
  const customer = masterData.create('customers', {
    name: `分页测试客户-${suffix}-${index}`,
    phone: `1380000000${index}`,
    status: 'potential',
  });
  customerIds.push(customer.id);
}

const customerPage1 = masterData.list('customers', { keyword: `分页测试客户-${suffix}`, page: 1, pageSize: 2 });
const customerPage2 = masterData.list('customers', { keyword: `分页测试客户-${suffix}`, page: 2, pageSize: 2 });

if (customerPage1.total !== 5 || customerPage1.items.length !== 2 || customerPage2.items.length !== 2) {
  throw new Error('Master data pagination count check failed');
}

if (customerPage1.items.some((item) => customerPage2.items.some((nextItem) => nextItem.id === item.id))) {
  throw new Error('Master data pagination pages should not overlap');
}

const customer = masterData.create('customers', {
  name: `分页流水客户-${suffix}`,
  status: 'signed',
});
const project = masterData.create('projects', {
  customerId: customer.id,
  name: `分页流水项目-${suffix}`,
  status: 'signed',
});

for (let index = 0; index < 5; index += 1) {
  transactions.create({
    direction: 'income',
    amountCents: 1000 + index,
    occurredDate: '2026-07-02',
    accountId: 'account_cash',
    categoryId: 'category_customer_payment',
    fundType: 'customer_payment',
    isCompanyFund: true,
    affectsReceivable: true,
    affectsProjectProfit: false,
    customerId: customer.id,
    projectId: project.id,
    remark: `分页流水测试-${suffix}`,
  });
}

const transactionPage1 = transactions.list({ keyword: `分页流水测试-${suffix}`, page: 1, pageSize: 2 });
const transactionPage2 = transactions.list({ keyword: `分页流水测试-${suffix}`, page: 2, pageSize: 2 });

if (transactionPage1.total !== 5 || transactionPage1.items.length !== 2 || transactionPage2.items.length !== 2) {
  throw new Error('Transaction pagination count check failed');
}

if (transactionPage1.items.some((item) => transactionPage2.items.some((nextItem) => nextItem.id === item.id))) {
  throw new Error('Transaction pagination pages should not overlap');
}

closeDatabase();

console.log('Pagination smoke test passed');
console.log(`Verified settings, master data pagination and transaction pagination in temp directory: ${tempRoot}`);
