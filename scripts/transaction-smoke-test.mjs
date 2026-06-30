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
  customer: `txn_customer_${suffix}`,
  project: `txn_project_${suffix}`,
  account: `txn_account_${suffix}`,
  income: `txn_income_${suffix}`,
  expense: `txn_expense_${suffix}`,
  deleted: `txn_deleted_${suffix}`,
};

function getBalanceCents(accountId) {
  const row = db
    .prepare(
      `
        SELECT
          accounts.opening_balance_cents
          + COALESCE(SUM(CASE WHEN transactions.direction = 'income' THEN transactions.amount_cents ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN transactions.direction = 'expense' THEN transactions.amount_cents ELSE 0 END), 0)
          AS balance_cents
        FROM accounts
        LEFT JOIN transactions ON transactions.account_id = accounts.id
          AND transactions.status = 'normal'
          AND transactions.deleted_at IS NULL
          AND transactions.is_company_fund = 1
        WHERE accounts.id = @accountId AND accounts.deleted_at IS NULL
        GROUP BY accounts.id
      `,
    )
    .get({ accountId });

  return row?.balance_cents;
}

const transaction = db.transaction(() => {
  db.prepare(
    `
      INSERT INTO customers (id, name, status, created_at, updated_at)
      VALUES (@id, @name, 'signed', @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.customer,
    name: `流水测试客户 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `
      INSERT INTO projects (id, customer_id, name, status, created_at, updated_at)
      VALUES (@id, @customerId, @name, 'signed', @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.project,
    customerId: ids.customer,
    name: `流水测试项目 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `
      INSERT INTO accounts (id, name, type, status, opening_balance_cents, remark, created_at, updated_at)
      VALUES (@id, @name, 'other', 'active', 10000, 'Transaction smoke test', @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.account,
    name: `流水测试账户 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `
      INSERT INTO transactions (
        id,
        transaction_no,
        direction,
        amount_cents,
        occurred_date,
        account_id,
        category_id,
        fund_type,
        is_company_fund,
        affects_receivable,
        affects_project_profit,
        customer_id,
        project_id,
        status,
        remark,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @transactionNo,
        'income',
        50000,
        '2026-06-30',
        @accountId,
        'category_customer_payment',
        'customer_payment',
        1,
        1,
        0,
        @customerId,
        @projectId,
        'normal',
        'Transaction smoke test income',
        @createdAt,
        @updatedAt
      )
    `,
  ).run({
    id: ids.income,
    transactionNo: `TXN-IN-${suffix}`,
    accountId: ids.account,
    customerId: ids.customer,
    projectId: ids.project,
    createdAt: now,
    updatedAt: now,
  });

  if (getBalanceCents(ids.account) !== 60000) {
    throw new Error('Income balance check failed');
  }

  db.prepare("UPDATE transactions SET amount_cents = 70000, updated_at = @updatedAt WHERE id = @id AND status = 'normal'").run({
    id: ids.income,
    updatedAt: now + 1,
  });

  if (getBalanceCents(ids.account) !== 80000) {
    throw new Error('Updated income balance check failed');
  }

  db.prepare(
    `
      INSERT INTO transactions (
        id,
        transaction_no,
        direction,
        amount_cents,
        occurred_date,
        account_id,
        category_id,
        fund_type,
        is_company_fund,
        affects_receivable,
        affects_project_profit,
        customer_id,
        project_id,
        status,
        remark,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @transactionNo,
        'expense',
        30000,
        '2026-06-30',
        @accountId,
        'category_project_material',
        'project_expense',
        1,
        0,
        1,
        @customerId,
        @projectId,
        'normal',
        'Transaction smoke test expense',
        @createdAt,
        @updatedAt
      )
    `,
  ).run({
    id: ids.expense,
    transactionNo: `TXN-EX-${suffix}`,
    accountId: ids.account,
    customerId: ids.customer,
    projectId: ids.project,
    createdAt: now,
    updatedAt: now,
  });

  if (getBalanceCents(ids.account) !== 50000) {
    throw new Error('Expense balance check failed');
  }

  db.prepare(
    `
      UPDATE transactions
      SET status = 'voided', voided_at = @voidedAt, void_reason = '测试作废', updated_at = @voidedAt
      WHERE id = @id AND status = 'normal'
    `,
  ).run({
    id: ids.expense,
    voidedAt: now + 2,
  });

  if (getBalanceCents(ids.account) !== 80000) {
    throw new Error('Voided transaction balance exclusion failed');
  }

  db.prepare(
    `
      INSERT INTO transactions (
        id,
        direction,
        amount_cents,
        occurred_date,
        account_id,
        category_id,
        fund_type,
        is_company_fund,
        affects_receivable,
        affects_project_profit,
        status,
        remark,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        'income',
        90000,
        '2026-06-30',
        @accountId,
        'category_other_income',
        'other_income',
        1,
        0,
        0,
        'deleted',
        'Transaction smoke test deleted',
        @createdAt,
        @updatedAt
      )
    `,
  ).run({
    id: ids.deleted,
    accountId: ids.account,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare('UPDATE transactions SET deleted_at = @deletedAt, updated_at = @deletedAt WHERE id = @id').run({
    id: ids.deleted,
    deletedAt: now + 3,
  });

  if (getBalanceCents(ids.account) !== 80000) {
    throw new Error('Soft-deleted transaction balance exclusion failed');
  }

  const voided = db.prepare('SELECT status, voided_at, void_reason FROM transactions WHERE id = ?').get(ids.expense);
  if (voided?.status !== 'voided' || !voided.voided_at || voided.void_reason !== '测试作废') {
    throw new Error('Void fields check failed');
  }
});

transaction();
db.close();

console.log('Transaction smoke test passed');
console.log(`Created, updated, voided, and soft-deleted transactions with suffix ${suffix}`);
