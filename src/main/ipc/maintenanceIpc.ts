import { BackupService } from '../backup/backupService.js';
import { ExportService } from '../export/exportService.js';
import { registerIpcHandler } from './helpers.js';

export function registerMaintenanceIpc() {
  const backupService = new BackupService();
  const exportService = new ExportService();

  registerIpcHandler('maintenance:info', () => backupService.getInfo());
  registerIpcHandler('maintenance:backup-database', () => backupService.backupDatabase());
  registerIpcHandler('maintenance:export-excel', () => exportService.exportExcel());
}
