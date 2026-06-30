import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { migrateSql } from '../dist/main/db/migrations.js';
import { seedDefaultData } from '../dist/main/db/seedData.js';

const dataDir = path.join(process.cwd(), 'data');
const databasePath = path.join(dataDir, 'haige-finance.sqlite');

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(migrateSql);
seedDefaultData(db);

const now = Date.now();
const suffix = now;
const ids = {
  customer: `smoke_customer_${suffix}`,
  project: `smoke_project_${suffix}`,
  contract: `smoke_contract_${suffix}`,
  employee: `smoke_employee_${suffix}`,
  account: `smoke_account_${suffix}`,
  category: `smoke_category_${suffix}`,
};

const transaction = db.transaction(() => {
  db.prepare(
    `
      INSERT INTO customers (id, name, phone, community, house_number, status, remark, created_at, updated_at)
      VALUES (@id, @name, @phone, @community, @houseNumber, 'potential', 'CRUD smoke test', @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.customer,
    name: `测试客户 ${suffix}`,
    phone: '13800000000',
    community: '测试小区',
    houseNumber: '1-101',
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `
      INSERT INTO projects (id, customer_id, name, community, address, project_type, status, remark, created_at, updated_at)
      VALUES (@id, @customerId, @name, '测试小区', '测试地址', 'renovation', 'pending', 'CRUD smoke test', @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.project,
    customerId: ids.customer,
    name: `测试项目 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `
      INSERT INTO contracts (id, customer_id, project_id, contract_no, name, amount_cents, signed_date, status, remark, created_at, updated_at)
      VALUES (@id, @customerId, @projectId, @contractNo, @name, 123456, '2026-06-30', 'draft', 'CRUD smoke test', @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.contract,
    customerId: ids.customer,
    projectId: ids.project,
    contractNo: `TEST-${suffix}`,
    name: `测试合同 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `
      INSERT INTO employees (id, name, phone, position, entry_date, status, remark, created_at, updated_at)
      VALUES (@id, @name, '13900000000', '测试岗位', '2026-06-30', 'active', 'CRUD smoke test', @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.employee,
    name: `测试员工 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `
      INSERT INTO accounts (id, name, type, status, opening_balance_cents, remark, created_at, updated_at)
      VALUES (@id, @name, 'other', 'active', 10000, 'CRUD smoke test', @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.account,
    name: `测试账户 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `
      INSERT INTO categories (
        id,
        name,
        type,
        fund_type,
        affects_receivable,
        affects_project_profit,
        sort_order,
        status,
        remark,
        created_at,
        updated_at
      )
      VALUES (@id, @name, 'expense', 'other_expense', 0, 0, 999, 'active', 'CRUD smoke test', @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.category,
    name: `测试分类 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare('UPDATE customers SET name = @name, updated_at = @updatedAt WHERE id = @id').run({
    id: ids.customer,
    name: `测试客户已编辑 ${suffix}`,
    updatedAt: now + 1,
  });

  const editedCustomer = db.prepare('SELECT name FROM customers WHERE id = ?').get(ids.customer);
  if (editedCustomer?.name !== `测试客户已编辑 ${suffix}`) {
    throw new Error('Customer update failed');
  }

  const contract = db.prepare('SELECT amount_cents FROM contracts WHERE id = ?').get(ids.contract);
  if (contract?.amount_cents !== 123456) {
    throw new Error('Contract amount cents check failed');
  }

  for (const [table, id] of [
    ['contracts', ids.contract],
    ['projects', ids.project],
    ['customers', ids.customer],
    ['employees', ids.employee],
    ['accounts', ids.account],
    ['categories', ids.category],
  ]) {
    db.prepare(`UPDATE ${table} SET deleted_at = @deletedAt, updated_at = @deletedAt WHERE id = @id`).run({
      id,
      deletedAt: now + 2,
    });
  }

  const visibleCustomer = db.prepare('SELECT 1 AS ok FROM customers WHERE id = ? AND deleted_at IS NULL').get(ids.customer);
  if (visibleCustomer) {
    throw new Error('Soft delete check failed');
  }
});

transaction();
db.close();

console.log('CRUD smoke test passed');
console.log(`Created, updated, and soft-deleted customer/project/contract/employee/account/category with suffix ${suffix}`);
