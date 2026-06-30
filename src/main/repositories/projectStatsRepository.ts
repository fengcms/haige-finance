import type Database from 'better-sqlite3';
import { getSqlite } from '../db/index.js';

export interface ProjectStatsRow extends Record<string, unknown> {
  id: string;
  customer_id: string;
  name: string;
  status: string;
  created_at: number;
  updated_at: number;
  contract_amount_cents: number;
  received_cents: number;
  expense_cents: number;
}

export interface ProjectDetailRows {
  project: ProjectStatsRow | null;
  contracts: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
}

export class ProjectStatsRepository {
  constructor(private readonly db: Database.Database = getSqlite()) {}

  listProjectStatsRows(): ProjectStatsRow[] {
    return this.db
      .prepare(
        `
          SELECT
            projects.*,
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
      .all() as ProjectStatsRow[];
  }

  getProjectDetailRows(projectId: string): ProjectDetailRows {
    const project = this.listProjectStatsRows().find((item) => item.id === projectId) ?? null;

    if (!project) {
      return {
        project: null,
        contracts: [],
        transactions: [],
      };
    }

    const contracts = this.db
      .prepare(
        `
          SELECT *
          FROM contracts
          WHERE project_id = @projectId AND deleted_at IS NULL
          ORDER BY signed_date DESC, created_at DESC
        `,
      )
      .all({ projectId }) as Record<string, unknown>[];

    const transactions = this.db
      .prepare(
        `
          SELECT
            transactions.*,
            accounts.name AS account_name,
            categories.name AS category_name,
            customers.name AS customer_name,
            projects.name AS project_name,
            employees.name AS employee_name
          FROM transactions
          LEFT JOIN accounts ON accounts.id = transactions.account_id
          LEFT JOIN categories ON categories.id = transactions.category_id
          LEFT JOIN customers ON customers.id = transactions.customer_id
          LEFT JOIN projects ON projects.id = transactions.project_id
          LEFT JOIN employees ON employees.id = transactions.employee_id
          WHERE transactions.project_id = @projectId AND transactions.deleted_at IS NULL
          ORDER BY transactions.occurred_date DESC, transactions.created_at DESC
        `,
      )
      .all({ projectId }) as Record<string, unknown>[];

    return {
      project,
      contracts,
      transactions,
    };
  }
}
