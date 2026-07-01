import type { ContractAttachment, ContractAttachmentPreview, GenerateContractPdfResult } from '@/shared/types/contractAttachment';
import { unwrapResult } from './client';

export const contractAttachmentApi = {
  list: (contractId: string) => unwrapResult(getHaigeApi().contractAttachments.list(contractId)) as Promise<ContractAttachment[]>,
  importFiles: (contractId: string) => unwrapResult(getHaigeApi().contractAttachments.importFiles(contractId)) as Promise<ContractAttachment[]>,
  reorder: (contractId: string, orderedIds: string[]) =>
    unwrapResult(getHaigeApi().contractAttachments.reorder(contractId, orderedIds)) as Promise<ContractAttachment[]>,
  rename: (id: string, originalName: string) =>
    unwrapResult(getHaigeApi().contractAttachments.rename(id, originalName)) as Promise<ContractAttachment>,
  remove: (id: string) => unwrapResult(getHaigeApi().contractAttachments.remove(id)),
  openFile: (id: string) => unwrapResult(getHaigeApi().contractAttachments.openFile(id)),
  preview: (id: string) => unwrapResult(getHaigeApi().contractAttachments.preview(id)) as Promise<ContractAttachmentPreview>,
  generatePdf: (contractId: string) =>
    unwrapResult(getHaigeApi().contractAttachments.generatePdf(contractId)) as Promise<GenerateContractPdfResult>,
};

function getHaigeApi() {
  if (!window.haige) {
    throw new Error('Electron preload API 未加载。请在 Electron 窗口中使用本系统。');
  }

  if (!window.haige.contractAttachments) {
    throw new Error('Electron preload API 版本过旧，缺少合同附件接口。请完全停止 pnpm dev 后重新启动。');
  }

  return window.haige;
}
