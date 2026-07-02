import { z } from 'zod';
import {
  confirmProjectExpenseOrderSchema,
  createProjectExpenseItemsBatchSchema,
  createProjectExpenseItemSchema,
  createProjectExpenseOrderSchema,
  projectExpenseOrderListQuerySchema,
  updateProjectExpenseItemSchema,
  updateProjectExpenseOrderSchema,
} from '../../shared/schemas/projectExpense.js';
import type { ProjectExpenseItem, ProjectExpenseOrder, ProjectExpenseOrderDetail, ProjectExpenseOrderListQuery } from '../../shared/types/projectExpense.js';
import type { ProjectExpenseType } from '../../shared/constants/enums.js';
import { ProjectExpenseRepository } from '../repositories/projectExpenseRepository.js';
import { TransactionRepository } from '../repositories/transactionRepository.js';

type Input = Record<string, unknown>;

const expenseTypeAccounting: Record<ProjectExpenseType, { categoryId: string; fundType: string }> = {
  material: { categoryId: 'category_project_material', fundType: 'project_expense' },
  labor: { categoryId: 'category_salary', fundType: 'salary' },
  transport: { categoryId: 'category_other_expense', fundType: 'project_expense' },
  installation: { categoryId: 'category_other_expense', fundType: 'project_expense' },
  repair: { categoryId: 'category_other_expense', fundType: 'project_expense' },
  other: { categoryId: 'category_other_expense', fundType: 'project_expense' },
};

export class ProjectExpenseService {
  constructor(
    private readonly repository = new ProjectExpenseRepository(),
    private readonly transactionRepository = new TransactionRepository(),
  ) {}

  listOrders(query: unknown): ProjectExpenseOrder[] {
    return this.repository.listOrders(projectExpenseOrderListQuerySchema.parse(cleanInput(query)) as ProjectExpenseOrderListQuery | undefined);
  }

  getDetail(id: string): ProjectExpenseOrderDetail {
    z.string().min(1).parse(id);
    const order = this.requireOrder(id);
    return { order, items: this.repository.listItems(id), logs: this.repository.listLogs(id) };
  }

  createOrder(input: unknown): ProjectExpenseOrder {
    const now = Date.now();
    const data = createProjectExpenseOrderSchema.parse(cleanInput(input)) as Input;
    const customerId = this.requireProjectCustomerId(String(data.projectId));
    this.validateRelations(data);
    return this.repository.runInTransaction(() => {
      const order = this.repository.createOrder({
        ...data, customerId, id: crypto.randomUUID(), status: 'draft', totalAmountCents: 0,
        paidTransactionId: null, voidedAt: null, voidReason: null, createdAt: now, updatedAt: now, deletedAt: null,
      });
      this.repository.createLog({ orderId: order.id, action: 'create', detail: '创建项目费用单', createdAt: now });
      return order;
    });
  }

  updateOrder(id: string, input: unknown): ProjectExpenseOrder {
    z.string().min(1).parse(id);
    const data = updateProjectExpenseOrderSchema.parse(cleanInput(input)) as Input;
    this.validateRelations(data);
    return this.repository.runInTransaction(() => {
      const order = this.requireOrder(id);
      this.assertDraft(order);
      const customerId = typeof data.projectId === 'string' ? this.requireProjectCustomerId(data.projectId) : order.customerId;
      const updated = this.repository.updateOrder(id, { ...data, customerId, updatedAt: Date.now() });
      this.repository.createLog({ orderId: id, action: 'update', detail: '更新项目费用单', createdAt: Date.now() });
      return updated;
    });
  }

  removeOrder(id: string): { id: string } {
    z.string().min(1).parse(id);
    return this.repository.runInTransaction(() => {
      const order = this.requireOrder(id);
      this.assertDraft(order);
      const result = this.repository.softDeleteOrder(id, Date.now());
      this.repository.createLog({ orderId: id, action: 'delete', detail: '删除项目费用单', createdAt: Date.now() });
      return result;
    });
  }

  createItem(input: unknown): ProjectExpenseItem {
    const now = Date.now();
    const data = createProjectExpenseItemSchema.parse(cleanInput(input)) as Input;
    return this.repository.runInTransaction(() => {
      const order = this.requireOrder(String(data.orderId));
      this.assertDraft(order);
      const item = this.repository.createItem({ ...calculateItem(data), id: crypto.randomUUID(), createdAt: now, updatedAt: now, deletedAt: null });
      this.repository.recalculateOrderTotal(item.orderId, now);
      this.repository.createLog({ orderId: item.orderId, itemId: item.id, action: 'create', detail: `新增费用明细：${item.name}`, createdAt: now });
      return item;
    });
  }

  createItemsBatch(input: unknown): ProjectExpenseItem[] {
    const now = Date.now();
    const data = createProjectExpenseItemsBatchSchema.parse(cleanInput(input));
    return this.repository.runInTransaction(() => {
      const order = this.requireOrder(data.orderId);
      this.assertDraft(order);
      const items = data.items.map((itemInput) =>
        this.repository.createItem({
          ...calculateItem({ ...itemInput, orderId: data.orderId }),
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        }),
      );
      this.repository.recalculateOrderTotal(data.orderId, now);
      this.repository.createLog({ orderId: data.orderId, action: 'create', detail: `批量新增费用明细 ${items.length} 条`, createdAt: now });
      return items;
    });
  }

