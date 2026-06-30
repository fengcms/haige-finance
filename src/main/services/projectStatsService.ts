import { z } from 'zod';
import type { Contract } from '../../shared/types/contract.js';
import type { ProjectStats, ProjectStatsDetail, ProjectStatsListItem } from '../../shared/types/projectStats.js';
import type { TransactionListItem } from '../../shared/types/transaction.js';
import { ProjectStatsRepository, type ProjectStatsRow } from '../repositories/projectStatsRepository.js';

export class ProjectStatsService {
  constructor(private readonly repository = new ProjectStatsRepository()) {}

  list(): ProjectStatsListItem[] {
    return this.repository.listProjectStatsRows().map(mapProjectStatsListItem);
  }

  detail(projectId: unknown): ProjectStatsDetail {
    const id = z.string().min(1).parse(projectId);
    const rows = this.repository.getProjectDetailRows(id);

    if (!rows.project) {
      throw new Error('项目不存在或已删除');
    }

    const project = mapProjectStatsListItem(rows.project);

    return {
      project,
      stats: project.stats,
      contracts: rows.contracts.map(mapContract),
      transactions: rows.transactions.map(mapTransaction),
    };
  }
}

function mapProjectStatsListItem(row: ProjectStatsRow): ProjectStatsListItem {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    customerName: nullableString(row.customer_name),
    name: String(row.name),
    community: nullableString(row.community),
    address: nullableString(row.address),
    projectType: nullableString(row.project_type) as ProjectStatsListItem['projectType'],
    status: String(row.status) as ProjectStatsListItem['status'],
    remark: nullableString(row.remark),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: nullableNumber(row.deleted_at),
    stats: buildStats(String(row.id), row),
  };
}

function buildStats(projectId: string, row: ProjectStatsRow): ProjectStats {
  const contractAmountCents = Number(row.contract_amount_cents ?? 0);
  const receivedCents = Number(row.received_cents ?? 0);
  const expenseCents = Number(row.expense_cents ?? 0);
  const receivableCents = contractAmountCents - receivedCents;

  return {
    projectId,
    contractAmountCents,
    receivedCents,
    expenseCents,
    receivableCents,
    currentProfitCents: receivedCents - expenseCents,
    expectedProfitCents: contractAmountCents - expenseCents,
    receiptStatus: getReceiptStatus(contractAmountCents, receivedCents),
  };
}

function getReceiptStatus(contractAmountCents: number, receivedCents: number) {
  if (receivedCents <= 0) {
    return 'not_started';
  }

  if (receivedCents > contractAmountCents) {
    return 'overpaid';
  }

  if (contractAmountCents > 0 && receivedCents === contractAmountCents) {
    return 'paid';
  }

  return 'partial';
}

function mapContract(row: Record<string, unknown>): Contract {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    projectId: String(row.project_id),
    contractNo: nullableString(row.contract_no),
    name: String(row.name),
    amountCents: Number(row.amount_cents),
    signedDate: nullableString(row.signed_date),
    status: String(row.status) as Contract['status'],
    remark: nullableString(row.remark),
    attachmentPath: nullableString(row.attachment_path),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: nullableNumber(row.deleted_at),
  };
}

function mapTransaction(row: Record<string, unknown>): TransactionListItem {
  return {
    id: String(row.id),
    transactionNo: nullableString(row.transaction_no),
    direction: String(row.direction) as TransactionListItem['direction'],
    amountCents: Number(row.amount_cents),
    occurredDate: String(row.occurred_date),
    accountId: String(row.account_id),
    accountName: nullableString(row.account_name),
    categoryId: String(row.category_id),
    categoryName: nullableString(row.category_name),
    fundType: String(row.fund_type) as TransactionListItem['fundType'],
    isCompanyFund: Boolean(row.is_company_fund),
    affectsReceivable: Boolean(row.affects_receivable),
    affectsProjectProfit: Boolean(row.affects_project_profit),
    customerId: nullableString(row.customer_id),
    customerName: nullableString(row.customer_name),
    projectId: nullableString(row.project_id),
    projectName: nullableString(row.project_name),
    employeeId: nullableString(row.employee_id),
    employeeName: nullableString(row.employee_name),
    status: String(row.status) as TransactionListItem['status'],
    voidedAt: nullableNumber(row.voided_at),
    voidReason: nullableString(row.void_reason),
    remark: nullableString(row.remark),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: nullableNumber(row.deleted_at),
  };
}

function nullableString(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

function nullableNumber(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}
