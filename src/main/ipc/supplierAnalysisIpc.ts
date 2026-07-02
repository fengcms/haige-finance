import { SupplierAnalysisService } from '../services/supplierAnalysisService.js';
import { registerIpcHandler } from './helpers.js';

export function registerSupplierAnalysisIpc() {
  const service = new SupplierAnalysisService();

  registerIpcHandler('supplier-analysis:get', (payload) => service.getAnalysis(payload));
}
