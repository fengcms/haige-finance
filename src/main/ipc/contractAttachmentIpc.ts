import { ContractAttachmentService } from '../services/contractAttachmentService.js';
import { registerIpcHandler } from './helpers.js';

export function registerContractAttachmentIpc() {
  const service = new ContractAttachmentService();

  registerIpcHandler('contract-attachments:list', (payload) => service.list(payload));
  registerIpcHandler('contract-attachments:import-files', (payload) => service.importFiles(payload));
  registerIpcHandler('contract-attachments:reorder', (payload) => service.reorder(payload));
  registerIpcHandler('contract-attachments:rename', (payload) => service.rename(payload));
  registerIpcHandler('contract-attachments:delete', (payload) => service.remove(payload));
  registerIpcHandler('contract-attachments:open-file', (payload) => service.openFile(payload));
  registerIpcHandler('contract-attachments:preview', (payload) => service.getPreview(payload));
  registerIpcHandler('contract-attachments:generate-pdf', (payload) => service.generatePdf(payload));
}
