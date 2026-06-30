import { z } from 'zod';
import {
  createTransactionSchema,
  transactionListQuerySchema,
  updateTransactionSchema,
  voidTransactionSchema,
} from '../../shared/schemas/transaction.js';
import type { ListResult } from '../../shared/types/api.js';
import type { AccountBalance, TransactionListItem, TransactionListQuery } from '../../shared/types/transaction.js';
import { TransactionRepository } from '../repositories/transactionRepository.js';

type TransactionInput = Record<string, unknown>;

export class TransactionService {
  constructor(private readonly repository = new TransactionRepository()) {}

  list(query: unknown): ListResult<TransactionListItem> {
    return this.repository.list(transactionListQuerySchema.parse(cleanInput(query)) as TransactionListQuery | undefined);
  }

  create(input: unknown): TransactionListItem {
    const now = Date.now();
    const data = createTransactionSchema.parse(cleanInput(input)) as TransactionInput;
    this.validateRelations(data);

    return this.repository.create({
      ...data,
      id: crypto.randomUUID(),
      status: 'normal',
      voidedAt: null,
      voidReason: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  update(id: string, input: unknown): TransactionListItem {
    z.string().min(1).parse(id);
    const data = updateTransactionSchema.parse(cleanInput(input)) as TransactionInput;
    const existing = this.repository.findById(id);

    if (!existing) {
      throw new Error('流水不存在或已删除');
    }

    this.validateRelations({ ...existing, ...data });

    return this.repository.update(id, {
      ...data,
      updatedAt: Date.now(),
    });
  }

  void(input: unknown): TransactionListItem {
    const { id, reason } = voidTransactionSchema.parse(cleanInput(input));
    return this.repository.void(id, Date.now(), reason);
  }

  remove(id: string): { id: string } {
    z.string().min(1).parse(id);
    return this.repository.softDelete(id, Date.now());
  }

  getAccountBalances(): AccountBalance[] {
    return this.repository.getAccountBalances();
  }

  private validateRelations(data: TransactionInput) {
    if (typeof data.accountId === 'string' && !this.repository.exists('accounts', data.accountId)) {
      throw new Error('关联账户不存在');
    }

    if (typeof data.categoryId === 'string' && !this.repository.exists('categories', data.categoryId)) {
      throw new Error('关联分类不存在');
    }

    if (typeof data.customerId === 'string' && !this.repository.exists('customers', data.customerId)) {
      throw new Error('关联客户不存在');
    }

    if (typeof data.projectId === 'string' && !this.repository.exists('projects', data.projectId)) {
      throw new Error('关联项目不存在');
    }

    if (typeof data.employeeId === 'string' && !this.repository.exists('employees', data.employeeId)) {
      throw new Error('关联员工不存在');
    }

    if (
      typeof data.customerId === 'string' &&
      typeof data.projectId === 'string' &&
      !this.repository.projectBelongsToCustomer(data.projectId, data.customerId)
    ) {
      throw new Error('所选项目不属于所选客户');
    }
  }
}

function cleanInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value === '' ? undefined : value]),
  );
}
