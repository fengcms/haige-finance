import type { ProjectExpenseItem, ProjectExpenseOrder, ProjectExpenseOrderDetail, ProjectExpenseOrderListQuery } from '@/shared/types/projectExpense';
import { unwrapResult } from './client';

export const projectExpenseApi = {
  listOrders: (query?: ProjectExpenseOrderListQuery) =>
    unwrapResult(getHaigeApi().projectExpenses.listOrders(query) as Promise<any>) as Promise<ProjectExpenseOrder[]>,
  createOrder: (input: unknown) => unwrapResult(getHaigeApi().projectExpenses.createOrder(input) as Promise<any>) as Promise<ProjectExpenseOrder>,
  updateOrder: (id: string, input: unknown) =>
    unwrapResult(getHaigeApi().projectExpenses.updateOrder(id, input) as Promise<any>) as Promise<ProjectExpenseOrder>,
  removeOrder: (id: string) => unwrapResult(getHaigeApi().projectExpenses.removeOrder(id)),
  getDetail: (id: string) => unwrapResult(getHaigeApi().projectExpenses.getDetail(id) as Promise<any>) as Promise<ProjectExpenseOrderDetail>,
  createItem: (input: unknown) => unwrapResult(getHaigeApi().projectExpenses.createItem(input) as Promise<any>) as Promise<ProjectExpenseItem>,
  createItemsBatch: (input: unknown) =>
    unwrapResult(getHaigeApi().projectExpenses.createItemsBatch(input) as Promise<any>) as Promise<ProjectExpenseItem[]>,
  updateItem: (id: string, input: unknown) =>
    unwrapResult(getHaigeApi().projectExpenses.updateItem(id, input) as Promise<any>) as Promise<ProjectExpenseItem>,
  removeItem: (id: string) => unwrapResult(getHaigeApi().projectExpenses.removeItem(id)),
  confirmOrder: (id: string, accountId: string) =>
    unwrapResult(getHaigeApi().projectExpenses.confirmOrder(id, accountId) as Promise<any>) as Promise<ProjectExpenseOrder>,
  voidOrder: (id: string, reason: string) =>
    unwrapResult(getHaigeApi().projectExpenses.voidOrder(id, reason) as Promise<any>) as Promise<ProjectExpenseOrder>,
};

function getHaigeApi() {
  if (!window.haige?.projectExpenses) {
    throw new Error('Electron preload API 版本过旧，缺少项目费用单接口。请完全停止 pnpm dev 后重新启动。');
  }
  return window.haige;
}
