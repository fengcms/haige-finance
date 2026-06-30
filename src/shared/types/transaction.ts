import type { FundType, TransactionDirection, TransactionStatus } from '../constants/enums.js';
import type { BaseEntity } from './common.js';
import type { ListQuery } from './api.js';

export interface Transaction extends BaseEntity {
  transactionNo?: string | null;
  direction: TransactionDirection;
  amountCents: number;
  occurredDate: string;
  accountId: string;
  categoryId: string;
  fundType: FundType;
  isCompanyFund: boolean;
  affectsReceivable: boolean;
  affectsProjectProfit: boolean;
  customerId?: string | null;
  projectId?: string | null;
  employeeId?: string | null;
  status: TransactionStatus;
  voidedAt?: number | null;
  voidReason?: string | null;
  remark?: string | null;
}

export interface TransactionListItem extends Transaction {
  accountName?: string | null;
  categoryName?: string | null;
  customerName?: string | null;
  projectName?: string | null;
  employeeName?: string | null;
}

export interface TransactionListQuery extends ListQuery {
  direction?: TransactionDirection;
  status?: TransactionStatus;
  accountId?: string;
  categoryId?: string;
  customerId?: string;
  projectId?: string;
  employeeId?: string;
  fundType?: FundType;
  startDate?: string;
  endDate?: string;
}

export interface AccountBalance {
  accountId: string;
  accountName: string;
  openingBalanceCents: number;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}
