import type Database from 'better-sqlite3';
import type {
  SupplierAnalysisQuery,
  SupplierExpenseDetailItem,
  SupplierExpenseRankItem,
  SupplierExpenseTrendItem,
  SupplierProjectDistributionItem,
} from '../../shared/types/supplierAnalysis.js';
import { getSqlite } from '../db/index.js';

type TrendGranularity = 'day' | 'month';

export class SupplierAnalysisRepository {
  constructor(private readonly db: Database.Database = getSqlite()) {}

  getSummary(query: Required<Pick<SupplierAnalysisQuery, 'startDate' | 'endDate'>> & SupplierAnalysisQuery) {
    const { where, params } = buildWhere(query);
    return this.db.prepare(`
      SELECT
        COALESCE(SUM(project_expense_orders.total_amount_cents), 0) AS total_amount_cents,
        COUNT(*) AS order_count,
        COUNT(DISTINCT project_expense_orders.supplier_id) AS supplier_count,
        MAX(project_expense_orders.occurred_date) AS latest_occurred_date
      FROM project_expense_orders
      WHERE ${where.join(' AND ')}
    `).get(params) as Record<string, unknown>;
  }

  getSupplierRank(query: Required<Pick<SupplierAnalysisQuery, 'startDate' | 'endDate'>> & SupplierAnalysisQuery): SupplierExpenseRankItem[] {
    const { where, params } = buildWhere(query);
    return (this.db.prepare(`
      SELECT
        project_expense_orders.supplier_id,
        COALESCE(suppliers.name, '未指定供应商') AS supplier_name,
        COALESCE(SUM(project_expense_orders.total_amount_cents), 0) AS amount_cents,
        COUNT(*) AS order_count
      FROM project_expense_orders
      LEFT JOIN suppliers ON suppliers.id = project_expense_orders.supplier_id
      WHERE ${where.join(' AND ')}
      GROUP BY project_expense_orders.supplier_id, suppliers.name
      ORDER BY amount_cents DESC, order_count DESC
      LIMIT 10
    `).all(params) as Record<string, unknown>[]).map((row) => ({
      supplierId: nullableString(row.supplier_id),
      supplierName: String(row.supplier_name),
      amountCents: Number(row.amount_cents ?? 0),
      orderCount: Number(row.order_count ?? 0),
    }));
  }

  getTrend(
    query: Required<Pick<SupplierAnalysisQuery, 'startDate' | 'endDate'>> & SupplierAnalysisQuery,
    granularity: TrendGranularity,
  ): SupplierExpenseTrendItem[] {
    const { where, params } = buildWhere(query);
    const periodExpression = granularity === 'month'
      ? "substr(project_expense_orders.occurred_date, 1, 7)"
      : 'project_expense_orders.occurred_date';

    return (this.db.prepare(`
      SELECT
        ${periodExpression} AS period,
        COALESCE(SUM(project_expense_orders.total_amount_cents), 0) AS amount_cents,
        COUNT(*) AS order_count
      FROM project_expense_orders
      WHERE ${where.join(' AND ')}
      GROUP BY period
      ORDER BY period ASC
    `).all(params) as Record<string, unknown>[]).map((row) => ({
      period: String(row.period),
      amountCents: Number(row.amount_cents ?? 0),
      orderCount: Number(row.order_count ?? 0),
    }));
  }

  getProjectDistribution(query: Required<Pick<SupplierAnalysisQuery, 'startDate' | 'endDate'>> & SupplierAnalysisQuery): SupplierProjectDistributionItem[] {
    const { where, params } = buildWhere(query);
    return (this.db.prepare(`
      SELECT
        projects.id AS project_id,
        projects.name AS project_name,
        customers.name AS customer_name,
        COALESCE(SUM(project_expense_orders.total_amount_cents), 0) AS amount_cents,
        COUNT(*) AS order_count
      FROM project_expense_orders
      LEFT JOIN projects ON projects.id = project_expense_orders.project_id
      LEFT JOIN customers ON customers.id = project_expense_orders.customer_id
      WHERE ${where.join(' AND ')}
      GROUP BY projects.id, projects.name, customers.name
      ORDER BY amount_cents DESC, order_count DESC
      LIMIT 10
    `).all(params) as Record<string, unknown>[]).map((row) => ({
      projectId: String(row.project_id),
      projectName: String(row.project_name),
      customerName: nullableString(row.customer_name),
      amountCents: Number(row.amount_cents ?? 0),
      orderCount: Number(row.order_count ?? 0),
    }));
  }

  getDetails(query: Required<Pick<SupplierAnalysisQuery, 'startDate' | 'endDate'>> & SupplierAnalysisQuery): SupplierExpenseDetailItem[] {
    const { where, params } = buildWhere(query);
    return (this.db.prepare(`
      SELECT
        project_expense_orders.id,
        project_expense_orders.occurred_date,
        project_expense_orders.supplier_id,
        suppliers.name AS supplier_name,
        project_expense_orders.customer_id,
        customers.name AS customer_name,
        project_expense_orders.project_id,
        projects.name AS project_name,
        project_expense_orders.expense_type,
        project_expense_orders.total_amount_cents,
        project_expense_orders.remark,
        COALESCE(attachment_counts.attachment_count, 0) AS attachment_count
      FROM project_expense_orders
      LEFT JOIN suppliers ON suppliers.id = project_expense_orders.supplier_id
      LEFT JOIN customers ON customers.id = project_expense_orders.customer_id
      LEFT JOIN projects ON projects.id = project_expense_orders.project_id
      LEFT JOIN (
        SELECT order_id, COUNT(*) AS attachment_count
        FROM project_expense_attachments
        WHERE deleted_at IS NULL
        GROUP BY order_id
      ) attachment_counts ON attachment_counts.order_id = project_expense_orders.id
      WHERE ${where.join(' AND ')}
      ORDER BY project_expense_orders.occurred_date DESC, project_expense_orders.created_at DESC
    `).all(params) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      occurredDate: String(row.occurred_date),
      supplierId: nullableString(row.supplier_id),
      supplierName: nullableString(row.supplier_name),
      customerId: String(row.customer_id),
      customerName: nullableString(row.customer_name),
      projectId: String(row.project_id),
      projectName: nullableString(row.project_name),
      expenseType: String(row.expense_type) as SupplierExpenseDetailItem['expenseType'],
      totalAmountCents: Number(row.total_amount_cents ?? 0),
      attachmentCount: Number(row.attachment_count ?? 0),
      remark: nullableString(row.remark),
    }));
  }
}

function buildWhere(query: Required<Pick<SupplierAnalysisQuery, 'startDate' | 'endDate'>> & SupplierAnalysisQuery) {
  const params: Record<string, unknown> = {
    startDate: query.startDate,
    endDate: query.endDate,
  };
  const where = [
    'project_expense_orders.deleted_at IS NULL',
    "project_expense_orders.status = 'confirmed'",
    'project_expense_orders.voided_at IS NULL',
    'project_expense_orders.occurred_date >= @startDate',
    'project_expense_orders.occurred_date <= @endDate',
  ];

  if (query.supplierId) {
    params.supplierId = query.supplierId;
    where.push('project_expense_orders.supplier_id = @supplierId');
  }
  if (query.projectId) {
    params.projectId = query.projectId;
    where.push('project_expense_orders.project_id = @projectId');
  }
  if (query.expenseType) {
    params.expenseType = query.expenseType;
    where.push('project_expense_orders.expense_type = @expenseType');
  }

  return { where, params };
}

function nullableString(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}
