import { ProjectExpenseAttachmentService } from '../services/projectExpenseAttachmentService.js';
import { registerIpcHandler } from './helpers.js';

export function registerProjectExpenseAttachmentIpc() {
  const service = new ProjectExpenseAttachmentService();

  registerIpcHandler('project-expense-attachments:list', (payload) => service.list(payload));
  registerIpcHandler('project-expense-attachments:import-files', (payload) => service.importFiles(payload));
  registerIpcHandler('project-expense-attachments:create-from-data-url', (payload) => service.createFromDataUrl(payload));
  registerIpcHandler('project-expense-attachments:preview', (payload) => service.getPreview(payload));
  registerIpcHandler('project-expense-attachments:delete', (payload) => service.remove(payload));
}
