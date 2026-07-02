import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'haige-supplier-analysis-smoke-'));
process.chdir(tempRoot);

const { migrateDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/migrate.js')).href);
const { seedDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/seed.js')).href);
const { closeDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/index.js')).href);
const { MasterDataService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/masterDataService.js')).href);
const { ProjectExpenseService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/projectExpenseService.js')).href);
const { SupplierAnalysisService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/supplierAnalysisService.js')).href);

migrateDatabase();
seedDatabase();

const masterData = new MasterDataService();
const projectExpenses = new ProjectExpenseService();
const analysis = new SupplierAnalysisService();
const suffix = Date.now();

const customer = masterData.create('customers', {
  name: `供应商分析测试客户-${suffix}`,
  status: 'signed',
});
const project = masterData.create('projects', {
  customerId: customer.id,
  name: `供应商分析测试项目-${suffix}`,
  status: 'in_progress',
});
const supplierA = masterData.create('suppliers', {
  name: `供应商分析材料商-${suffix}`,
  type: 'material',
  status: 'active',
});
const supplierB = masterData.create('suppliers', {
  name: `供应商分析运输商-${suffix}`,
  type: 'transport',
  status: 'active',
});

function createOrder({ supplierId, occurredDate, amountCents, expenseType = 'material', remark }) {
  const order = projectExpenses.createOrder({
    projectId: project.id,
    supplierId,
    expenseType,
    occurredDate,
    accountId: 'account_cash',
    remark,
  });
  projectExpenses.createItemsBatch({
    orderId: order.id,
    items: [
      {
        name: remark,
        quantity: 1,
        unitPriceCents: amountCents,
      },
    ],
  });
  return order;
}

const confirmedA = createOrder({
  supplierId: supplierA.id,
  occurredDate: '2026-07-02',
  amountCents: 10000,
  remark: '已确认材料费',
});
projectExpenses.confirmOrder({ id: confirmedA.id, accountId: 'account_cash' });

const confirmedB = createOrder({
  supplierId: supplierB.id,
  occurredDate: '2026-07-03',
  amountCents: 5000,
  expenseType: 'transport',
  remark: '已确认运输费',
});
projectExpenses.confirmOrder({ id: confirmedB.id, accountId: 'account_cash' });

const voided = createOrder({
  supplierId: supplierA.id,
  occurredDate: '2026-07-04',
  amountCents: 7000,
  remark: '作废费用',
});
projectExpenses.confirmOrder({ id: voided.id, accountId: 'account_cash' });
projectExpenses.voidOrder(voided.id, '供应商分析 smoke test 作废');

createOrder({
  supplierId: supplierA.id,
  occurredDate: '2026-07-05',
  amountCents: 9999,
  remark: '草稿费用',
});

const result = analysis.getAnalysis({
  startDate: '2026-07-01',
  endDate: '2026-07-31',
});

if (result.summary.totalAmountCents !== 15000 || result.summary.orderCount !== 2 || result.summary.supplierCount !== 2) {
  throw new Error(`Supplier analysis summary failed: ${JSON.stringify(result.summary)}`);
}

if (result.supplierRank.length !== 2 || result.supplierRank[0].supplierId !== supplierA.id || result.supplierRank[0].amountCents !== 10000) {
  throw new Error(`Supplier analysis rank failed: ${JSON.stringify(result.supplierRank)}`);
}

if (result.details.some((item) => item.id === voided.id) || result.details.length !== 2) {
  throw new Error('Supplier analysis should exclude draft and voided orders');
}

const supplierOnly = analysis.getAnalysis({
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  supplierId: supplierB.id,
});

if (supplierOnly.summary.totalAmountCents !== 5000 || supplierOnly.details[0]?.supplierId !== supplierB.id) {
  throw new Error('Supplier analysis supplier filter failed');
}

closeDatabase();

console.log('Supplier analysis smoke test passed');
console.log(`Verified supplier expense analysis in temp directory: ${tempRoot}`);
