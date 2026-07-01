import type { AuthResult, AuthStatus, ChangePasswordInput, LoginInput, SetupPasswordInput } from '@/shared/types/auth';
import { unwrapResult } from './client';

export const authApi = {
  status: () => unwrapResult(getHaigeApi().auth.status()) as Promise<AuthStatus>,
  setupPassword: (input: SetupPasswordInput) => unwrapResult(getHaigeApi().auth.setupPassword(input)) as Promise<AuthResult>,
  login: (input: LoginInput) => unwrapResult(getHaigeApi().auth.login(input)) as Promise<AuthResult>,
  changePassword: (input: ChangePasswordInput) => unwrapResult(getHaigeApi().auth.changePassword(input)) as Promise<AuthResult>,
};

function getHaigeApi() {
  if (!window.haige) {
    throw new Error('Electron preload API 未加载。请在 Electron 窗口中使用本系统。');
  }

  if (!window.haige.auth) {
    throw new Error('Electron preload API 版本过旧，缺少登录接口。请完全停止 pnpm dev 后重新启动。');
  }

  return window.haige;
}
