import dayjs from 'dayjs';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabasePath, getSqlite } from '../db/index.js';
import type { BackupResult, MaintenanceInfo } from '../../shared/types/maintenance.js';

const restoreNote = '数据库恢复会替换当前账本文件，需要先关闭数据库连接并重启应用。当前版本只提供备份和路径展示，避免运行中替换文件造成数据损坏。';

export class BackupService {
  getInfo(): MaintenanceInfo {
    const databasePath = getDatabasePath();
    const baseDir = path.dirname(databasePath);

    return {
      databasePath,
      backupDir: ensureDir(path.join(baseDir, 'backups')),
      exportDir: ensureDir(path.join(baseDir, 'exports')),
      restoreNote,
    };
  }

  async backupDatabase(): Promise<BackupResult> {
    const info = this.getInfo();
    const createdAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const fileStamp = dayjs().format('YYYYMMDD-HHmmss');
    const backupPath = path.join(info.backupDir, `haige-finance-backup-${fileStamp}.sqlite`);

    await getSqlite().backup(backupPath);

    return {
      databasePath: info.databasePath,
      backupPath,
      createdAt,
    };
  }
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
