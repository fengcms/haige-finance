import type { ProjectExpenseType } from '../constants/enums.js';

export interface SupplierAnalysisQuery {
  startDate?: string;
  endDate?: string;
  supplierId?: string;
  projectId?: string;
  expenseType?: ProjectExpenseType;
}

export interface SupplierAnalysisSummary {
  totalAmountCents: number;
  supplierCount: number;
  orderCount: number;
  averageOrderAmountCents: number;
  latestOccurredDate?: string | null;
}

export interface SupplierExpenseRankItem {
  supplierId?: string | null;
  supplierName: string;
  amountCents: number;
  orderCount: number;
}

export interface SupplierExpenseTrendItem {
  period: string;
  amountCents: number;
  orderCount: number;
}

export interface SupplierProjectDistributionItem {
  projectId: string;
  projectName: string;
  customerName?: string | null;
  amountCents: number;
  orderCount: number;
}

export interface SupplierExpenseDetailItem {
  id: string;
  occurredDate: string;
  supplierId?: string | null;
  supplierName?: string | null;
  customerId: string;
  customerName?: string | null;
  projectId: string;
  projectName?: string | null;
  expenseType: ProjectExpenseType;
  totalAmountCents: number;
  attachmentCount: number;
  remark?: string | null;
}

export interface SupplierAnalysisBundle {
  query: Required<Pick<SupplierAnalysisQuery, 'startDate' | 'endDate'>> & Omit<SupplierAnalysisQuery, 'startDate' | 'endDate'>;
  trendGranularity: 'day' | 'month';
  summary: SupplierAnalysisSummary;
  supplierRank: SupplierExpenseRankItem[];
  trend: SupplierExpenseTrendItem[];
  projectDistribution: SupplierProjectDistributionItem[];
  details: SupplierExpenseDetailItem[];
}
