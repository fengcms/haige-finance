import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'haige-supplier-smoke-'));
process.chdir(tempRoot);

const { migrateDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/migrate.js')).href);
const { seedDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/seed.js')).href);
const { closeDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/index.js')).href);
const { MasterDataService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/masterDataService.js')).href);

migrateDatabase();
seedDatabase();

const service = new MasterDataService();
const suffix = Date.now();

const supplier = service.create('suppliers', {
  name: `供应商测试-${suffix}`,
  contactName: '张三',
  phone: '13800000000',
  address: '测试地址',
  type: 'material',
  status: 'active',
  remark: '供应商 smoke test',
});

if (!supplier.id || supplier.name !== `供应商测试-${suffix}` || supplier.type !== 'material') {
  throw new Error('Supplier create failed');
}

const updated = service.update('suppliers', supplier.id, {
  contactName: '李四',
  type: 'transport',
  status: 'inactive',
});

if (updated.contactName !== '李四' || updated.type !== 'transport' || updated.status !== 'inactive') {
  throw new Error('Supplier update failed');
}

const listResult = service.list('suppliers', {
  keyword: '李四',
  page: 1,
  pageSize: 100,
});

if (!listResult.items.some((item) => item.id === supplier.id)) {
  throw new Error('Supplier keyword search failed');
}

service.remove('suppliers', supplier.id);

const afterDelete = service.list('suppliers', {
  keyword: `供应商测试-${suffix}`,
  page: 1,
  pageSize: 100,
});

if (afterDelete.items.some((item) => item.id === supplier.id)) {
  throw new Error('Supplier soft delete failed');
}

closeDatabase();

console.log('Supplier smoke test passed');
console.log(`Verified supplier create, update, search and soft delete in temp directory: ${tempRoot}`);
