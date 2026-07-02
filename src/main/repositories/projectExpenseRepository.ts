import type Database from 'better-sqlite3';
import type { ProjectExpenseItem, ProjectExpenseOperationLog, ProjectExpenseOrder, ProjectExpenseOrderListQuery } from '../../shared/types/projectExpense.js';
import type { ProjectExpenseOperationAction } from '../../shared/constants/enums.js';
import { getSqlite } from '../db/index.js';

type Input = Record<string, unknown>;

const orderColumns: Record<string, string> = {
  id: 'id', customerId: 'customer_id', projectId: 'project_id', supplierId: 'supplier_id', expenseType: 'expense_type',
  occurredDate: 'occurred_date', accountId: 'account_id', status: 'status', totalAmountCents: 'total_amount_cents',
  paidTransactionId: 'paid_transaction_id', voidedAt: 'voided_at', voidReason: 'void_reason', remark: 'remark',
  createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at',
};

const itemColumns: Record<string, string> = {
  id: 'id', orderId: 'order_id', name: 'name', spec: 'spec', quantity: 'quantity', unit: 'unit',
  unitPriceCents: 'unit_price_cents', amountCents: 'amount_cents', remark: 'remark',
  createdAt: 'created_at', updatedAt: 'updated_at', deletedAt: 'deleted_at',
};

const logColumns: Record<string, string> = {
  id: 'id', orderId: 'order_id', itemId: 'item_id', action: 'action', detail: 'detail', createdAt: 'created_at',
};

export class ProjectExpenseRepository {
  constructor(private readonly db: Database.Database = getSqlite()) {}

  runInTransaction<T>(callback: () => T): T {
    return this.db.transaction(callback)();
  }

  listOrders(query: ProjectExpenseOrderListQuery = {}): ProjectExpenseOrder[] {
    const params: Record<string, unknown> = {};
    const where = ['project_expense_orders.deleted_at IS NULL'];
    if (query.projectId) {
      params.projectId = query.projectId;
      where.push('project_expense_orders.project_id = @projectId');
    }
    if (query.status) {
      params.status = query.status;
      where.push('project_expense_orders.status = @status');
    }
    return (this.db.prepare(`
      SELECT project_expense_orders.*, customers.name AS customer_name, projects.name AS project_name,
        suppliers.name AS supplier_name, accounts.name AS account_name
      FROM project_expense_orders
      LEFT JOIN customers ON customers.id = project_expense_orders.customer_id
      LEFT JOIN projects ON projects.id = project_expense_orders.project_id
      LEFT JOIN suppliers ON suppliers.id = project_expense_orders.supplier_id
      LEFT JOIN accounts ON accounts.id = project_expense_orders.account_id
      WHERE ${where.join(' AND ')}
      ORDER BY project_expense_orders.occurred_date DESC, project_expense_orders.created_at DESC
    `).all(params) as Record<string, unknown>[]).map(mapOrderRow);
  }

  findOrderById(id: string): ProjectExpenseOrder | null {
    const row = this.db.prepare(`
      SELECT project_expense_orders.*, customers.name AS customer_name, projects.name AS project_name,
        suppliers.name AS supplier_name, accounts.name AS account_name
      FROM project_expense_orders
      LEFT JOIN customers ON customers.id = project_expense_orders.customer_id
      LEFT JOIN projects ON projects.id = project_expense_orders.project_id
      LEFT JOIN suppliers ON suppliers.id = project_expense_orders.supplier_id
      LEFT JOIN accounts ON accounts.id = project_expense_orders.account_id
      WHERE project_expense_orders.id = @id AND project_expense_orders.deleted_at IS NULL
    `).get({ id }) as Record<string, unknown> | undefined;
    return row ? mapOrderRow(row) : null;
  }

  createOrder(input: Input): ProjectExpenseOrder {
    insertRow(this.db, 'project_expense_orders', toDbInput(orderColumns, input));
    return this.findOrderById(String(input.id))!;
  }

  updateOrder(id: string, input: Input): ProjectExpenseOrder {
    updateRow(this.db, 'project_expense_orders', id, toDbInput(orderColumns, input));
    const order = this.findOrderById(id);
    if (!order) throw new Error('项目费用单不存在或已删除');
    return order;
  }

  softDeleteOrder(id: string, deletedAt: number): { id: string } {
    const result = this.db.prepare('UPDATE project_expense_orders SET deleted_at = @deletedAt, updated_at = @deletedAt WHERE id = @id AND deleted_at IS NULL').run({ id, deletedAt });
    if (result.changes === 0) throw new Error('项目费用单不存在或已删除');
    return { id };
  }

