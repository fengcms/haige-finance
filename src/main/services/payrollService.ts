import { z } from 'zod';
import {
  createPayrollBatchSchema,
  createPayrollItemsBatchSchema,
  createPayrollItemSchema,
  payPayrollBatchSchema,
  payrollBatchListQuerySchema,
  updatePayrollBatchSchema,
  updatePayrollItemSchema,
} from '../../shared/schemas/payroll.js';
import type { PayrollBatch, PayrollBatchDetail, PayrollBatchListQuery, PayrollItem } from '../../shared/types/payroll.js';
import { PayrollRepository } from '../repositories/payrollRepository.js';
import { TransactionRepository } from '../repositories/transactionRepository.js';

type PayrollInput = Record<string, unknown>;

const salaryCategoryId = 'category_salary';

export class PayrollService {
  constructor(
    private readonly repository = new PayrollRepository(),
    private readonly transactionRepository = new TransactionRepository(),
  ) {}

  listBatches(query: unknown): PayrollBatch[] {
    return this.repository.listBatches(payrollBatchListQuerySchema.parse(cleanInput(query)) as PayrollBatchListQuery | undefined);
  }

  createBatch(input: unknown): PayrollBatch {
    const now = Date.now();
    const data = createPayrollBatchSchema.parse(cleanInput(input)) as PayrollInput;
    this.validateBatchRelations(data);

    return this.repository.runInTransaction(() => {
      const batch = this.repository.createBatch({
        ...data,
        id: crypto.randomUUID(),
        status: 'draft',
        totalGrossCents: 0,
        totalDeductionCents: 0,
        totalNetCents: 0,
        paidTransactionId: null,
        voidedAt: null,
        voidReason: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      this.repository.createLog({
        batchId: batch.id,
        action: 'create',
        detail: '创建工资批次',
        createdAt: now,
      });
      return batch;
    });
  }

  updateBatch(id: string, input: unknown): PayrollBatch {
    z.string().min(1).parse(id);
    const data = updatePayrollBatchSchema.parse(cleanInput(input)) as PayrollInput;
    this.validateBatchRelations(data);

    return this.repository.runInTransaction(() => {
      const batch = this.requireBatch(id);
      this.assertBatchEditable(batch, '已发放或已作废的工资批次暂不允许直接编辑');
      const updated = this.repository.updateBatch(id, {
        ...data,
        updatedAt: Date.now(),
      });
      this.repository.createLog({
        batchId: id,
        action: 'update',
        detail: '更新工资批次',
        createdAt: Date.now(),
      });
      return updated;
    });
  }

  removeBatch(id: string): { id: string } {
    z.string().min(1).parse(id);

    return this.repository.runInTransaction(() => {
      const batch = this.requireBatch(id);
      if (batch.status !== 'draft') {
        throw new Error('只有草稿状态的工资批次可以删除');
      }

      const now = Date.now();
      const result = this.repository.softDeleteBatch(id, now);
      this.repository.createLog({
        batchId: id,
        action: 'delete',
        detail: '删除工资批次',
        createdAt: now,
      });
      return result;
    });
  }

  getDetail(id: string): PayrollBatchDetail {
    z.string().min(1).parse(id);
    return {
      batch: this.requireBatch(id),
      items: this.repository.listItems(id),
      logs: this.repository.listLogs(id),
    };
  }

  createItem(input: unknown): PayrollItem {
    const now = Date.now();
    const data = createPayrollItemSchema.parse(cleanInput(input)) as PayrollInput;

    return this.repository.runInTransaction(() => {
      const batch = this.requireBatch(String(data.batchId));
      this.assertBatchEditable(batch, '已发放或已作废的工资批次暂不允许新增明细');
      this.validateEmployee(String(data.employeeId));
      this.assertNoDuplicateEmployees(batch.id, [data]);
      const calculated = calculatePayrollItem(data);
      const item = this.repository.createItem({
        ...calculated,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      this.repository.recalculateBatchTotals(item.batchId, now);
      this.repository.createLog({
        batchId: item.batchId,
        itemId: item.id,
        action: 'create',
        detail: `新增工资明细：${item.employeeName ?? item.employeeId}`,
        createdAt: now,
      });
      return item;
    });
  }

  createItemsBatch(input: unknown): PayrollItem[] {
    const now = Date.now();
    const data = createPayrollItemsBatchSchema.parse(cleanInput(input)) as { batchId: string; items: PayrollInput[] };

    return this.repository.runInTransaction(() => {
      const batch = this.requireBatch(data.batchId);
      this.assertBatchEditable(batch, '已发放或已作废的工资批次暂不允许批量新增明细');
      this.assertNoDuplicateEmployees(data.batchId, data.items);

      const createdItems = data.items.map((itemInput) => {
        this.validateEmployee(String(itemInput.employeeId));
        const calculated = calculatePayrollItem({ ...itemInput, batchId: data.batchId });
        return this.repository.createItem({
          ...calculated,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
      });

      this.repository.recalculateBatchTotals(data.batchId, now);
      this.repository.createLog({
        batchId: data.batchId,
        action: 'create',
        detail: `批量新增工资明细：${createdItems.length} 人`,
        createdAt: now,
      });
      return createdItems;
    });
  }

  updateItem(id: string, input: unknown): PayrollItem {
    z.string().min(1).parse(id);
    const data = updatePayrollItemSchema.parse(cleanInput(input)) as PayrollInput;

    return this.repository.runInTransaction(() => {
      const existing = this.requireItem(id);
      const batch = this.requireBatch(existing.batchId);
      this.assertBatchAdjustable(batch, '已作废的工资批次不能修改明细');

      if (typeof data.employeeId === 'string') {
        this.validateEmployee(data.employeeId);
      }

      const now = Date.now();
      const calculated = calculatePayrollItem({ ...existing, ...data, batchId: existing.batchId });
      const item = this.repository.updateItem(id, {
        ...calculated,
        updatedAt: now,
      });

      const updatedBatch = this.repository.recalculateBatchTotals(item.batchId, now);
      if (batch.status === 'paid') {
        if (!batch.paidTransactionId) {
          throw new Error('已发放工资缺少关联流水，不能调整');
        }
        this.transactionRepository.update(batch.paidTransactionId, {
          amountCents: updatedBatch.totalNetCents,
          updatedAt: now,
          remark: `发放工资：${updatedBatch.name}（已调整）`,
        });
      }

      this.repository.createLog({
        batchId: item.batchId,
        itemId: item.id,
        action: batch.status === 'paid' ? 'adjust' : 'update',
        detail: `${batch.status === 'paid' ? '调整已发放工资明细' : '更新工资明细'}：${item.employeeName ?? item.employeeId}`,
        createdAt: now,
      });
      return item;
    });
  }

  removeItem(id: string): { id: string } {
    z.string().min(1).parse(id);

    return this.repository.runInTransaction(() => {
      const item = this.requireItem(id);
      const batch = this.requireBatch(item.batchId);
      this.assertBatchEditable(batch, '已发放或已作废的工资批次暂不允许删除明细');

      const now = Date.now();
      const result = this.repository.softDeleteItem(id, now);
      this.repository.recalculateBatchTotals(item.batchId, now);
      this.repository.createLog({
        batchId: item.batchId,
        itemId: id,
        action: 'delete',
        detail: `删除工资明细：${item.employeeName ?? item.employeeId}`,
        createdAt: now,
      });
      return result;
    });
  }

  confirmBatch(id: string): PayrollBatch {
    z.string().min(1).parse(id);

    return this.repository.runInTransaction(() => {
      const batch = this.requireBatch(id);
      if (batch.status !== 'draft') {
        throw new Error('只有草稿状态的工资批次可以确认');
      }

      const items = this.repository.listItems(id);
      if (items.length === 0) {
        throw new Error('工资批次至少需要一条明细才能确认');
      }

      const now = Date.now();
      const updated = this.repository.updateBatch(id, {
        status: 'confirmed',
        updatedAt: now,
      });
      this.repository.createLog({
        batchId: id,
        action: 'confirm',
        detail: '确认工资批次',
        createdAt: now,
      });
      return updated;
    });
  }

  cancelConfirmBatch(id: string): PayrollBatch {
    z.string().min(1).parse(id);

    return this.repository.runInTransaction(() => {
      const batch = this.requireBatch(id);
      if (batch.status !== 'confirmed') {
        throw new Error('只有已确认状态的工资批次可以撤销确认');
      }

      const now = Date.now();
      const updated = this.repository.updateBatch(id, {
        status: 'draft',
        updatedAt: now,
      });
      this.repository.createLog({
        batchId: id,
        action: 'cancel_confirm',
        detail: '撤销确认工资批次',
        createdAt: now,
      });
      return updated;
    });
  }

  payBatch(input: unknown): PayrollBatch {
    const data = payPayrollBatchSchema.parse(cleanInput(input)) as { id: string; accountId: string; payDate: string; remark?: string | null };

    return this.repository.runInTransaction(() => {
      const batch = this.requireBatch(data.id);
      if (batch.status !== 'confirmed') {
        throw new Error('只有已确认状态的工资批次可以发放');
      }

      if (batch.totalNetCents <= 0) {
        throw new Error('实发工资必须大于 0 才能发放');
      }

      if (!this.repository.exists('accounts', data.accountId)) {
        throw new Error('发放账户不存在');
      }

      if (!this.repository.exists('categories', salaryCategoryId)) {
        throw new Error('默认人工工资分类不存在，请检查初始化数据');
      }

      const now = Date.now();
      const transaction = this.transactionRepository.create({
        id: crypto.randomUUID(),
        transactionNo: null,
        direction: 'expense',
        amountCents: batch.totalNetCents,
        occurredDate: data.payDate,
        accountId: data.accountId,
        categoryId: salaryCategoryId,
        fundType: 'salary',
        isCompanyFund: true,
        affectsReceivable: false,
        affectsProjectProfit: false,
        customerId: null,
        projectId: null,
        employeeId: null,
        status: 'normal',
        voidedAt: null,
        voidReason: null,
        remark: data.remark || `发放工资：${batch.name}`,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      const updated = this.repository.updateBatch(batch.id, {
        accountId: data.accountId,
        payDate: data.payDate,
        status: 'paid',
        paidTransactionId: transaction.id,
        updatedAt: now,
      });

      this.repository.createLog({
        batchId: batch.id,
        action: 'pay',
        detail: `发放工资，生成流水 ${transaction.transactionNo || transaction.id}`,
        createdAt: now,
      });
      return updated;
    });
  }

  voidBatch(id: string, reason: string): PayrollBatch {
    z.string().min(1).parse(id);
    z.string().trim().min(1).parse(reason);

    return this.repository.runInTransaction(() => {
      const batch = this.requireBatch(id);
      if (batch.status === 'voided') {
        throw new Error('工资批次已作废');
      }

      if (batch.status === 'paid') {
        if (!batch.paidTransactionId) {
          throw new Error('已发放工资缺少关联流水，不能作废');
        }
        this.transactionRepository.void(batch.paidTransactionId, Date.now(), `工资批次作废：${reason}`);
      }

      const now = Date.now();
      const updated = this.repository.updateBatch(id, {
        status: 'voided',
        voidedAt: now,
        voidReason: reason,
        updatedAt: now,
      });
      this.repository.createLog({
        batchId: id,
        action: 'void',
        detail: reason,
        createdAt: now,
      });
      return updated;
    });
  }

  private requireBatch(id: string): PayrollBatch {
    const batch = this.repository.findBatchById(id);
    if (!batch) {
      throw new Error('工资批次不存在或已删除');
    }
    return batch;
  }

  private requireItem(id: string): PayrollItem {
    const item = this.repository.findItemById(id);
    if (!item) {
      throw new Error('工资明细不存在或已删除');
    }
    return item;
  }

  private assertBatchEditable(batch: PayrollBatch, message: string) {
    if (!['draft', 'confirmed'].includes(batch.status)) {
      throw new Error(message);
    }
  }

  private assertBatchAdjustable(batch: PayrollBatch, message: string) {
    if (!['draft', 'confirmed', 'paid'].includes(batch.status)) {
      throw new Error(message);
    }
  }

  private validateBatchRelations(data: PayrollInput) {
    if (typeof data.accountId === 'string' && !this.repository.exists('accounts', data.accountId)) {
      throw new Error('关联账户不存在');
    }
  }

  private validateEmployee(employeeId: string) {
    if (!this.repository.exists('employees', employeeId)) {
      throw new Error('关联员工不存在');
    }
  }

  private assertNoDuplicateEmployees(batchId: string, items: PayrollInput[]) {
    const employeeIds = items.map((item) => String(item.employeeId));
    const duplicatedInInput = employeeIds.find((employeeId, index) => employeeIds.indexOf(employeeId) !== index);

    if (duplicatedInInput) {
      throw new Error('批量工资明细中存在重复员工');
    }

    for (const employeeId of employeeIds) {
      if (this.repository.employeeHasItem(batchId, employeeId)) {
        throw new Error('所选员工已存在工资明细，不能重复录入');
      }
    }
  }
}

function calculatePayrollItem(input: PayrollInput): PayrollInput {
  const baseSalaryCents = toMoney(input.baseSalaryCents);
  const attendanceBonusCents = toMoney(input.attendanceBonusCents);
  const phoneAllowanceCents = toMoney(input.phoneAllowanceCents);
  const bonusCents = toMoney(input.bonusCents);
  const commissionCents = toMoney(input.commissionCents);
  const deductionCents = toMoney(input.deductionCents);
  const grossSalaryCents = baseSalaryCents + attendanceBonusCents + phoneAllowanceCents + bonusCents + commissionCents;
  const netSalaryCents = grossSalaryCents - deductionCents;

  if (netSalaryCents < 0) {
    throw new Error('扣款金额不能大于应发工资');
  }

  return {
    ...input,
    baseSalaryCents,
    attendanceBonusCents,
    phoneAllowanceCents,
    bonusCents,
    commissionCents,
    deductionCents,
    socialInsuranceCents: toMoney(input.socialInsuranceCents),
    housingFundCents: toMoney(input.housingFundCents),
    taxCents: toMoney(input.taxCents),
    grossSalaryCents,
    netSalaryCents,
  };
}

function toMoney(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function cleanInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }

  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, value === '' ? undefined : value]));
}
