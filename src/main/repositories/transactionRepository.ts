import type Database from 'better-sqlite3';
import type { ListResult } from '../../shared/types/api.js';
import type { AccountBalance, TransactionListItem, TransactionListQuery } from '../../shared/types/transaction.js';
import { getSqlite } from '../db/index.js';

type TransactionInput = Record<string, unknown>;

const transactionColumns: Record<string, string> = {
  id: 'id',
  transactionNo: 'transaction_no',
  direction: 'direction',
  amountCents: 'amount_cents',
  occurredDate: 'occurred_date',
  accountId: 'account_id',
  categoryId: 'category_id',
  fundType: 'fund_type',
  isCompanyFund: 'is_company_fund',
  affectsReceivable: 'affects_receivable',
  affectsProjectProfit: 'affects_project_profit',
  customerId: 'customer_id',
  projectId: 'project_id',
  employeeId: 'employee_id',
  status: 'status',
  voidedAt: 'voided_at',
  voidReason: 'void_reason',
  remark: 'remark',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
};

export class TransactionRepository {
  constructor(private readonly db: Database.Database = getSqlite()) {}

  list(query: TransactionListQuery = {}): ListResult<TransactionListItem> {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize ?? 50)));
    const offset = (page - 1) * pageSize;
    const params: Record<string, unknown> = { limit: pageSize, offset };
    const where = ['transactions.deleted_at IS NULL'];

    if (query.keyword?.trim()) {
      params.keyword = `%${query.keyword.trim()}%`;
      where.push(`(
        transactions.transaction_no LIKE @keyword
        OR transactions.remark LIKE @keyword
        OR accounts.name LIKE @keyword
        OR categories.name LIKE @keyword
        OR customers.name LIKE @keyword
        OR projects.name LIKE @keyword
        OR employees.name LIKE @keyword
      )`);
    }

    for (const [key, column] of Object.entries({
      direction: 'transactions.direction',
      status: 'transactions.status',
      accountId: 'transactions.account_id',
      categoryId: 'transactions.category_id',
      customerId: 'transactions.customer_id',
      projectId: 'transactions.project_id',
      employeeId: 'transactions.employee_id',
      fundType: 'transactions.fund_type',
    })) {
      const value = query[key as keyof TransactionListQuery];
      if (typeof value === 'string' && value.trim()) {
        params[key] = value;
        where.push(`${column} = @${key}`);
      }
    }

    if (query.startDate) {
      params.startDate = query.startDate;
      where.push('transactions.occurred_date >= @startDate');
    }

    if (query.endDate) {
      params.endDate = query.endDate;
      where.push('transactions.occurred_date <= @endDate');
    }

    const fromSql = `
      transactions
      LEFT JOIN accounts ON accounts.id = transactions.account_id
      LEFT JOIN categories ON categories.id = transactions.category_id
      LEFT JOIN customers ON customers.id = transactions.customer_id
      LEFT JOIN projects ON projects.id = transactions.project_id
      LEFT JOIN employees ON employees.id = transactions.employee_id
    `;
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const rows = this.db
      .prepare(
        `
          SELECT
            transactions.*,
            accounts.name AS account_name,
            categories.name AS category_name,
            customers.name AS customer_name,
            projects.name AS project_name,
            employees.name AS employee_name
          FROM ${fromSql}
          ${whereSql}
          ORDER BY transactions.occurred_date DESC, transactions.created_at DESC
          LIMIT @limit OFFSET @offset
        `,
      )
      .all(params) as Record<string, unknown>[];

    const total = (this.db.prepare(`SELECT COUNT(*) AS count FROM ${fromSql} ${whereSql}`).get(params) as { count: number }).count;

    return {
      items: rows.map(mapTransactionRow),
      total,
    };
  }

  findById(id: string): TransactionListItem | null {
    const row = this.db
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
          WHERE transactions.id = @id AND transactions.deleted_at IS NULL
        `,
      )
      .get({ id }) as Record<string, unknown> | undefined;

    return row ? mapTransactionRow(row) : null;
  }

  create(input: TransactionInput): TransactionListItem {
    const dbInput = toDbInput(input);
    const columns = Object.keys(dbInput);
    this.db
      .prepare(
        `
          INSERT INTO transactions (${columns.join(', ')})
          VALUES (${columns.map((column) => `@${column}`).join(', ')})
        `,
      )
      .run(dbInput);

    return this.findById(String(input.id))!;
  }

  update(id: string, input: TransactionInput): TransactionListItem {
    const dbInput = toDbInput(input);
    const columns = Object.keys(dbInput);

    if (columns.length > 0) {
      const setSql = columns.map((column) => `${column} = @${column}`).join(', ');
      const result = this.db
        .prepare(`UPDATE transactions SET ${setSql} WHERE id = @id AND status = 'normal' AND deleted_at IS NULL`)
        .run({ ...dbInput, id });

      if (result.changes === 0) {
        throw new Error('流水不存在、已作废或已删除，不能编辑');
      }
    }

    return this.findById(id)!;
  }

  void(id: string, voidedAt: number, reason: string): TransactionListItem {
    const result = this.db
      .prepare(
        `
          UPDATE transactions
          SET status = 'voided', voided_at = @voidedAt, void_reason = @reason, updated_at = @voidedAt
          WHERE id = @id AND status = 'normal' AND deleted_at IS NULL
        `,
      )
      .run({ id, voidedAt, reason });

    if (result.changes === 0) {
      throw new Error('流水不存在、已作废或已删除');
    }

    return this.findById(id)!;
  }

  softDelete(id: string, deletedAt: number): { id: string } {
    const result = this.db
      .prepare(
        `
          UPDATE transactions
          SET status = 'deleted', deleted_at = @deletedAt, updated_at = @deletedAt
          WHERE id = @id AND deleted_at IS NULL
        `,
      )
      .run({ id, deletedAt });

    if (result.changes === 0) {
      throw new Error('流水不存在或已删除');
    }

    return { id };
  }

  getAccountBalances(): AccountBalance[] {
    const rows = this.db
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
      .all() as Record<string, unknown>[];

    return rows.map((row) => {
      const openingBalanceCents = Number(row.opening_balance_cents ?? 0);
      const incomeCents = Number(row.income_cents ?? 0);
      const expenseCents = Number(row.expense_cents ?? 0);

      return {
        accountId: String(row.account_id),
        accountName: String(row.account_name),
        openingBalanceCents,
        incomeCents,
        expenseCents,
        balanceCents: openingBalanceCents + incomeCents - expenseCents,
      };
    });
  }

  exists(table: 'accounts' | 'categories' | 'customers' | 'projects' | 'employees', id: string): boolean {
    const row = this.db.prepare(`SELECT 1 AS ok FROM ${table} WHERE id = @id AND deleted_at IS NULL`).get({ id });
    return Boolean(row);
  }

  projectBelongsToCustomer(projectId: string, customerId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 AS ok FROM projects WHERE id = @projectId AND customer_id = @customerId AND deleted_at IS NULL')
      .get({ projectId, customerId });
    return Boolean(row);
  }
}

function toDbInput(input: TransactionInput) {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const column = transactionColumns[key];
    if (column) {
      output[column] = normalizeValue(value);
    }
  }

  return output;
}

function normalizeValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (value === undefined) {
    return null;
  }

  return value;
}

function mapTransactionRow(row: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  const columnToKey = new Map(Object.entries(transactionColumns).map(([key, column]) => [column, key]));

  for (const [column, value] of Object.entries(row)) {
    const key = columnToKey.get(column) ?? snakeToCamel(column);
    output[key] = normalizeRowValue(key, value);
  }

  return output as unknown as TransactionListItem;
}

function normalizeRowValue(key: string, value: unknown) {
  if (['affectsReceivable', 'affectsProjectProfit', 'isCompanyFund'].includes(key)) {
    return Boolean(value);
  }

  return value;
}

function snakeToCamel(value: string) {
  return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}
