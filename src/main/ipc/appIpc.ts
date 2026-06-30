import { ipcMain } from 'electron';
import { AppService } from '../services/appService.js';

export function registerAppIpc() {
  const appService = new AppService();

  ipcMain.handle('app:ping', () => appService.ping());
}
