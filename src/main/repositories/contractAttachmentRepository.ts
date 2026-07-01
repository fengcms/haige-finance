import type Database from 'better-sqlite3';
import type { ContractAttachment } from '../../shared/types/contractAttachment.js';
import { getSqlite } from '../db/index.js';

type AttachmentInput = Record<string, unknown>;

const columns: Record<string, string> = {
  id: 'id',
  contractId: 'contract_id',
  fileType: 'file_type',
  sourceType: 'source_type',
  originalName: 'original_name',
  storedName: 'stored_name',
  storedPath: 'stored_path',
  mimeType: 'mime_type',
  sortOrder: 'sort_order',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
};

export class ContractAttachmentRepository {
  constructor(private readonly db: Database.Database = getSqlite()) {}

  contractExists(contractId: string): boolean {
    const row = this.db.prepare('SELECT 1 AS ok FROM contracts WHERE id = @contractId AND deleted_at IS NULL').get({ contractId });
    return Boolean(row);
  }

  list(contractId: string): ContractAttachment[] {
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM contract_attachments
          WHERE contract_id = @contractId AND deleted_at IS NULL
          ORDER BY sort_order ASC, created_at ASC
        `,
      )
      .all({ contractId }) as Record<string, unknown>[];

    return rows.map(mapRow);
  }

  create(input: AttachmentInput): ContractAttachment {
    const dbInput = toDbInput(input);
    const insertColumns = Object.keys(dbInput);
    this.db
      .prepare(
        `
          INSERT INTO contract_attachments (${insertColumns.join(', ')})
          VALUES (${insertColumns.map((column) => `@${column}`).join(', ')})
        `,
      )
      .run(dbInput);

    return this.findById(String(input.id))!;
  }

  findById(id: string): ContractAttachment | null {
    const row = this.db
      .prepare('SELECT * FROM contract_attachments WHERE id = @id AND deleted_at IS NULL')
      .get({ id }) as Record<string, unknown> | undefined;

    return row ? mapRow(row) : null;
  }

  updateSortOrder(id: string, sortOrder: number, updatedAt: number) {
    const result = this.db
      .prepare(
        `
          UPDATE contract_attachments
          SET sort_order = @sortOrder, updated_at = @updatedAt
          WHERE id = @id AND deleted_at IS NULL
        `,
      )
      .run({ id, sortOrder, updatedAt });

    if (result.changes === 0) {
      throw new Error('附件不存在或已删除');
    }
  }

  rename(id: string, originalName: string, updatedAt: number): ContractAttachment {
    const result = this.db
      .prepare(
        `
          UPDATE contract_attachments
          SET original_name = @originalName, updated_at = @updatedAt
          WHERE id = @id AND deleted_at IS NULL
        `,
      )
      .run({ id, originalName, updatedAt });

    if (result.changes === 0) {
      throw new Error('附件不存在或已删除');
    }

    return this.findById(id)!;
  }

  softDelete(id: string, deletedAt: number): { id: string } {
    const result = this.db
      .prepare(
        `
          UPDATE contract_attachments
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

  nextSortOrder(contractId: string): number {
    const row = this.db
      .prepare(
        `
          SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order
          FROM contract_attachments
          WHERE contract_id = @contractId AND deleted_at IS NULL
        `,
      )
      .get({ contractId }) as { next_sort_order: number };

    return Number(row.next_sort_order ?? 0);
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

function mapRow(row: Record<string, unknown>): ContractAttachment {
  return {
    id: String(row.id),
    contractId: String(row.contract_id),
    fileType: String(row.file_type) as ContractAttachment['fileType'],
    sourceType: String(row.source_type) as ContractAttachment['sourceType'],
    originalName: String(row.original_name),
    storedName: String(row.stored_name),
    storedPath: String(row.stored_path),
    mimeType: row.mime_type ? String(row.mime_type) : null,
    sortOrder: Number(row.sort_order),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at === null || row.deleted_at === undefined ? null : Number(row.deleted_at),
  };
}
