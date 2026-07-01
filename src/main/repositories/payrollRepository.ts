import type Database from 'better-sqlite3';
import type { PayrollBatch, PayrollBatchListQuery, PayrollItem, PayrollOperationLog } from '../../shared/types/payroll.js';
import type { PayrollOperationAction } from '../../shared/constants/enums.js';
import { getSqlite } from '../db/index.js';

type PayrollInput = Record<string, unknown>;

const batchColumns: Record<string, string> = {
  id: 'id',
  month: 'month',
  name: 'name',
  payDate: 'pay_date',
  accountId: 'account_id',
  status: 'status',
  totalGrossCents: 'total_gross_cents',
  totalDeductionCents: 'total_deduction_cents',
  totalNetCents: 'total_net_cents',
  paidTransactionId: 'paid_transaction_id',
  voidedAt: 'voided_at',
  voidReason: 'void_reason',
  remark: 'remark',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
};

const itemColumns: Record<string, string> = {
  id: 'id',
  batchId: 'batch_id',
  employeeId: 'employee_id',
  baseSalaryCents: 'base_salary_cents',
  attendanceBonusCents: 'attendance_bonus_cents',
  phoneAllowanceCents: 'phone_allowance_cents',
  bonusCents: 'bonus_cents',
  commissionCents: 'commission_cents',
  deductionCents: 'deduction_cents',
  socialInsuranceCents: 'social_insurance_cents',
  housingFundCents: 'housing_fund_cents',
  taxCents: 'tax_cents',
  grossSalaryCents: 'gross_salary_cents',
  netSalaryCents: 'net_salary_cents',
  remark: 'remark',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
};

const logColumns: Record<string, string> = {
  id: 'id',
  batchId: 'batch_id',
  itemId: 'item_id',
  action: 'action',
  detail: 'detail',
  createdAt: 'created_at',
};

export class PayrollRepository {
  constructor(private readonly db: Database.Database = getSqlite()) {}

  runInTransaction<T>(callback: () => T): T {
    return this.db.transaction(callback)();
  }

