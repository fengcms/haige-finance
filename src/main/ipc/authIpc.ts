import { AuthService } from '../services/authService.js';
import { registerIpcHandler } from './helpers.js';

export function registerAuthIpc() {
  const service = new AuthService();

  registerIpcHandler('auth:status', () => service.getStatus());
  registerIpcHandler('auth:setup-password', (payload) => service.setupPassword(payload));
  registerIpcHandler('auth:login', (payload) => service.login(payload));
  registerIpcHandler('auth:change-password', (payload) => service.changePassword(payload));
}
