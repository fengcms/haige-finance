import dayjs from 'dayjs';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { closeDatabase, getDatabasePath, getSqlite } from '../db/index.js';
import { migrateDatabase } from '../db/migrate.js';
import { seedDatabase } from '../db/seed.js';
import type { BackupResult, MaintenanceInfo, RestoreRecord, RestoreResult, UndoRestoreResult } from '../../shared/types/maintenance.js';

const restoreNote = '恢复数据库会替换当前账本。系统会先自动备份当前数据库；恢复成功后建议重启应用。如发现问题，可以撤销最近一次恢复。';
const requiredRestoreTables = ['customers', 'projects', 'contracts', 'accounts', 'categories', 'transactions'];

export class BackupService {
  getInfo(): MaintenanceInfo {
    const databasePath = getDatabasePath();
    const baseDir = path.dirname(databasePath);
    const restorePointDir = ensureDir(path.join(baseDir, 'restore-points'));

    return {
      databasePath,
      backupDir: ensureDir(path.join(baseDir, 'backups')),
      exportDir: ensureDir(path.join(baseDir, 'exports')),
      restorePointDir,
      restoreNote,
      lastRestore: readLastRestore(restorePointDir),
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

  async restoreDatabase(): Promise<RestoreResult | null> {
    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog({
      title: '选择要恢复的 SQLite 数据库',
      properties: ['openFile'],
      filters: [
        { name: 'SQLite 数据库', extensions: ['sqlite', 'db', 'sqlite3'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return this.restoreFromFile(result.filePaths[0]);
  }

  async restoreFromFile(sourcePath: string): Promise<RestoreResult> {
    const info = this.getInfo();
    if (path.resolve(sourcePath) === path.resolve(info.databasePath)) {
      throw new Error('不能选择当前正在使用的数据库文件作为恢复来源');
    }
    validateRestoreSource(sourcePath);

    const restoredAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const fileStamp = dayjs().format('YYYYMMDD-HHmmss');
    const restoreId = `restore-${fileStamp}`;
    const beforeRestoreBackupPath = path.join(info.restorePointDir, `before-${restoreId}.sqlite`);

    await getSqlite().backup(beforeRestoreBackupPath);
    closeDatabase();

    try {
      replaceDatabaseFile(info.databasePath, sourcePath);
      migrateDatabase();
      seedDatabase();
      validateRestoreSource(info.databasePath);

      const record: RestoreRecord = {
        restoreId,
        restoredAt,
        sourcePath,
        beforeRestoreBackupPath,
      };
      writeLastRestore(info.restorePointDir, record);

      return {
        databasePath: info.databasePath,
        sourcePath,
        beforeRestoreBackupPath,
        restoredAt,
        message: '数据库恢复成功，建议重启应用后继续使用。',
      };
    } catch (error) {
      closeDatabase();
      replaceDatabaseFile(info.databasePath, beforeRestoreBackupPath);
      migrateDatabase();
      seedDatabase();
      throw error;
    }
  }

  async undoLastRestore(): Promise<UndoRestoreResult> {
    const info = this.getInfo();
    const lastRestore = info.lastRestore;
    if (!lastRestore) {
      throw new Error('没有可撤销的恢复记录');
    }

    if (!fs.existsSync(lastRestore.beforeRestoreBackupPath)) {
      throw new Error('恢复前备份文件不存在，无法撤销');
    }

    validateRestoreSource(lastRestore.beforeRestoreBackupPath);

    const undoneAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const fileStamp = dayjs().format('YYYYMMDD-HHmmss');
    const beforeUndoBackupPath = path.join(info.restorePointDir, `before-undo-${fileStamp}.sqlite`);

    await getSqlite().backup(beforeUndoBackupPath);
    closeDatabase();

    try {
      replaceDatabaseFile(info.databasePath, lastRestore.beforeRestoreBackupPath);
      migrateDatabase();
      seedDatabase();
      validateRestoreSource(info.databasePath);
      clearLastRestore(info.restorePointDir);

      return {
        databasePath: info.databasePath,
        restoredFromPath: lastRestore.beforeRestoreBackupPath,
        beforeUndoBackupPath,
        undoneAt,
        message: '已撤销最近一次恢复，建议重启应用后继续使用。',
      };
    } catch (error) {
      closeDatabase();
      replaceDatabaseFile(info.databasePath, beforeUndoBackupPath);
      migrateDatabase();
      seedDatabase();
      throw error;
    }
  }
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function validateRestoreSource(databasePath: string) {
  if (!fs.existsSync(databasePath)) {
    throw new Error('数据库文件不存在');
  }

  let db: Database.Database | null = null;
  try {
    db = new Database(databasePath, { readonly: true, fileMustExist: true });
    db.pragma('quick_check');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => String((row as { name: string }).name));

    for (const table of requiredRestoreTables) {
      if (!tables.includes(table)) {
        throw new Error(`恢复文件缺少必要数据表：${table}`);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`恢复文件校验失败：${error.message}`);
    }
    throw new Error('恢复文件校验失败');
  } finally {
    db?.close();
  }
}

function replaceDatabaseFile(targetPath: string, sourcePath: string) {
  ensureDir(path.dirname(targetPath));
  removeWalFiles(targetPath);
  fs.copyFileSync(sourcePath, targetPath);
  removeWalFiles(targetPath);
}

function removeWalFiles(databasePath: string) {
  for (const filePath of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`]) {
    if (filePath === databasePath) {
      continue;
    }
    fs.rmSync(filePath, { force: true });
  }
}

function lastRestorePath(restorePointDir: string) {
  return path.join(restorePointDir, 'last-restore.json');
}

function readLastRestore(restorePointDir: string): RestoreRecord | null {
  const filePath = lastRestorePath(restorePointDir);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as RestoreRecord;
  } catch {
    return null;
  }
}

function writeLastRestore(restorePointDir: string, record: RestoreRecord) {
  fs.writeFileSync(lastRestorePath(restorePointDir), JSON.stringify(record, null, 2), 'utf8');
}

function clearLastRestore(restorePointDir: string) {
  fs.rmSync(lastRestorePath(restorePointDir), { force: true });
}