  listItems(orderId: string): ProjectExpenseItem[] {
    return (this.db.prepare('SELECT * FROM project_expense_items WHERE order_id = @orderId AND deleted_at IS NULL ORDER BY created_at ASC')
      .all({ orderId }) as Record<string, unknown>[]).map(mapItemRow);
  }

  findItemById(id: string): ProjectExpenseItem | null {
    const row = this.db.prepare('SELECT * FROM project_expense_items WHERE id = @id AND deleted_at IS NULL').get({ id }) as Record<string, unknown> | undefined;
    return row ? mapItemRow(row) : null;
  }

  createItem(input: Input): ProjectExpenseItem {
    insertRow(this.db, 'project_expense_items', toDbInput(itemColumns, input));
    return this.findItemById(String(input.id))!;
  }

  updateItem(id: string, input: Input): ProjectExpenseItem {
    updateRow(this.db, 'project_expense_items', id, toDbInput(itemColumns, input));
    const item = this.findItemById(id);
    if (!item) throw new Error('费用明细不存在或已删除');
    return item;
  }

  softDeleteItem(id: string, deletedAt: number): { id: string } {
    const result = this.db.prepare('UPDATE project_expense_items SET deleted_at = @deletedAt, updated_at = @deletedAt WHERE id = @id AND deleted_at IS NULL').run({ id, deletedAt });
    if (result.changes === 0) throw new Error('费用明细不存在或已删除');
    return { id };
  }

  recalculateOrderTotal(orderId: string, updatedAt: number): ProjectExpenseOrder {
    const row = this.db.prepare('SELECT COALESCE(SUM(amount_cents), 0) AS total FROM project_expense_items WHERE order_id = @orderId AND deleted_at IS NULL').get({ orderId }) as { total: number };
    return this.updateOrder(orderId, { totalAmountCents: Number(row.total ?? 0), updatedAt });
  }

  listLogs(orderId: string): ProjectExpenseOperationLog[] {
    return (this.db.prepare('SELECT * FROM project_expense_operation_logs WHERE order_id = @orderId ORDER BY created_at DESC')
      .all({ orderId }) as Record<string, unknown>[]).map(mapLogRow);
  }

  createLog(input: { orderId: string; itemId?: string | null; action: ProjectExpenseOperationAction; detail?: string | null; createdAt: number }) {
    insertRow(this.db, 'project_expense_operation_logs', toDbInput(logColumns, { id: crypto.randomUUID(), ...input }));
  }

  exists(table: 'projects' | 'suppliers' | 'accounts' | 'categories', id: string): boolean {
    return Boolean(this.db.prepare(`SELECT 1 AS ok FROM ${table} WHERE id = @id AND deleted_at IS NULL`).get({ id }));
  }

  getProjectCustomerId(projectId: string): string | null {
    const row = this.db.prepare('SELECT customer_id FROM projects WHERE id = @projectId AND deleted_at IS NULL').get({ projectId }) as { customer_id: string } | undefined;
    return row?.customer_id ?? null;
  }
}

function insertRow(db: Database.Database, table: string, input: Record<string, unknown>) {
  const columns = Object.keys(input);
  db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((column) => `@${column}`).join(', ')})`).run(input);
}

function updateRow(db: Database.Database, table: string, id: string, input: Record<string, unknown>) {
  const columns = Object.keys(input);
  if (columns.length === 0) return;
  const result = db.prepare(`UPDATE ${table} SET ${columns.map((column) => `${column} = @${column}`).join(', ')} WHERE id = @id AND deleted_at IS NULL`).run({ ...input, id });
  if (result.changes === 0) throw new Error('数据不存在或已删除');
}

function toDbInput(columns: Record<string, string>, input: Input) {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (columns[key]) output[columns[key]] = value === undefined ? null : value;
  }
  return output;
}

function mapOrderRow(row: Record<string, unknown>): ProjectExpenseOrder {
  return mapRow({ ...orderColumns, customerName: 'customer_name', projectName: 'project_name', supplierName: 'supplier_name', accountName: 'account_name' }, row) as unknown as ProjectExpenseOrder;
}
function mapItemRow(row: Record<string, unknown>): ProjectExpenseItem {
  return mapRow(itemColumns, row) as unknown as ProjectExpenseItem;
}
function mapLogRow(row: Record<string, unknown>): ProjectExpenseOperationLog {
  return mapRow(logColumns, row) as unknown as ProjectExpenseOperationLog;
}
function mapRow(columns: Record<string, string>, row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  const map = new Map(Object.entries(columns).map(([key, column]) => [column, key]));
  for (const [column, value] of Object.entries(row)) out[map.get(column) ?? column.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
  return out;
}
