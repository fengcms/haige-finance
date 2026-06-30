import type { ProjectStatsDetail, ProjectStatsListItem } from '@/shared/types/projectStats';
import { unwrapResult } from './client';

export const projectStatsApi = {
  list: () => unwrapResult(getHaigeApi().projectStats.list()) as Promise<ProjectStatsListItem[]>,
  detail: (projectId: string) => unwrapResult(getHaigeApi().projectStats.detail(projectId)) as Promise<ProjectStatsDetail>,
};

function getHaigeApi() {
  if (!window.haige) {
    throw new Error('Electron preload API 未加载。请在 Electron 窗口中使用本系统。');
  }

  if (!window.haige.projectStats) {
    throw new Error('Electron preload API 版本过旧，缺少项目统计接口。请完全停止 pnpm dev 后重新启动。');
  }

  return window.haige;
}