  updateItem(id: string, input: unknown): ProjectExpenseItem {
    z.string().min(1).parse(id);
    const data = updateProjectExpenseItemSchema.parse(cleanInput(input)) as Input;
    return this.repository.runInTransaction(() => {
      const existing = this.requireItem(id);
      const order = this.requireOrder(existing.orderId);
      this.assertDraft(order);
      const item = this.repository.updateItem(id, { ...calculateItem({ ...existing, ...data }), updatedAt: Date.now() });
      this.repository.recalculateOrderTotal(item.orderId, Date.now());
      this.repository.createLog({ orderId: item.orderId, itemId: item.id, action: 'update', detail: `更新费用明细：${item.name}`, createdAt: Date.now() });
      return item;
    });
  }

  removeItem(id: string): { id: string } {
    z.string().min(1).parse(id);
    return this.repository.runInTransaction(() => {
      const item = this.requireItem(id);
      const order = this.requireOrder(item.orderId);
      this.assertDraft(order);
      const result = this.repository.softDeleteItem(id, Date.now());
      this.repository.recalculateOrderTotal(item.orderId, Date.now());
      this.repository.createLog({ orderId: item.orderId, itemId: id, action: 'delete', detail: `删除费用明细：${item.name}`, createdAt: Date.now() });
      return result;
    });
  }

  confirmOrder(input: unknown): ProjectExpenseOrder {
    const { id, accountId } = confirmProjectExpenseOrderSchema.parse(cleanInput(input));
    return this.repository.runInTransaction(() => {
      const order = this.requireOrder(id);
      this.assertDraft(order);
      if (order.totalAmountCents <= 0) throw new Error('费用单合计必须大于 0 才能确认');
      if (!this.repository.exists('accounts', accountId)) throw new Error('付款账户不存在');
      const accounting = expenseTypeAccounting[order.expenseType];
      if (!this.repository.exists('categories', accounting.categoryId)) throw new Error('默认费用分类不存在');
      const now = Date.now();
      const transaction = this.transactionRepository.create({
        id: crypto.randomUUID(), transactionNo: null, direction: 'expense', amountCents: order.totalAmountCents,
        occurredDate: order.occurredDate, accountId, categoryId: accounting.categoryId, fundType: accounting.fundType,
        isCompanyFund: true, affectsReceivable: false, affectsProjectProfit: true,
        customerId: order.customerId, projectId: order.projectId, employeeId: null, status: 'normal',
        voidedAt: null, voidReason: null, remark: `项目费用单：${order.remark || order.expenseType}`, createdAt: now, updatedAt: now, deletedAt: null,
      });
      const updated = this.repository.updateOrder(id, { accountId, status: 'confirmed', paidTransactionId: transaction.id, updatedAt: now });
      this.repository.createLog({ orderId: id, action: 'confirm', detail: `确认费用单，生成流水 ${transaction.transactionNo || transaction.id}`, createdAt: now });
      return updated;
    });
  }

  voidOrder(id: string, reason: string): ProjectExpenseOrder {
    z.string().min(1).parse(id);
    z.string().trim().min(1).parse(reason);
    return this.repository.runInTransaction(() => {
      const order = this.requireOrder(id);
      if (order.status === 'voided') throw new Error('项目费用单已作废');
      if (order.status === 'confirmed') {
        if (!order.paidTransactionId) throw new Error('已确认费用单缺少关联流水');
        this.transactionRepository.void(order.paidTransactionId, Date.now(), `项目费用单作废：${reason}`);
      }
      const now = Date.now();
      const updated = this.repository.updateOrder(id, { status: 'voided', voidedAt: now, voidReason: reason, updatedAt: now });
      this.repository.createLog({ orderId: id, action: 'void', detail: reason, createdAt: now });
      return updated;
    });
  }

  private requireOrder(id: string) {
    const order = this.repository.findOrderById(id);
    if (!order) throw new Error('项目费用单不存在或已删除');
    return order;
  }
  private requireItem(id: string) {
    const item = this.repository.findItemById(id);
    if (!item) throw new Error('费用明细不存在或已删除');
    return item;
  }
  private assertDraft(order: ProjectExpenseOrder) {
    if (order.status !== 'draft') throw new Error('只有草稿状态的项目费用单可以编辑');
  }
  private requireProjectCustomerId(projectId: string) {
    const customerId = this.repository.getProjectCustomerId(projectId);
    if (!customerId) throw new Error('关联项目不存在');
    return customerId;
  }
  private validateRelations(data: Input) {
    if (typeof data.projectId === 'string' && !this.repository.exists('projects', data.projectId)) throw new Error('关联项目不存在');
    if (typeof data.supplierId === 'string' && !this.repository.exists('suppliers', data.supplierId)) throw new Error('关联供应商不存在');
    if (typeof data.accountId === 'string' && !this.repository.exists('accounts', data.accountId)) throw new Error('关联账户不存在');
  }
}

function calculateItem(input: Input): Input {
  const quantity = Number(input.quantity ?? 0);
  const unitPriceCents = Number(input.unitPriceCents ?? 0);
  const amountCents = input.amountCents === undefined ? Math.round(quantity * unitPriceCents) : Number(input.amountCents);
  return { ...input, quantity, unitPriceCents, amountCents };
}

function cleanInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, value === '' ? undefined : value]));
}
