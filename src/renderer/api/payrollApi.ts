import type { PayrollBatch, PayrollBatchDetail, PayrollBatchListQuery, PayrollItem } from '@/shared/types/payroll';
import { unwrapResult } from './client';

export const payrollApi = {
  listBatches: (query?: PayrollBatchListQuery) =>
    unwrapResult(getHaigeApi().payroll.listBatches(query) as Promise<any>) as Promise<PayrollBatch[]>,
  createBatch: (input: unknown) => unwrapResult(getHaigeApi().payroll.createBatch(input) as Promise<any>) as Promise<PayrollBatch>,
  updateBatch: (id: string, input: unknown) =>
    unwrapResult(getHaigeApi().payroll.updateBatch(id, input) as Promise<any>) as Promise<PayrollBatch>,
  removeBatch: (id: string) => unwrapResult(getHaigeApi().payroll.removeBatch(id)),
  getDetail: (id: string) => unwrapResult(getHaigeApi().payroll.getDetail(id) as Promise<any>) as Promise<PayrollBatchDetail>,
  createItem: (input: unknown) => unwrapResult(getHaigeApi().payroll.createItem(input) as Promise<any>) as Promise<PayrollItem>,
  createItemsBatch: (input: unknown) =>
    unwrapResult(getHaigeApi().payroll.createItemsBatch(input) as Promise<any>) as Promise<PayrollItem[]>,
  updateItem: (id: string, input: unknown) =>
    unwrapResult(getHaigeApi().payroll.updateItem(id, input) as Promise<any>) as Promise<PayrollItem>,
  removeItem: (id: string) => unwrapResult(getHaigeApi().payroll.removeItem(id)),
  confirmBatch: (id: string) => unwrapResult(getHaigeApi().payroll.confirmBatch(id) as Promise<any>) as Promise<PayrollBatch>,
  cancelConfirmBatch: (id: string) =>
    unwrapResult(getHaigeApi().payroll.cancelConfirmBatch(id) as Promise<any>) as Promise<PayrollBatch>,
  payBatch: (input: unknown) => unwrapResult(getHaigeApi().payroll.payBatch(input) as Promise<any>) as Promise<PayrollBatch>,
  voidBatch: (id: string, reason: string) =>
    unwrapResult(getHaigeApi().payroll.voidBatch(id, reason) as Promise<any>) as Promise<PayrollBatch>,
};

function getHaigeApi() {
  if (!window.haige) {
    throw new Error('Electron preload API 未加载。请在 Electron 窗口中使用本系统。');
  }

  if (!window.haige.payroll) {
    throw new Error('Electron preload API 版本过旧，缺少工资管理接口。请完全停止 pnpm dev 后重新启动。');
  }

  return window.haige;
}
