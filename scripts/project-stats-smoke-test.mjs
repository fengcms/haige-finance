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
  customer: `stats_customer_${suffix}`,
  project: `stats_project_${suffix}`,
  contract: `stats_contract_${suffix}`,
  account: `stats_account_${suffix}`,
  income: `stats_income_${suffix}`,
  expense: `stats_expense_${suffix}`,
  voidedIncome: `stats_voided_income_${suffix}`,
  deletedExpense: `stats_deleted_expense_${suffix}`,
};

function getStats(projectId) {
  return db
    .prepare(
      `
        SELECT
          projects.id AS project_id,
          COALESCE(contract_totals.contract_amount_cents, 0) AS contract_amount_cents,
          COALESCE(transaction_totals.received_cents, 0) AS received_cents,
          COALESCE(transaction_totals.expense_cents, 0) AS expense_cents
        FROM projects
        LEFT JOIN (
          SELECT project_id, SUM(amount_cents) AS contract_amount_cents
          FROM contracts
          WHERE deleted_at IS NULL AND status <> 'voided'
          GROUP BY project_id
        ) contract_totals ON contract_totals.project_id = projects.id
        LEFT JOIN (
          SELECT
            project_id,
            SUM(CASE WHEN direction = 'income' AND fund_type = 'customer_payment' THEN amount_cents ELSE 0 END) AS received_cents,
            SUM(CASE WHEN direction = 'expense' AND affects_project_profit = 1 THEN amount_cents ELSE 0 END) AS expense_cents
          FROM transactions
          WHERE deleted_at IS NULL AND status = 'normal'
          GROUP BY project_id
        ) transaction_totals ON transaction_totals.project_id = projects.id
        WHERE projects.id = @projectId AND projects.deleted_at IS NULL
      `,
    )
    .get({ projectId });
}

const transaction = db.transaction(() => {
  db.prepare(
    `
      INSERT INTO customers (id, name, status, created_at, updated_at)
      VALUES (@id, @name, 'signed', @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.customer,
    name: `统计测试客户 ${suffix}`,
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
    name: `统计测试项目 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `
      INSERT INTO contracts (id, customer_id, project_id, contract_no, name, amount_cents, signed_date, status, created_at, updated_at)
      VALUES (@id, @customerId, @projectId, @contractNo, @name, 100000, '2026-06-30', 'signed', @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.contract,
    customerId: ids.customer,
    projectId: ids.project,
    contractNo: `STATS-${suffix}`,
    name: `统计测试合同 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `
      INSERT INTO accounts (id, name, type, status, opening_balance_cents, created_at, updated_at)
      VALUES (@id, @name, 'other', 'active', 0, @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.account,
    name: `统计测试账户 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  const insertTransaction = db.prepare(
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
        customer_id,
        project_id,
        status,
        voided_at,
        void_reason,
        remark,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES (
        @id,
        @direction,
        @amountCents,
        '2026-06-30',
        @accountId,
        @categoryId,
        @fundType,
        1,
        @affectsReceivable,
        @affectsProjectProfit,
        @customerId,
        @projectId,
        @status,
        @voidedAt,
        @voidReason,
        @remark,
        @createdAt,
        @updatedAt,
        @deletedAt
      )
    `,
  );

  insertTransaction.run({
    id: ids.income,
    direction: 'income',
    amountCents: 60000,
    accountId: ids.account,
    categoryId: 'category_customer_payment',
    fundType: 'customer_payment',
    affectsReceivable: 1,
    affectsProjectProfit: 0,
    customerId: ids.customer,
    projectId: ids.project,
    status: 'normal',
    voidedAt: null,
    voidReason: null,
    remark: '有效收款',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  insertTransaction.run({
    id: ids.expense,
    direction: 'expense',
    amountCents: 30000,
    accountId: ids.account,
    categoryId: 'category_project_material',
    fundType: 'project_expense',
    affectsReceivable: 0,
    affectsProjectProfit: 1,
    customerId: ids.customer,
    projectId: ids.project,
    status: 'normal',
    voidedAt: null,
    voidReason: null,
    remark: '有效支出',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  insertTransaction.run({
    id: ids.voidedIncome,
    direction: 'income',
    amountCents: 20000,
    accountId: ids.account,
    categoryId: 'category_customer_payment',
    fundType: 'customer_payment',
    affectsReceivable: 1,
    affectsProjectProfit: 0,
    customerId: ids.customer,
    projectId: ids.project,
    status: 'voided',
    voidedAt: now + 1,
    voidReason: '统计测试作废',
    remark: '作废收款',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  insertTransaction.run({
    id: ids.deletedExpense,
    direction: 'expense',
    amountCents: 10000,
    accountId: ids.account,
    categoryId: 'category_project_material',
    fundType: 'project_expense',
    affectsReceivable: 0,
    affectsProjectProfit: 1,
    customerId: ids.customer,
    projectId: ids.project,
    status: 'deleted',
    voidedAt: null,
    voidReason: null,
    remark: '软删除支出',
    createdAt: now,
    updatedAt: now + 2,
    deletedAt: now + 2,
  });

  const stats = getStats(ids.project);
  const receivableCents = stats.contract_amount_cents - stats.received_cents;
  const currentProfitCents = stats.received_cents - stats.expense_cents;
  const expectedProfitCents = stats.contract_amount_cents - stats.expense_cents;

  if (stats.contract_amount_cents !== 100000) {
    throw new Error('Contract amount stats check failed');
  }

  if (stats.received_cents !== 60000) {
    throw new Error('Received amount stats check failed');
  }

  if (stats.expense_cents !== 30000) {
    throw new Error('Expense amount stats check failed');
  }

  if (receivableCents !== 40000 || currentProfitCents !== 30000 || expectedProfitCents !== 70000) {
    throw new Error('Project profit stats check failed');
  }
});

transaction();
db.close();

console.log('Project stats smoke test passed');
console.log(`Verified project stats with suffix ${suffix}`);
