import type { ProjectExpenseOperationAction, ProjectExpenseOrderStatus, ProjectExpenseType } from '../constants/enums.js';
import type { BaseEntity } from './common.js';

export interface ProjectExpenseOrder extends BaseEntity {
  customerId: string;
  customerName?: string | null;
  projectId: string;
  projectName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  expenseType: ProjectExpenseType;
  occurredDate: string;
  accountId?: string | null;
  accountName?: string | null;
  status: ProjectExpenseOrderStatus;
  totalAmountCents: number;
  paidTransactionId?: string | null;
  voidedAt?: number | null;
  voidReason?: string | null;
  remark?: string | null;
}

export interface ProjectExpenseItem extends BaseEntity {
  orderId: string;
  name: string;
  spec?: string | null;
  quantity: number;
  unit?: string | null;
  unitPriceCents: number;
  amountCents: number;
  remark?: string | null;
}

export interface ProjectExpenseOperationLog {
  id: string;
  orderId: string;
  itemId?: string | null;
  action: ProjectExpenseOperationAction;
  detail?: string | null;
  createdAt: number;
}

export interface ProjectExpenseOrderListQuery {
  projectId?: string;
  status?: ProjectExpenseOrderStatus;
}

export interface ProjectExpenseOrderDetail {
  order: ProjectExpenseOrder;
  items: ProjectExpenseItem[];
  logs: ProjectExpenseOperationLog[];
}
