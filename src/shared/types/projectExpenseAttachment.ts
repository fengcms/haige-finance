import type { ProjectExpenseAttachmentSourceType } from '../constants/enums.js';
import type { BaseEntity } from './common.js';

export interface ProjectExpenseAttachment extends BaseEntity {
  orderId: string;
  sourceType: ProjectExpenseAttachmentSourceType;
  originalName: string;
  storedName: string;
  storedPath: string;
  mimeType: string;
  fileExists?: boolean;
  fileSizeBytes?: number | null;
}

export interface ProjectExpenseAttachmentPreview {
  id: string;
  originalName: string;
  mimeType: string;
  dataUrl: string;
}
