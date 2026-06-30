import type { Contract } from './contract.js';
import type { CustomerProject } from './project.js';
import type { TransactionListItem } from './transaction.js';

export interface ProjectStats {
  projectId: string;
  contractAmountCents: number;
  receivedCents: number;
  expenseCents: number;
  receivableCents: number;
  currentProfitCents: number;
  expectedProfitCents: number;
  receiptStatus: ProjectReceiptStatus;
}

export type ProjectReceiptStatus = 'not_started' | 'partial' | 'paid' | 'overpaid';

export interface ProjectStatsListItem extends CustomerProject {
  customerName?: string | null;
  stats: ProjectStats;
}

export interface ProjectStatsDetail {
  project: CustomerProject & { customerName?: string | null };
  stats: ProjectStats;
  contracts: Contract[];
  transactions: TransactionListItem[];
}
