import { SettingsService } from '../services/settingsService.js';
import { registerIpcHandler } from './helpers.js';

export function registerSettingsIpc() {
  const service = new SettingsService();

  registerIpcHandler('settings:get', () => service.get());
  registerIpcHandler('settings:update', (payload) => service.update(payload));
}