  listBatches(query: PayrollBatchListQuery = {}): PayrollBatch[] {
    const params: Record<string, unknown> = {};
    const where = ['deleted_at IS NULL'];

    if (query.month) {
      params.month = query.month;
      where.push('month = @month');
    }

    if (query.status) {
      params.status = query.status;
      where.push('status = @status');
    }

    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM payroll_batches
          WHERE ${where.join(' AND ')}
          ORDER BY month DESC, created_at DESC
        `,
      )
      .all(params) as Record<string, unknown>[];

    return rows.map(mapBatchRow);
  }

  findBatchById(id: string): PayrollBatch | null {
    const row = this.db
      .prepare('SELECT * FROM payroll_batches WHERE id = @id AND deleted_at IS NULL')
      .get({ id }) as Record<string, unknown> | undefined;

    return row ? mapBatchRow(row) : null;
  }

  createBatch(input: PayrollInput): PayrollBatch {
    insertRow(this.db, 'payroll_batches', toDbInput(batchColumns, input));
    return this.findBatchById(String(input.id))!;
  }

  updateBatch(id: string, input: PayrollInput): PayrollBatch {
    updateRow(this.db, 'payroll_batches', id, toDbInput(batchColumns, input));
    const batch = this.findBatchById(id);
    if (!batch) {
      throw new Error('工资批次不存在或已删除');
    }
    return batch;
  }

  softDeleteBatch(id: string, deletedAt: number): { id: string } {
    const result = this.db
      .prepare('UPDATE payroll_batches SET deleted_at = @deletedAt, updated_at = @deletedAt WHERE id = @id AND deleted_at IS NULL')
      .run({ id, deletedAt });

    if (result.changes === 0) {
      throw new Error('工资批次不存在或已删除');
    }

    return { id };
  }

  listItems(batchId: string): PayrollItem[] {
    const rows = this.db
      .prepare(
        `
          SELECT payroll_items.*, employees.name AS employee_name
          FROM payroll_items
          LEFT JOIN employees ON employees.id = payroll_items.employee_id
          WHERE payroll_items.batch_id = @batchId AND payroll_items.deleted_at IS NULL
          ORDER BY payroll_items.created_at ASC
        `,
      )
      .all({ batchId }) as Record<string, unknown>[];

    return rows.map(mapItemRow);
  }

  findItemById(id: string): PayrollItem | null {
    const row = this.db
      .prepare(
        `
          SELECT payroll_items.*, employees.name AS employee_name
          FROM payroll_items
          LEFT JOIN employees ON employees.id = payroll_items.employee_id
          WHERE payroll_items.id = @id AND payroll_items.deleted_at IS NULL
        `,
      )
      .get({ id }) as Record<string, unknown> | undefined;

    return row ? mapItemRow(row) : null;
  }

  createItem(input: PayrollInput): PayrollItem {
    insertRow(this.db, 'payroll_items', toDbInput(itemColumns, input));
    return this.findItemById(String(input.id))!;
  }

  employeeHasItem(batchId: string, employeeId: string): boolean {
    const row = this.db
      .prepare(
        `
          SELECT 1 AS ok
          FROM payroll_items
          WHERE batch_id = @batchId AND employee_id = @employeeId AND deleted_at IS NULL
        `,
      )
      .get({ batchId, employeeId });

    return Boolean(row);
  }

  updateItem(id: string, input: PayrollInput): PayrollItem {
    updateRow(this.db, 'payroll_items', id, toDbInput(itemColumns, input));
    const item = this.findItemById(id);
    if (!item) {
      throw new Error('工资明细不存在或已删除');
    }
    return item;
  }

  softDeleteItem(id: string, deletedAt: number): { id: string } {
    const result = this.db
      .prepare('UPDATE payroll_items SET deleted_at = @deletedAt, updated_at = @deletedAt WHERE id = @id AND deleted_at IS NULL')
      .run({ id, deletedAt });

    if (result.changes === 0) {
      throw new Error('工资明细不存在或已删除');
    }

    return { id };
  }

  recalculateBatchTotals(batchId: string, updatedAt: number): PayrollBatch {
    const totals = this.db
      .prepare(
        `
          SELECT
            COALESCE(SUM(gross_salary_cents), 0) AS total_gross_cents,
            COALESCE(SUM(deduction_cents), 0) AS total_deduction_cents,
            COALESCE(SUM(net_salary_cents), 0) AS total_net_cents
          FROM payroll_items
          WHERE batch_id = @batchId AND deleted_at IS NULL
        `,
      )
      .get({ batchId }) as Record<string, unknown>;

    return this.updateBatch(batchId, {
      totalGrossCents: Number(totals.total_gross_cents ?? 0),
      totalDeductionCents: Number(totals.total_deduction_cents ?? 0),
      totalNetCents: Number(totals.total_net_cents ?? 0),
      updatedAt,
    });
  }

  listLogs(batchId: string): PayrollOperationLog[] {
    const rows = this.db
      .prepare('SELECT * FROM payroll_operation_logs WHERE batch_id = @batchId ORDER BY created_at DESC')
      .all({ batchId }) as Record<string, unknown>[];

    return rows.map(mapLogRow);
  }

  createLog(input: {
    batchId: string;
    itemId?: string | null;
    action: PayrollOperationAction;
    detail?: string | null;
    createdAt: number;
  }): PayrollOperationLog {
    const id = crypto.randomUUID();
    insertRow(this.db, 'payroll_operation_logs', toDbInput(logColumns, { id, ...input }));
    const row = this.db.prepare('SELECT * FROM payroll_operation_logs WHERE id = @id').get({ id }) as Record<string, unknown>;
    return mapLogRow(row);
  }

  exists(table: 'accounts' | 'categories' | 'employees', id: string): boolean {
    const row = this.db.prepare(`SELECT 1 AS ok FROM ${table} WHERE id = @id AND deleted_at IS NULL`).get({ id });
    return Boolean(row);
  }
}

function insertRow(db: Database.Database, table: string, input: Record<string, unknown>) {
  const columns = Object.keys(input);
  db.prepare(
    `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${columns.map((column) => `@${column}`).join(', ')})
    `,
  ).run(input);
}

function updateRow(db: Database.Database, table: string, id: string, input: Record<string, unknown>) {
  const columns = Object.keys(input);
  if (columns.length === 0) {
    return;
  }

  const setSql = columns.map((column) => `${column} = @${column}`).join(', ');
  const result = db.prepare(`UPDATE ${table} SET ${setSql} WHERE id = @id AND deleted_at IS NULL`).run({ ...input, id });

  if (result.changes === 0) {
    throw new Error('数据不存在或已删除');
  }
}

function toDbInput(columns: Record<string, string>, input: PayrollInput) {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const column = columns[key];
    if (column) {
      output[column] = value === undefined ? null : value;
    }
  }

  return output;
}

function mapBatchRow(row: Record<string, unknown>): PayrollBatch {
  return mapRow(batchColumns, row) as unknown as PayrollBatch;
}

function mapItemRow(row: Record<string, unknown>): PayrollItem {
  return mapRow({ ...itemColumns, employeeName: 'employee_name' }, row) as unknown as PayrollItem;
}

function mapLogRow(row: Record<string, unknown>): PayrollOperationLog {
  return mapRow(logColumns, row) as unknown as PayrollOperationLog;
}

function mapRow(columns: Record<string, string>, row: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  const columnToKey = new Map(Object.entries(columns).map(([key, column]) => [column, key]));

  for (const [column, value] of Object.entries(row)) {
    output[columnToKey.get(column) ?? snakeToCamel(column)] = value;
  }

  return output;
}

function snakeToCamel(value: string) {
  return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}
