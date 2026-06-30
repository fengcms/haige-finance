import type Database from 'better-sqlite3';
import { getSqlite } from '../db/index.js';
import type { ListQuery, ListResult } from '../../shared/types/api.js';

export type EntityName = 'customers' | 'projects' | 'contracts' | 'employees' | 'accounts' | 'categories';

interface EntityConfig {
  table: string;
  columns: Record<string, string>;
  searchableColumns: string[];
  listSelect?: string;
  listJoin?: string;
}

type EntityInput = Record<string, unknown>;

const entityConfigs: Record<EntityName, EntityConfig> = {
  customers: {
    table: 'customers',
    columns: {
      id: 'id',
      name: 'name',
      phone: 'phone',
      address: 'address',
      community: 'community',
      houseNumber: 'house_number',
      status: 'status',
      remark: 'remark',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
    searchableColumns: ['name', 'phone', 'community'],
  },
  projects: {
    table: 'projects',
    columns: {
      id: 'id',
      customerId: 'customer_id',
      name: 'name',
      community: 'community',
      address: 'address',
      projectType: 'project_type',
      status: 'status',
      remark: 'remark',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
    searchableColumns: ['projects.name', 'projects.community', 'customers.name'],
    listSelect: 'projects.*, customers.name AS customer_name',
    listJoin: 'LEFT JOIN customers ON customers.id = projects.customer_id',
  },
  contracts: {
    table: 'contracts',
    columns: {
      id: 'id',
      customerId: 'customer_id',
      projectId: 'project_id',
      contractNo: 'contract_no',
      name: 'name',
      amountCents: 'amount_cents',
      signedDate: 'signed_date',
      status: 'status',
      remark: 'remark',
      attachmentPath: 'attachment_path',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
    searchableColumns: ['contracts.name', 'contracts.contract_no', 'customers.name', 'projects.name'],
    listSelect: 'contracts.*, customers.name AS customer_name, projects.name AS project_name',
    listJoin: `
      LEFT JOIN customers ON customers.id = contracts.customer_id
      LEFT JOIN projects ON projects.id = contracts.project_id
    `,
  },
  employees: {
    table: 'employees',
    columns: {
      id: 'id',
      name: 'name',
      phone: 'phone',
      position: 'position',
      entryDate: 'entry_date',
      status: 'status',
      remark: 'remark',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
    searchableColumns: ['name', 'phone', 'position'],
  },
  accounts: {
    table: 'accounts',
    columns: {
      id: 'id',
      name: 'name',
      type: 'type',
      status: 'status',
      openingBalanceCents: 'opening_balance_cents',
      remark: 'remark',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
    searchableColumns: ['name', 'type'],
  },
  categories: {
    table: 'categories',
    columns: {
      id: 'id',
      name: 'name',
      type: 'type',
      fundType: 'fund_type',
      affectsReceivable: 'affects_receivable',
      affectsProjectProfit: 'affects_project_profit',
      sortOrder: 'sort_order',
      status: 'status',
      remark: 'remark',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
    searchableColumns: ['name', 'type', 'fund_type'],
  },
};

export class MasterDataRepository {
  constructor(private readonly db: Database.Database = getSqlite()) {}

  list(entityName: EntityName, query: ListQuery = {}): ListResult<Record<string, unknown>> {
    const config = entityConfigs[entityName];
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize ?? 50)));
    const offset = (page - 1) * pageSize;
    const params: Record<string, unknown> = {
      limit: pageSize,
      offset,
    };
    const where = [`${config.table}.deleted_at IS NULL`];

    if (query.keyword?.trim()) {
      params.keyword = `%${query.keyword.trim()}%`;
      where.push(`(${config.searchableColumns.map((column) => `${column} LIKE @keyword`).join(' OR ')})`);
    }

    const fromSql = `${config.table} ${config.listJoin ?? ''}`;
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const selectSql = config.listSelect ?? `${config.table}.*`;
    const orderBy = entityName === 'categories' ? `${config.table}.sort_order ASC, ${config.table}.created_at DESC` : `${config.table}.created_at DESC`;

    const rows = this.db
      .prepare(`SELECT ${selectSql} FROM ${fromSql} ${whereSql} ORDER BY ${orderBy} LIMIT @limit OFFSET @offset`)
      .all(params) as Record<string, unknown>[];

    const total = (this.db.prepare(`SELECT COUNT(*) AS count FROM ${fromSql} ${whereSql}`).get(params) as { count: number }).count;

    return {
      items: rows.map((row) => mapRow(config, row)),
      total,
    };
  }

  findById(entityName: EntityName, id: string): Record<string, unknown> | null {
    const config = entityConfigs[entityName];
    const row = this.db
      .prepare(`SELECT * FROM ${config.table} WHERE id = @id AND deleted_at IS NULL`)
      .get({ id }) as Record<string, unknown> | undefined;

    return row ? mapRow(config, row) : null;
  }

  create(entityName: EntityName, input: EntityInput): Record<string, unknown> {
    const config = entityConfigs[entityName];
    const dbInput = toDbInput(config, input);
    const columns = Object.keys(dbInput);
    const sql = `
      INSERT INTO ${config.table} (${columns.join(', ')})
      VALUES (${columns.map((column) => `@${column}`).join(', ')})
    `;

    this.db.prepare(sql).run(dbInput);
    return this.findById(entityName, String(input.id))!;
  }

  update(entityName: EntityName, id: string, input: EntityInput): Record<string, unknown> {
    const config = entityConfigs[entityName];
    const dbInput = toDbInput(config, input);
    const columns = Object.keys(dbInput);

    if (columns.length > 0) {
      const setSql = columns.map((column) => `${column} = @${column}`).join(', ');
      this.db.prepare(`UPDATE ${config.table} SET ${setSql} WHERE id = @id AND deleted_at IS NULL`).run({
        ...dbInput,
        id,
      });
    }

    const entity = this.findById(entityName, id);
    if (!entity) {
      throw new Error('数据不存在或已删除');
    }

    return entity;
  }

  softDelete(entityName: EntityName, id: string, deletedAt: number): { id: string } {
    const config = entityConfigs[entityName];
    const result = this.db
      .prepare(`UPDATE ${config.table} SET deleted_at = @deletedAt, updated_at = @deletedAt WHERE id = @id AND deleted_at IS NULL`)
      .run({ id, deletedAt });

    if (result.changes === 0) {
      throw new Error('数据不存在或已删除');
    }

    return { id };
  }

  exists(entityName: EntityName, id: string): boolean {
    const config = entityConfigs[entityName];
    const row = this.db.prepare(`SELECT 1 AS ok FROM ${config.table} WHERE id = @id AND deleted_at IS NULL`).get({ id });
    return Boolean(row);
  }

  projectBelongsToCustomer(projectId: string, customerId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 AS ok FROM projects WHERE id = @projectId AND customer_id = @customerId AND deleted_at IS NULL')
      .get({ projectId, customerId });
    return Boolean(row);
  }
}

function toDbInput(config: EntityConfig, input: EntityInput) {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const column = config.columns[key];
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

function mapRow(config: EntityConfig, row: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  const columnToKey = new Map(Object.entries(config.columns).map(([key, column]) => [column, key]));

  for (const [column, value] of Object.entries(row)) {
    const key = columnToKey.get(column) ?? snakeToCamel(column);
    output[key] = normalizeRowValue(key, value);
  }

  return output;
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
