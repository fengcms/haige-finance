import type Database from 'better-sqlite3';
import { getSqlite } from '../db/index.js';

export interface MonthlyCashFlowRow {
  month: string;
  income_cents: number;
  expense_cents: number;
}

export interface ProjectReportRow {
  project_id: string;
  project_name: string;
  customer_name?: string | null;
  contract_amount_cents: number;
  received_cents: number;
  expense_cents: number;
}

export interface CustomerReceivableRow {
  customer_id: string;
  customer_name: string;
  contract_amount_cents: number;
  received_cents: number;
}

export interface AccountBalanceRow {
  account_id: string;
  account_name: string;
  opening_balance_cents: number;
  income_cents: number;
  expense_cents: number;
}

export class ReportRepository {
  constructor(private readonly db: Database.Database = getSqlite()) {}

  getMonthlyCashFlow(month: string, monthCount = 12): MonthlyCashFlowRow[] {
    return this.db
      .prepare(
        `
          WITH RECURSIVE months(month, index_no) AS (
            SELECT date(@month || '-01', '-' || (@monthCount - 1) || ' months'), 1
            UNION ALL
            SELECT date(month, '+1 month'), index_no + 1 FROM months WHERE index_no < @monthCount
          )
          SELECT
            strftime('%Y-%m', months.month) AS month,
            COALESCE(SUM(CASE WHEN transactions.direction = 'income' THEN transactions.amount_cents ELSE 0 END), 0) AS income_cents,
            COALESCE(SUM(CASE WHEN transactions.direction = 'expense' THEN transactions.amount_cents ELSE 0 END), 0) AS expense_cents
          FROM months
          LEFT JOIN transactions ON strftime('%Y-%m', transactions.occurred_date) = strftime('%Y-%m', months.month)
            AND transactions.status = 'normal'
            AND transactions.deleted_at IS NULL
            AND transactions.is_company_fund = 1
          GROUP BY months.month
          ORDER BY months.month ASC
        `,
      )
      .all({ month, monthCount }) as MonthlyCashFlowRow[];
  }

  getProjectReportRows(): ProjectReportRow[] {
    return this.db
      .prepare(
        `
          SELECT
            projects.id AS project_id,
            projects.name AS project_name,
            customers.name AS customer_name,
            COALESCE(contract_totals.contract_amount_cents, 0) AS contract_amount_cents,
            COALESCE(transaction_totals.received_cents, 0) AS received_cents,
            COALESCE(transaction_totals.expense_cents, 0) AS expense_cents
          FROM projects
          LEFT JOIN customers ON customers.id = projects.customer_id
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
          WHERE projects.deleted_at IS NULL
          ORDER BY projects.created_at DESC
        `,
      )
      .all() as ProjectReportRow[];
  }

  getCustomerReceivableRows(): CustomerReceivableRow[] {
    return this.db
      .prepare(
        `
          SELECT
            customers.id AS customer_id,
            customers.name AS customer_name,
            COALESCE(contract_totals.contract_amount_cents, 0) AS contract_amount_cents,
            COALESCE(payment_totals.received_cents, 0) AS received_cents
          FROM customers
          LEFT JOIN (
            SELECT customer_id, SUM(amount_cents) AS contract_amount_cents
            FROM contracts
            WHERE deleted_at IS NULL AND status <> 'voided'
            GROUP BY customer_id
          ) contract_totals ON contract_totals.customer_id = customers.id
          LEFT JOIN (
            SELECT customer_id, SUM(amount_cents) AS received_cents
            FROM transactions
            WHERE deleted_at IS NULL
              AND status = 'normal'
              AND direction = 'income'
              AND fund_type = 'customer_payment'
            GROUP BY customer_id
          ) payment_totals ON payment_totals.customer_id = customers.id
          WHERE customers.deleted_at IS NULL
          ORDER BY (COALESCE(contract_totals.contract_amount_cents, 0) - COALESCE(payment_totals.received_cents, 0)) DESC, customers.created_at DESC
        `,
      )
      .all() as CustomerReceivableRow[];
  }

  getAccountBalanceRows(): AccountBalanceRow[] {
    return this.db
      .prepare(
        `
          SELECT
            accounts.id AS account_id,
            accounts.name AS account_name,
            accounts.opening_balance_cents AS opening_balance_cents,
            COALESCE(SUM(CASE WHEN transactions.direction = 'income' THEN transactions.amount_cents ELSE 0 END), 0) AS income_cents,
            COALESCE(SUM(CASE WHEN transactions.direction = 'expense' THEN transactions.amount_cents ELSE 0 END), 0) AS expense_cents
          FROM accounts
          LEFT JOIN transactions ON transactions.account_id = accounts.id
            AND transactions.status = 'normal'
            AND transactions.deleted_at IS NULL
            AND transactions.is_company_fund = 1
          WHERE accounts.deleted_at IS NULL
          GROUP BY accounts.id
          ORDER BY accounts.created_at ASC
        `,
      )
      .all() as AccountBalanceRow[];
  }
}
