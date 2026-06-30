import type { AccountBalance, Transaction, TransactionListItem, TransactionListQuery } from '@/shared/types/transaction';
import type { ListResult } from '@/shared/types/api';
import { unwrapResult } from './client';

export const transactionApi = {
  list: (query?: TransactionListQuery) =>
    unwrapResult(getHaigeApi().transactions.list(query) as Promise<any>) as Promise<ListResult<TransactionListItem>>,
  create: (input: unknown) => unwrapResult(getHaigeApi().transactions.create(input) as Promise<any>) as Promise<Transaction>,
  update: (id: string, input: unknown) => unwrapResult(getHaigeApi().transactions.update(id, input) as Promise<any>) as Promise<Transaction>,
  void: (id: string, reason: string) => unwrapResult(getHaigeApi().transactions.void(id, reason) as Promise<any>) as Promise<TransactionListItem>,
  remove: (id: string) => unwrapResult(getHaigeApi().transactions.remove(id)),
  accountBalances: () => unwrapResult(getHaigeApi().transactions.accountBalances() as Promise<any>) as Promise<AccountBalance[]>,
};

function getHaigeApi() {
  if (!window.haige) {
    throw new Error('Electron preload API 未加载。请在 Electron 窗口中使用本系统。');
  }

  if (!window.haige.transactions) {
    throw new Error('Electron preload API 版本过旧，缺少财务流水接口。请完全停止 pnpm dev 后重新启动。');
  }

  return window.haige;
}
