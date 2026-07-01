import { BrowserWindow, dialog, shell } from 'electron';
import dayjs from 'dayjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { renameContractAttachmentSchema, reorderContractAttachmentsSchema } from '../../shared/schemas/contractAttachment.js';
import type { ContractAttachment, ContractAttachmentPreview, GenerateContractPdfResult } from '../../shared/types/contractAttachment.js';
import { getDatabasePath } from '../db/index.js';
import { ContractAttachmentRepository } from '../repositories/contractAttachmentRepository.js';

const idPayloadSchema = z.object({
  id: z.string().min(1),
});

const contractIdPayloadSchema = z.object({
  contractId: z.string().min(1),
});

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const pdfExtensions = new Set(['.pdf']);

export class ContractAttachmentService {
  constructor(private readonly repository = new ContractAttachmentRepository()) {}

  list(contractId: unknown): ContractAttachment[] {
    const id = z.string().min(1).parse(contractId);
    return this.repository.list(id).map(withFileState);
  }

  async importFiles(input: unknown): Promise<ContractAttachment[]> {
    const { contractId } = contractIdPayloadSchema.parse(input);
    this.assertContractExists(contractId);

    const result = await dialog.showOpenDialog({
      title: '选择合同附件',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '合同附件', extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'] },
        { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
        { name: 'PDF', extensions: ['pdf'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return this.repository.list(contractId).map(withFileState);
    }

    const imported: ContractAttachment[] = [];
    let sortOrder = this.repository.nextSortOrder(contractId);

    for (const filePath of result.filePaths) {
      imported.push(await this.copyFileToAttachment(contractId, filePath, sortOrder));
      sortOrder += 1;
    }

    return imported;
  }

  reorder(input: unknown): ContractAttachment[] {
    const { contractId, orderedIds } = reorderContractAttachmentsSchema.parse(input);
    const now = Date.now();
    const existing = this.repository.list(contractId);
    const existingIds = new Set(existing.map((item) => item.id));

    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw new Error('排序中包含不属于当前合同的附件');
      }
    }

    orderedIds.forEach((id, index) => {
      this.repository.updateSortOrder(id, index, now);
    });

    return this.repository.list(contractId).map(withFileState);
  }

  rename(input: unknown): ContractAttachment {
    const { id, originalName } = renameContractAttachmentSchema.parse(input);
    return withFileState(this.repository.rename(id, originalName, Date.now()));
  }

  remove(input: unknown): { id: string } {
    const { id } = idPayloadSchema.parse(input);
    return this.repository.softDelete(id, Date.now());
  }

  async openFile(input: unknown): Promise<{ id: string; path: string }> {
    const { id } = idPayloadSchema.parse(input);
    const attachment = this.repository.findById(id);
    if (!attachment) {
      throw new Error('附件不存在或已删除');
    }
    assertFileExists(attachment);

    const error = await shell.openPath(attachment.storedPath);
    if (error) {
      throw new Error(error);
    }

    return {
      id,
      path: attachment.storedPath,
    };
  }

  getPreview(input: unknown): ContractAttachmentPreview {
    const { id } = idPayloadSchema.parse(input);
    const attachment = this.repository.findById(id);
    if (!attachment) {
      throw new Error('附件不存在或已删除');
    }
    assertFileExists(attachment);

    const mimeType = attachment.mimeType ?? getMimeType(attachment.storedPath) ?? 'application/octet-stream';
    const data = fs.readFileSync(attachment.storedPath);

    return {
      id: attachment.id,
      fileType: attachment.fileType,
      originalName: attachment.originalName,
      mimeType,
      dataUrl: `data:${mimeType};base64,${data.toString('base64')}`,
    };
  }

  async generatePdf(input: unknown): Promise<GenerateContractPdfResult> {
    const { contractId } = contractIdPayloadSchema.parse(input);
    this.assertContractExists(contractId);

    const images = this.repository.list(contractId).filter((item) => item.fileType === 'image');
    if (images.length === 0) {
      throw new Error('请先上传图片附件');
    }
    images.forEach(assertFileExists);

    const generatedDir = ensureDir(path.join(getContractAttachmentDir(contractId), 'generated'));
    const createdAt = dayjs().format('YYYYMMDD-HHmmss');
    const storedName = `contract-${contractId}-${createdAt}.pdf`;
    const pdfPath = path.join(generatedDir, storedName);
    const pdfBuffer = await renderImagesToPdf(images);
    fs.writeFileSync(pdfPath, pdfBuffer);

    const now = Date.now();
    const attachment = this.repository.create({
      id: crypto.randomUUID(),
      contractId,
      fileType: 'pdf',
      sourceType: 'generated',
      originalName: `合同附件-${createdAt}.pdf`,
      storedName,
      storedPath: pdfPath,
      mimeType: 'application/pdf',
      sortOrder: this.repository.nextSortOrder(contractId),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    return {
      attachment,
      pageCount: images.length,
    };
  }

  private async copyFileToAttachment(contractId: string, filePath: string, sortOrder: number): Promise<ContractAttachment> {
    const fileType = getFileType(filePath);
    const originalName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const storedName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const targetDir = ensureDir(path.join(getContractAttachmentDir(contractId), fileType === 'image' ? 'images' : 'pdfs'));
    const storedPath = path.join(targetDir, storedName);
    fs.copyFileSync(filePath, storedPath);

    const now = Date.now();
    return this.repository.create({
      id: crypto.randomUUID(),
      contractId,
      fileType,
      sourceType: 'uploaded',
      originalName,
      storedName,
      storedPath,
      mimeType: getMimeType(filePath),
      sortOrder,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  private assertContractExists(contractId: string) {
    if (!this.repository.contractExists(contractId)) {
      throw new Error('合同不存在或已删除');
    }
  }
}

function withFileState(attachment: ContractAttachment): ContractAttachment {
  try {
    const stat = fs.statSync(attachment.storedPath);
    return {
      ...attachment,
      fileExists: stat.isFile(),
      fileSizeBytes: stat.isFile() ? stat.size : null,
    };
  } catch {
    return {
      ...attachment,
      fileExists: false,
      fileSizeBytes: null,
    };
  }
}

function assertFileExists(attachment: ContractAttachment) {
  if (!fs.existsSync(attachment.storedPath)) {
    throw new Error(`附件文件不存在：${attachment.originalName}`);
  }
}

function getContractAttachmentDir(contractId: string) {
  return path.join(path.dirname(getDatabasePath()), 'attachments', 'contracts', contractId);
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getFileType(filePath: string): ContractAttachment['fileType'] {
  const extension = path.extname(filePath).toLowerCase();
  if (imageExtensions.has(extension)) {
    return 'image';
  }

  if (pdfExtensions.has(extension)) {
    return 'pdf';
  }

  throw new Error('仅支持 JPG、PNG、WEBP 图片或 PDF 文件');
}

function getMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
  };

  return mimeTypes[extension] ?? null;
}

async function renderImagesToPdf(images: ContractAttachment[]) {
  const html = buildPdfHtml(images.map((image) => image.storedPath));
  const tempHtmlPath = path.join(os.tmpdir(), `haige-contract-pdf-${Date.now()}-${crypto.randomUUID()}.html`);
  fs.writeFileSync(tempHtmlPath, html, 'utf8');

  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  try {
    await window.loadFile(tempHtmlPath);
    return await window.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: {
        marginType: 'none',
      },
    });
  } finally {
    window.close();
    fs.rmSync(tempHtmlPath, { force: true });
  }
}

function buildPdfHtml(imagePaths: string[]) {
  const imageTags = imagePaths
    .map((imagePath) => `<section class="page"><img src="${pathToFileURL(imagePath).href}" /></section>`)
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 0; }
          html, body { margin: 0; padding: 0; background: #fff; }
          .page {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .page:last-child { page-break-after: auto; }
          img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>${imageTags}</body>
    </html>
  `;
}
