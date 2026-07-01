import type Database from 'better-sqlite3';
import type { DictionaryItem, DictionaryQuery, UpdateDictionaryItemInput } from '../../shared/types/dictionary.js';
import { getSqlite } from '../db/index.js';

export class DictionaryRepository {
  constructor(private readonly db: Database.Database = getSqlite()) {}

  list(query: DictionaryQuery = {}): DictionaryItem[] {
    const where = ['deleted_at IS NULL'];
    const params: Record<string, unknown> = {};

    if (query.dictType) {
      where.push('dict_type = @dictType');
      params.dictType = query.dictType;
    }

    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM dictionary_items
          WHERE ${where.join(' AND ')}
          ORDER BY dict_type ASC, sort_order ASC, created_at ASC
        `,
      )
      .all(params) as Record<string, unknown>[];

    return rows.map(mapRow);
  }

  update(id: string, input: UpdateDictionaryItemInput, updatedAt: number): DictionaryItem {
    const updates: string[] = [];
    const params: Record<string, unknown> = { id, updatedAt };

    if (input.name !== undefined) {
      updates.push('name = @name');
      params.name = input.name;
    }

    if (input.sortOrder !== undefined) {
      updates.push('sort_order = @sortOrder');
      params.sortOrder = input.sortOrder;
    }

    if (input.status !== undefined) {
      updates.push('status = @status');
      params.status = input.status;
    }

    if (input.remark !== undefined) {
      updates.push('remark = @remark');
      params.remark = input.remark;
    }

    if (updates.length === 0) {
      return this.findById(id)!;
    }

    const result = this.db
      .prepare(
        `
          UPDATE dictionary_items
          SET ${updates.join(', ')}, updated_at = @updatedAt
          WHERE id = @id AND deleted_at IS NULL
        `,
      )
      .run(params);

    if (result.changes === 0) {
      throw new Error('字典项不存在或已删除');
    }

    return this.findById(id)!;
  }

  findById(id: string): DictionaryItem | null {
    const row = this.db
      .prepare('SELECT * FROM dictionary_items WHERE id = @id AND deleted_at IS NULL')
      .get({ id }) as Record<string, unknown> | undefined;

    return row ? mapRow(row) : null;
  }
}

function mapRow(row: Record<string, unknown>): DictionaryItem {
  return {
    id: String(row.id),
    dictType: String(row.dict_type) as DictionaryItem['dictType'],
    code: String(row.code),
    name: String(row.name),
    sortOrder: Number(row.sort_order),
    status: String(row.status) as DictionaryItem['status'],
    isSystem: Boolean(row.is_system),
    remark: row.remark ? String(row.remark) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at === null || row.deleted_at === undefined ? null : Number(row.deleted_at),
  };
}
