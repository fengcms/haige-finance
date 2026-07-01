import type { BackupResult, ExportResult, MaintenanceInfo, RestoreResult, UndoRestoreResult } from '@/shared/types/maintenance';
import { unwrapResult } from './client';

export const maintenanceApi = {
  info: () => unwrapResult(getHaigeApi().maintenance.info()) as Promise<MaintenanceInfo>,
  backupDatabase: () => unwrapResult(getHaigeApi().maintenance.backupDatabase()) as Promise<BackupResult>,
  restoreDatabase: () => unwrapResult(getHaigeApi().maintenance.restoreDatabase()) as Promise<RestoreResult | null>,
  undoLastRestore: () => unwrapResult(getHaigeApi().maintenance.undoLastRestore()) as Promise<UndoRestoreResult>,
  exportExcel: () => unwrapResult(getHaigeApi().maintenance.exportExcel()) as Promise<ExportResult>,
};

function getHaigeApi() {
  if (!window.haige) {
    throw new Error('Electron preload API 未加载。请在 Electron 窗口中使用本系统。');
  }

  if (!window.haige.maintenance) {
    throw new Error('Electron preload API 版本过旧，缺少备份导出接口。请完全停止 pnpm dev 后重新启动。');
  }

  return window.haige;
}
