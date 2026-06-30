import { pingResultSchema } from '@/shared/schemas/app';
import type { PingResult } from '@/shared/types/app';

export async function pingApp(): Promise<PingResult> {
  if (!window.haige?.appPing) {
    throw new Error('Electron preload API 未加载。请确认当前页面是在 Electron 窗口中打开，而不是浏览器中的 Vite 页面。');
  }

  const result = await window.haige.appPing();
  return pingResultSchema.parse(result);
}
