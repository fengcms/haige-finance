import fs from 'node:fs';
import path from 'node:path';
import {
  createProjectExpenseAttachmentFromDataUrlSchema,
  projectExpenseAttachmentIdPayloadSchema,
  projectExpenseOrderIdPayloadSchema,
} from '../../shared/schemas/projectExpenseAttachment.js';
import type { ProjectExpenseAttachment, ProjectExpenseAttachmentPreview } from '../../shared/types/projectExpenseAttachment.js';
import { getDatabasePath } from '../db/index.js';
import { ProjectExpenseAttachmentRepository } from '../repositories/projectExpenseAttachmentRepository.js';

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const supportedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxImageSizeBytes = 10 * 1024 * 1024;

export class ProjectExpenseAttachmentService {
  constructor(private readonly repository = new ProjectExpenseAttachmentRepository()) {}

  list(orderId: unknown): ProjectExpenseAttachment[] {
    const id = projectExpenseOrderIdPayloadSchema.shape.orderId.parse(orderId);
    return this.repository.list(id).map(withFileState);
  }

  async importFiles(input: unknown): Promise<ProjectExpenseAttachment[]> {
    const { orderId } = projectExpenseOrderIdPayloadSchema.parse(input);
    this.assertOrderCanAddAttachment(orderId);

    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog({
      title: '选择费用单图片',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return this.repository.list(orderId).map(withFileState);
    }

    const imported: ProjectExpenseAttachment[] = [];

    for (const filePath of result.filePaths) {
      imported.push(await this.copyFileToAttachment(orderId, filePath));
    }

    return imported.map(withFileState);
  }

  createFromDataUrl(input: unknown): ProjectExpenseAttachment {
    const { orderId, dataUrl, originalName } = createProjectExpenseAttachmentFromDataUrlSchema.parse(input);
    this.assertOrderCanAddAttachment(orderId);
    const parsed = parseImageDataUrl(dataUrl);
    assertImageSize(parsed.buffer.length);

    const extension = mimeTypeToExtension(parsed.mimeType);
    const nowText = new Date().toISOString().replace(/[:.]/g, '-');
    const storedName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const targetDir = ensureDir(getProjectExpenseAttachmentDir(orderId));
    const storedPath = path.join(targetDir, storedName);
    fs.writeFileSync(storedPath, parsed.buffer);

    const now = Date.now();
    return withFileState(
      this.repository.create({
        id: crypto.randomUUID(),
        orderId,
        sourceType: 'pasted',
        originalName: originalName ?? `粘贴图片-${nowText}${extension}`,
        storedName,
        storedPath,
        mimeType: parsed.mimeType,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }),
    );
  }

  getPreview(input: unknown): ProjectExpenseAttachmentPreview {
    const { id } = projectExpenseAttachmentIdPayloadSchema.parse(input);
    const attachment = this.requireAttachment(id);
    assertFileExists(attachment);
    const data = fs.readFileSync(attachment.storedPath);

    return {
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      dataUrl: `data:${attachment.mimeType};base64,${data.toString('base64')}`,
    };
  }

  remove(input: unknown): { id: string } {
    const { id } = projectExpenseAttachmentIdPayloadSchema.parse(input);
    return this.repository.softDelete(id, Date.now());
  }

  private async copyFileToAttachment(orderId: string, filePath: string): Promise<ProjectExpenseAttachment> {
    const extension = path.extname(filePath).toLowerCase();
    if (!imageExtensions.has(extension)) {
      throw new Error('仅支持 JPG、PNG、WEBP 图片');
    }

    const stat = fs.statSync(filePath);
    assertImageSize(stat.size);
    const mimeType = getMimeType(filePath);
    if (!mimeType) {
      throw new Error('不支持的图片格式');
    }

    const originalName = path.basename(filePath);
    const storedName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const targetDir = ensureDir(getProjectExpenseAttachmentDir(orderId));
    const storedPath = path.join(targetDir, storedName);
    fs.copyFileSync(filePath, storedPath);

    const now = Date.now();
    return this.repository.create({
      id: crypto.randomUUID(),
      orderId,
      sourceType: 'selected',
      originalName,
      storedName,
      storedPath,
      mimeType,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  private assertOrderCanAddAttachment(orderId: string) {
    const status = this.repository.getOrderStatus(orderId);
    if (!status) {
      throw new Error('项目费用单不存在或已删除');
    }
    if (status === 'voided') {
      throw new Error('已作废费用单不能新增附件');
    }
  }

  private requireAttachment(id: string) {
    const attachment = this.repository.findById(id);
    if (!attachment) {
      throw new Error('附件不存在或已删除');
    }
    return attachment;
  }
}

function withFileState(attachment: ProjectExpenseAttachment): ProjectExpenseAttachment {
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

function assertFileExists(attachment: ProjectExpenseAttachment) {
  if (!fs.existsSync(attachment.storedPath)) {
    throw new Error(`附件文件不存在：${attachment.originalName}`);
  }
}

function parseImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) {
    throw new Error('仅支持 JPG、PNG、WEBP 图片');
  }

  const mimeType = match[1];
  if (!supportedMimeTypes.has(mimeType)) {
    throw new Error('不支持的图片格式');
  }

  return {
    mimeType,
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function assertImageSize(size: number) {
  if (size > maxImageSizeBytes) {
    throw new Error('单张图片不能超过 10MB');
  }
}

function getProjectExpenseAttachmentDir(orderId: string) {
  return path.join(path.dirname(getDatabasePath()), 'attachments', 'project-expenses', orderId, 'images');
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function mimeTypeToExtension(mimeType: string) {
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  return extensions[mimeType] ?? '.png';
}

function getMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  return mimeTypes[extension] ?? null;
}
