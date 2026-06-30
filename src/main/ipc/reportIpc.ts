import { ReportService } from '../services/reportService.js';
import { registerIpcHandler } from './helpers.js';

export function registerReportIpc() {
  const service = new ReportService();

  registerIpcHandler('reports:get', (payload) => service.getReports(payload));
}
