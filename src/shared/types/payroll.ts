import type { PayrollBatchStatus, PayrollOperationAction } from '../constants/enums.js';
import type { BaseEntity } from './common.js';

export interface PayrollBatch extends BaseEntity {
  month: string;
  name: string;
  payDate?: string | null;
  accountId?: string | null;
  status: PayrollBatchStatus;
  totalGrossCents: number;
  totalDeductionCents: number;
  totalNetCents: number;
  paidTransactionId?: string | null;
  voidedAt?: number | null;
  voidReason?: string | null;
  remark?: string | null;
}

export interface PayrollItem extends BaseEntity {
  batchId: string;
  employeeId: string;
  employeeName?: string | null;
  baseSalaryCents: number;
  attendanceBonusCents: number;
  phoneAllowanceCents: number;
  bonusCents: number;
  commissionCents: number;
  deductionCents: number;
  socialInsuranceCents: number;
  housingFundCents: number;
  taxCents: number;
  grossSalaryCents: number;
  netSalaryCents: number;
  remark?: string | null;
}

export interface PayrollOperationLog {
  id: string;
  batchId: string;
  itemId?: string | null;
  action: PayrollOperationAction;
  detail?: string | null;
  createdAt: number;
}

export interface PayrollBatchListQuery {
  month?: string;
  status?: PayrollBatchStatus;
}

export interface PayrollBatchDetail {
  batch: PayrollBatch;
  items: PayrollItem[];
  logs: PayrollOperationLog[];
}
