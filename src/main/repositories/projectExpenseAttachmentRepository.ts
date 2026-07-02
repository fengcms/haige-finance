import type Database from 'better-sqlite3';
import type { ProjectExpenseAttachment } from '../../shared/types/projectExpenseAttachment.js';
import { getSqlite } from '../db/index.js';

type AttachmentInput = Record<string, unknown>;

const columns: Record<string, string> = {
  id: 'id',
  orderId: 'order_id',
  sourceType: 'source_type',
  originalName: 'original_name',
  storedName: 'stored_name',
  storedPath: 'stored_path',
  mimeType: 'mime_type',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
};

export class ProjectExpenseAttachmentRepository {
  constructor(private readonly db: Database.Database = getSqlite()) {}

  orderExists(orderId: string): boolean {
    const row = this.db.prepare('SELECT 1 AS ok FROM project_expense_orders WHERE id = @orderId AND deleted_at IS NULL').get({ orderId });
    return Boolean(row);
  }

  getOrderStatus(orderId: string): string | null {
    const row = this.db
      .prepare('SELECT status FROM project_expense_orders WHERE id = @orderId AND deleted_at IS NULL')
      .get({ orderId }) as { status?: string } | undefined;
    return row?.status ?? null;
  }

  list(orderId: string): ProjectExpenseAttachment[] {
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM project_expense_attachments
          WHERE order_id = @orderId AND deleted_at IS NULL
          ORDER BY created_at ASC
        `,
      )
      .all({ orderId }) as Record<string, unknown>[];

    return rows.map(mapRow);
  }

  create(input: AttachmentInput): ProjectExpenseAttachment {
    const dbInput = toDbInput(input);
    const insertColumns = Object.keys(dbInput);
    this.db
      .prepare(
        `
          INSERT INTO project_expense_attachments (${insertColumns.join(', ')})
          VALUES (${insertColumns.map((column) => `@${column}`).join(', ')})
        `,
      )
      .run(dbInput);

    return this.findById(String(input.id))!;
  }

  findById(id: string): ProjectExpenseAttachment | null {
    const row = this.db
      .prepare('SELECT * FROM project_expense_attachments WHERE id = @id AND deleted_at IS NULL')
      .get({ id }) as Record<string, unknown> | undefined;

    return row ? mapRow(row) : null;
  }

  softDelete(id: string, deletedAt: number): { id: string } {
    const result = this.db
      .prepare(
        `
          UPDATE project_expense_attachments
          SET deleted_at = @deletedAt, updated_at = @deletedAt
          WHERE id = @id AND deleted_at IS NULL
        `,
      )
      .run({ id, deletedAt });

    if (result.changes === 0) {
      throw new Error('附件不存在或已删除');
    }

    return { id };
  }
}

function toDbInput(input: AttachmentInput) {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const column = columns[key];
    if (column) {
      output[column] = value === undefined ? null : value;
    }
  }

  return output;
}

function mapRow(row: Record<string, unknown>): ProjectExpenseAttachment {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    sourceType: String(row.source_type) as ProjectExpenseAttachment['sourceType'],
    originalName: String(row.original_name),
    storedName: String(row.stored_name),
    storedPath: String(row.stored_path),
    mimeType: String(row.mime_type),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at === null || row.deleted_at === undefined ? null : Number(row.deleted_at),
  };
}
