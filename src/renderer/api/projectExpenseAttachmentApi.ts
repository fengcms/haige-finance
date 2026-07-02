import type { ProjectExpenseAttachment, ProjectExpenseAttachmentPreview } from '@/shared/types/projectExpenseAttachment';
import { unwrapResult } from './client';

export const projectExpenseAttachmentApi = {
  list: (orderId: string) =>
    unwrapResult(getHaigeApi().projectExpenseAttachments.list(orderId)) as Promise<ProjectExpenseAttachment[]>,
  importFiles: (orderId: string) =>
    unwrapResult(getHaigeApi().projectExpenseAttachments.importFiles(orderId)) as Promise<ProjectExpenseAttachment[]>,
  createFromDataUrl: (orderId: string, dataUrl: string, originalName?: string) =>
    unwrapResult(getHaigeApi().projectExpenseAttachments.createFromDataUrl(orderId, dataUrl, originalName)) as Promise<ProjectExpenseAttachment>,
  preview: (id: string) =>
    unwrapResult(getHaigeApi().projectExpenseAttachments.preview(id)) as Promise<ProjectExpenseAttachmentPreview>,
  remove: (id: string) => unwrapResult(getHaigeApi().projectExpenseAttachments.remove(id)),
};

function getHaigeApi() {
  if (!window.haige?.projectExpenseAttachments) {
    throw new Error('Electron preload API 版本过旧，缺少项目费用单附件接口。请完全停止 pnpm dev 后重新启动。');
  }

  return window.haige;
}
