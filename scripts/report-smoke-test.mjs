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
const reportYear = 2100 + Math.floor((suffix % (7000 * 12)) / 12);
const reportMonthNumber = (suffix % 12) + 1;
const reportMonth = `${reportYear}-${String(reportMonthNumber).padStart(2, '0')}`;
const reportDate = `${reportMonth}-15`;
const ids = {
  customer: `report_customer_${suffix}`,
  project: `report_project_${suffix}`,
  contract: `report_contract_${suffix}`,
  account: `report_account_${suffix}`,
};

function getMonthlyCashFlow() {
  return db
    .prepare(
      `
        SELECT
          COALESCE(SUM(CASE WHEN direction = 'income' THEN amount_cents ELSE 0 END), 0) AS income_cents,
          COALESCE(SUM(CASE WHEN direction = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense_cents
        FROM transactions
        WHERE status = 'normal'
          AND deleted_at IS NULL
          AND is_company_fund = 1
          AND strftime('%Y-%m', occurred_date) = @reportMonth
      `,
    )
    .get({ reportMonth });
}

function getProjectStats() {
  return db
    .prepare(
      `
        SELECT
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
        WHERE projects.id = @projectId
      `,
    )
    .get({ projectId: ids.project });
}

function getAccountBalance() {
  return db
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
        WHERE accounts.id = @accountId
        GROUP BY accounts.id
      `,
    )
    .get({ accountId: ids.account });
}

const transaction = db.transaction(() => {
  db.prepare("INSERT INTO customers (id, name, status, created_at, updated_at) VALUES (@id, @name, 'signed', @createdAt, @updatedAt)").run({
    id: ids.customer,
    name: `报表测试客户 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare("INSERT INTO projects (id, customer_id, name, status, created_at, updated_at) VALUES (@id, @customerId, @name, 'signed', @createdAt, @updatedAt)").run({
    id: ids.project,
    customerId: ids.customer,
    name: `报表测试项目 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `
      INSERT INTO contracts (id, customer_id, project_id, contract_no, name, amount_cents, signed_date, status, created_at, updated_at)
      VALUES (@id, @customerId, @projectId, @contractNo, @name, 120000, @signedDate, 'signed', @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.contract,
    customerId: ids.customer,
    projectId: ids.project,
    contractNo: `REPORT-${suffix}`,
    name: `报表测试合同 ${suffix}`,
    signedDate: reportDate,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    "INSERT INTO accounts (id, name, type, status, opening_balance_cents, created_at, updated_at) VALUES (@id, @name, 'other', 'active', 10000, @createdAt, @updatedAt)",
  ).run({
    id: ids.account,
    name: `报表测试账户 ${suffix}`,
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
        created_at,
        updated_at,
        deleted_at
      )
      VALUES (
        @id,
        @direction,
        @amountCents,
        @occurredDate,
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
        @createdAt,
        @updatedAt,
        @deletedAt
      )
    `,
  );

  insertTransaction.run({
    id: `report_income_${suffix}`,
    direction: 'income',
    amountCents: 80000,
    occurredDate: reportDate,
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
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  insertTransaction.run({
    id: `report_expense_${suffix}`,
    direction: 'expense',
    amountCents: 30000,
    occurredDate: reportDate,
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
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  insertTransaction.run({
    id: `report_voided_${suffix}`,
    direction: 'income',
    amountCents: 50000,
    occurredDate: reportDate,
    accountId: ids.account,
    categoryId: 'category_customer_payment',
    fundType: 'customer_payment',
    affectsReceivable: 1,
    affectsProjectProfit: 0,
    customerId: ids.customer,
    projectId: ids.project,
    status: 'voided',
    voidedAt: now + 1,
    voidReason: '报表测试作废',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  insertTransaction.run({
    id: `report_deleted_${suffix}`,
    direction: 'expense',
    amountCents: 20000,
    occurredDate: reportDate,
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
    createdAt: now,
    updatedAt: now + 2,
    deletedAt: now + 2,
  });

  const monthly = getMonthlyCashFlow();
  if (monthly.income_cents !== 80000 || monthly.expense_cents !== 30000) {
    throw new Error('Monthly cash flow report check failed');
  }

  const stats = getProjectStats();
  if (stats.contract_amount_cents !== 120000 || stats.received_cents !== 80000 || stats.expense_cents !== 30000) {
    throw new Error('Project report check failed');
  }

  const balance = getAccountBalance();
  if (balance.balance_cents !== 60000) {
    throw new Error('Account balance report check failed');
  }
});

transaction();
db.close();

console.log('Report smoke test passed');
console.log(`Verified reports with suffix ${suffix}`);
