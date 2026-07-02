import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'haige-project-expense-attachment-smoke-'));
process.chdir(tempRoot);

const { migrateDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/migrate.js')).href);
const { seedDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/seed.js')).href);
const { closeDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/index.js')).href);
const { MasterDataService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/masterDataService.js')).href);
const { ProjectExpenseService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/projectExpenseService.js')).href);
const { ProjectExpenseAttachmentService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/projectExpenseAttachmentService.js')).href);

migrateDatabase();
seedDatabase();

const masterData = new MasterDataService();
const projectExpenses = new ProjectExpenseService();
const attachments = new ProjectExpenseAttachmentService();

const suffix = Date.now();
const customer = masterData.create('customers', {
  name: `费用单附件测试客户-${suffix}`,
  status: 'signed',
});
const project = masterData.create('projects', {
  customerId: customer.id,
  name: `费用单附件测试项目-${suffix}`,
  status: 'in_progress',
});
const order = projectExpenses.createOrder({
  projectId: project.id,
  expenseType: 'material',
  occurredDate: '2026-07-02',
  accountId: 'account_cash',
  remark: '项目费用单附件 smoke test',
});

const dataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

const created = attachments.createFromDataUrl({
  orderId: order.id,
  dataUrl,
  originalName: '粘贴截图.png',
});

if (created.sourceType !== 'pasted' || created.originalName !== '粘贴截图.png') {
  throw new Error('Pasted attachment create check failed');
}

if (!created.fileExists || !created.fileSizeBytes) {
  throw new Error('Pasted attachment file state check failed');
}

const list = attachments.list(order.id);

if (list.length !== 1 || list[0].id !== created.id) {
  throw new Error('Project expense attachment list check failed');
}

const preview = attachments.getPreview({ id: created.id });

if (!preview.dataUrl.startsWith('data:image/png;base64,') || preview.originalName !== '粘贴截图.png') {
  throw new Error('Project expense attachment preview check failed');
}

attachments.remove({ id: created.id });

if (attachments.list(order.id).length !== 0) {
  throw new Error('Project expense attachment soft delete check failed');
}

closeDatabase();

console.log('Project expense attachment smoke test passed');
console.log(`Verified pasted image attachment lifecycle in temp directory: ${tempRoot}`);
