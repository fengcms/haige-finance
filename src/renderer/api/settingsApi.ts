import type { AppSettings, UpdateAppSettingsInput } from '@/shared/types/settings';
import { unwrapResult } from './client';

export const settingsApi = {
  get: () => unwrapResult(getHaigeApi().settings.get()) as Promise<AppSettings>,
  update: (input: UpdateAppSettingsInput) => unwrapResult(getHaigeApi().settings.update(input)) as Promise<AppSettings>,
};

function getHaigeApi() {
  if (!window.haige?.settings) {
    throw new Error('Electron preload API 版本过旧，缺少系统设置接口。请完全停止 pnpm dev 后重新启动。');
  }

  return window.haige;
}
