import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { migrateSql } from '../dist/main/db/migrations.js';
import { seedDefaultData } from '../dist/main/db/seedData.js';

const dataDir = path.join(process.cwd(), 'data');
const databasePath = path.join(dataDir, 'haige-finance.sqlite');

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(migrateSql);
seedDefaultData(db);

const now = Date.now();
const suffix = now;
const ids = {
  customer: `attachment_customer_${suffix}`,
  project: `attachment_project_${suffix}`,
  contract: `attachment_contract_${suffix}`,
  image: `attachment_image_${suffix}`,
  pdf: `attachment_pdf_${suffix}`,
};

const transaction = db.transaction(() => {
  db.prepare("INSERT INTO customers (id, name, status, created_at, updated_at) VALUES (@id, @name, 'signed', @createdAt, @updatedAt)").run({
    id: ids.customer,
    name: `附件测试客户 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare("INSERT INTO projects (id, customer_id, name, status, created_at, updated_at) VALUES (@id, @customerId, @name, 'signed', @createdAt, @updatedAt)").run({
    id: ids.project,
    customerId: ids.customer,
    name: `附件测试项目 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `
      INSERT INTO contracts (id, customer_id, project_id, name, amount_cents, status, created_at, updated_at)
      VALUES (@id, @customerId, @projectId, @name, 10000, 'signed', @createdAt, @updatedAt)
    `,
  ).run({
    id: ids.contract,
    customerId: ids.customer,
    projectId: ids.project,
    name: `附件测试合同 ${suffix}`,
    createdAt: now,
    updatedAt: now,
  });

  const insertAttachment = db.prepare(
    `
      INSERT INTO contract_attachments (
        id,
        contract_id,
        file_type,
        source_type,
        original_name,
        stored_name,
        stored_path,
        mime_type,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @contractId,
        @fileType,
        @sourceType,
        @originalName,
        @storedName,
        @storedPath,
        @mimeType,
        @sortOrder,
        @createdAt,
        @updatedAt
      )
    `,
  );

  insertAttachment.run({
    id: ids.image,
    contractId: ids.contract,
    fileType: 'image',
    sourceType: 'uploaded',
    originalName: 'test-image.png',
    storedName: 'test-image.png',
    storedPath: path.join(dataDir, 'attachments', 'test-image.png'),
    mimeType: 'image/png',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  });

  insertAttachment.run({
    id: ids.pdf,
    contractId: ids.contract,
    fileType: 'pdf',
    sourceType: 'generated',
    originalName: 'test-contract.pdf',
    storedName: 'test-contract.pdf',
    storedPath: path.join(dataDir, 'attachments', 'test-contract.pdf'),
    mimeType: 'application/pdf',
    sortOrder: 1,
    createdAt: now,
    updatedAt: now,
  });

  db.prepare('UPDATE contract_attachments SET sort_order = 1, updated_at = @updatedAt WHERE id = @id').run({
    id: ids.image,
    updatedAt: now + 1,
  });
  db.prepare('UPDATE contract_attachments SET sort_order = 0, updated_at = @updatedAt WHERE id = @id').run({
    id: ids.pdf,
    updatedAt: now + 1,
  });

  const ordered = db.prepare('SELECT id FROM contract_attachments WHERE contract_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC').all(ids.contract);
  if (ordered[0]?.id !== ids.pdf || ordered[1]?.id !== ids.image) {
    throw new Error('Attachment reorder check failed');
  }

  db.prepare('UPDATE contract_attachments SET original_name = @originalName, updated_at = @updatedAt WHERE id = @id').run({
    id: ids.pdf,
    originalName: 'renamed-contract.pdf',
    updatedAt: now + 2,
  });

  const renamed = db.prepare('SELECT original_name AS originalName FROM contract_attachments WHERE id = ?').get(ids.pdf);
  if (renamed.originalName !== 'renamed-contract.pdf') {
    throw new Error('Attachment rename check failed');
  }

  db.prepare('UPDATE contract_attachments SET deleted_at = @deletedAt, updated_at = @deletedAt WHERE id = @id').run({
    id: ids.image,
    deletedAt: now + 3,
  });

  const visibleCount = db.prepare('SELECT COUNT(*) AS count FROM contract_attachments WHERE contract_id = ? AND deleted_at IS NULL').get(ids.contract).count;
  if (visibleCount !== 1) {
    throw new Error('Attachment soft delete check failed');
  }
});

transaction();
db.close();

console.log('Contract attachment smoke test passed');
console.log(`Verified contract attachments with suffix ${suffix}`);
