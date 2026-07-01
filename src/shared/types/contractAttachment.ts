import type { ContractAttachmentFileType, ContractAttachmentSourceType } from '../constants/enums.js';
import type { BaseEntity } from './common.js';

export interface ContractAttachment extends BaseEntity {
  contractId: string;
  fileType: ContractAttachmentFileType;
  sourceType: ContractAttachmentSourceType;
  originalName: string;
  storedName: string;
  storedPath: string;
  mimeType?: string | null;
  sortOrder: number;
  fileExists?: boolean;
  fileSizeBytes?: number | null;
}

export interface GenerateContractPdfResult {
  attachment: ContractAttachment;
  pageCount: number;
}

export interface ContractAttachmentPreview {
  id: string;
  fileType: ContractAttachmentFileType;
  originalName: string;
  mimeType: string;
  dataUrl: string;
}
