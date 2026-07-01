import type { DictionaryItem, DictionaryQuery, UpdateDictionaryItemInput } from '@/shared/types/dictionary';
import { unwrapResult } from './client';

export const dictionaryApi = {
  list: (query?: DictionaryQuery) => unwrapResult(getHaigeApi().dictionaries.list(query)) as Promise<DictionaryItem[]>,
  update: (id: string, input: UpdateDictionaryItemInput) =>
    unwrapResult(getHaigeApi().dictionaries.update(id, input)) as Promise<DictionaryItem>,
};

function getHaigeApi() {
  if (!window.haige) {
    throw new Error('Electron preload API 未加载。请在 Electron 窗口中使用本系统。');
  }

  if (!window.haige.dictionaries) {
    throw new Error('Electron preload API 版本过旧，缺少字典接口。请完全停止 pnpm dev 后重新启动。');
  }

  return window.haige;
}
