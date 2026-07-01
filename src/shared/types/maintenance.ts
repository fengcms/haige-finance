export interface MaintenanceInfo {
  databasePath: string;
  backupDir: string;
  exportDir: string;
  restorePointDir: string;
  restoreNote: string;
  lastRestore?: RestoreRecord | null;
}

export interface BackupResult {
  databasePath: string;
  backupPath: string;
  createdAt: string;
}

export interface RestoreRecord {
  restoreId: string;
  restoredAt: string;
  sourcePath: string;
  beforeRestoreBackupPath: string;
}

export interface RestoreResult {
  databasePath: string;
  sourcePath: string;
  beforeRestoreBackupPath: string;
  restoredAt: string;
  message: string;
}

export interface UndoRestoreResult {
  databasePath: string;
  restoredFromPath: string;
  beforeUndoBackupPath: string;
  undoneAt: string;
  message: string;
}

export interface ExportResult {
  exportPath: string;
  createdAt: string;
  sheets: string[];
}
