import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDatabase } from './db/index.js';
import { migrateDatabase } from './db/migrate.js';
import { seedDatabase } from './db/seed.js';
import { registerAppIpc } from './ipc/appIpc.js';
import { registerMasterDataIpc } from './ipc/masterDataIpc.js';
import { registerProjectStatsIpc } from './ipc/projectStatsIpc.js';
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
          'Boolean(window.haige && window.haige.appPing && window.haige.transactions && window.haige.transactions.list && window.haige.projectStats && window.haige.projectStats.list)',
        )
        .then((isPreloadReady) => {
          console.log(`[preload] haige api ready: ${isPreloadReady}`);
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
  registerMasterDataIpc();
  registerTransactionIpc();
  registerProjectStatsIpc();
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
