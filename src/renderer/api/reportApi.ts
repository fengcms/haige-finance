import type { ReportBundle, ReportQuery } from '@/shared/types/report';
import { unwrapResult } from './client';

export const reportApi = {
  get: (query?: ReportQuery) => unwrapResult(getHaigeApi().reports.get(query)) as Promise<ReportBundle>,
};

function getHaigeApi() {
  if (!window.haige) {
    throw new Error('Electron preload API 未加载。请在 Electron 窗口中使用本系统。');
  }

  if (!window.haige.reports) {
    throw new Error('Electron preload API 版本过旧，缺少报表接口。请完全停止 pnpm dev 后重新启动。');
  }

  return window.haige;
}
