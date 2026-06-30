export interface MaintenanceInfo {
  databasePath: string;
  backupDir: string;
  exportDir: string;
  restoreNote: string;
}

export interface BackupResult {
  databasePath: string;
  backupPath: string;
  createdAt: string;
}

export interface ExportResult {
  exportPath: string;
  createdAt: string;
  sheets: string[];
}
