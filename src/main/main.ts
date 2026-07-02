import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDatabase } from './db/index.js';
import { migrateDatabase } from './db/migrate.js';
import { seedDatabase } from './db/seed.js';
import { registerAppIpc } from './ipc/appIpc.js';
import { registerAuthIpc } from './ipc/authIpc.js';
import { registerContractAttachmentIpc } from './ipc/contractAttachmentIpc.js';
import { registerDictionaryIpc } from './ipc/dictionaryIpc.js';
import { registerMaintenanceIpc } from './ipc/maintenanceIpc.js';
import { registerMasterDataIpc } from './ipc/masterDataIpc.js';
import { registerPayrollIpc } from './ipc/payrollIpc.js';
import { registerProjectExpenseAttachmentIpc } from './ipc/projectExpenseAttachmentIpc.js';
import { registerProjectExpenseIpc } from './ipc/projectExpenseIpc.js';
import { registerProjectStatsIpc } from './ipc/projectStatsIpc.js';
import { registerReportIpc } from './ipc/reportIpc.js';
import { registerSettingsIpc } from './ipc/settingsIpc.js';
import { registerTransactionIpc } from './ipc/transactionIpc.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 720,
    title: '海哥财务管理',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5173';

  if (!app.isPackaged) {
    void mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });

    mainWindow.webContents.once('did-finish-load', () => {
      void mainWindow.webContents
        .executeJavaScript(
          'window.haige ? { ok: Boolean(window.haige.version && window.haige.appPing && window.haige.auth && window.haige.auth.status && window.haige.transactions && window.haige.transactions.list && window.haige.payroll && window.haige.payroll.listBatches && window.haige.payroll.createItemsBatch && window.haige.projectStats && window.haige.projectStats.list && window.haige.projectExpenses && window.haige.projectExpenses.listOrders && window.haige.projectExpenses.createItemsBatch && window.haige.projectExpenseAttachments && window.haige.projectExpenseAttachments.list && window.haige.reports && window.haige.reports.get && window.haige.settings && window.haige.settings.get && window.haige.maintenance && window.haige.maintenance.info && window.haige.contractAttachments && window.haige.contractAttachments.list && window.haige.dictionaries && window.haige.dictionaries.list), version: window.haige.version } : { ok: false, version: null }',
        )
        .then((preloadStatus) => {
          console.log(`[preload] haige api ready: ${preloadStatus.ok}, version: ${preloadStatus.version}`);
        })
        .catch((error: unknown) => {
          console.error('[preload] failed to verify haige api', error);
        });
    });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  migrateDatabase();
  seedDatabase();
  registerAppIpc();
  registerAuthIpc();
  registerMasterDataIpc();
  registerContractAttachmentIpc();
  registerDictionaryIpc();
  registerTransactionIpc();
  registerPayrollIpc();
  registerProjectExpenseIpc();
  registerProjectExpenseAttachmentIpc();
  registerProjectStatsIpc();
  registerReportIpc();
  registerSettingsIpc();
  registerMaintenanceIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});
