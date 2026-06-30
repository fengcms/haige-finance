import dayjs from 'dayjs';
import { z } from 'zod';
import type {
  AccountBalanceReportItem,
  CustomerReceivableReportItem,
  DashboardReport,
  MonthlyIncomeExpenseItem,
  ProjectProfitReportItem,
  ReportBundle,
  ReportQuery,
} from '../../shared/types/report.js';
import { ReportRepository } from '../repositories/reportRepository.js';

const reportQuerySchema = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  })
  .optional();

export class ReportService {
  constructor(private readonly repository = new ReportRepository()) {}

  getReports(query: unknown): ReportBundle {
    const parsed = reportQuerySchema.parse(query) as ReportQuery | undefined;
    const month = parsed?.month ?? dayjs().format('YYYY-MM');
    const monthlyIncomeExpense = this.getMonthlyIncomeExpense(month);
    const projectProfit = this.getProjectProfit();
    const customerReceivable = this.getCustomerReceivable();
    const accountBalance = this.getAccountBalance();

    return {
      dashboard: this.getDashboard(month, monthlyIncomeExpense, projectProfit, accountBalance),
      monthlyIncomeExpense,
      projectProfit,
      customerReceivable,
      accountBalance,
    };
  }

  private getMonthlyIncomeExpense(month: string): MonthlyIncomeExpenseItem[] {
    return this.repository.getMonthlyCashFlow(month).map((row) => {
      const incomeCents = Number(row.income_cents ?? 0);
      const expenseCents = Number(row.expense_cents ?? 0);

      return {
        month: row.month,
        incomeCents,
        expenseCents,
        profitCents: incomeCents - expenseCents,
      };
    });
  }

  private getProjectProfit(): ProjectProfitReportItem[] {
    return this.repository.getProjectReportRows().map((row) => {
      const contractAmountCents = Number(row.contract_amount_cents ?? 0);
      const receivedCents = Number(row.received_cents ?? 0);
      const expenseCents = Number(row.expense_cents ?? 0);

      return {
        projectId: String(row.project_id),
        projectName: String(row.project_name),
        customerName: row.customer_name ?? null,
        contractAmountCents,
        receivedCents,
        expenseCents,
        receivableCents: contractAmountCents - receivedCents,
        currentProfitCents: receivedCents - expenseCents,
        expectedProfitCents: contractAmountCents - expenseCents,
      };
    });
  }

  private getCustomerReceivable(): CustomerReceivableReportItem[] {
    return this.repository.getCustomerReceivableRows().map((row) => {
      const contractAmountCents = Number(row.contract_amount_cents ?? 0);
      const receivedCents = Number(row.received_cents ?? 0);

      return {
        customerId: String(row.customer_id),
        customerName: String(row.customer_name),
        contractAmountCents,
        receivedCents,
        receivableCents: contractAmountCents - receivedCents,
      };
    });
  }

  private getAccountBalance(): AccountBalanceReportItem[] {
    return this.repository.getAccountBalanceRows().map((row) => {
      const openingBalanceCents = Number(row.opening_balance_cents ?? 0);
      const incomeCents = Number(row.income_cents ?? 0);
      const expenseCents = Number(row.expense_cents ?? 0);

      return {
        accountId: String(row.account_id),
        accountName: String(row.account_name),
        openingBalanceCents,
        incomeCents,
        expenseCents,
        balanceCents: openingBalanceCents + incomeCents - expenseCents,
      };
    });
  }

  private getDashboard(
    month: string,
    monthlyIncomeExpense: MonthlyIncomeExpenseItem[],
    projectProfit: ProjectProfitReportItem[],
    accountBalance: AccountBalanceReportItem[],
  ): DashboardReport {
    const currentMonth = monthlyIncomeExpense.find((item) => item.month === month) ?? {
      month,
      incomeCents: 0,
      expenseCents: 0,
      profitCents: 0,
    };

    return {
      month,
      monthIncomeCents: currentMonth.incomeCents,
      monthExpenseCents: currentMonth.expenseCents,
      monthProfitCents: currentMonth.profitCents,
      accountBalanceCents: sum(accountBalance.map((item) => item.balanceCents)),
      projectReceivableCents: sum(projectProfit.map((item) => item.receivableCents)),
      expectedProfitCents: sum(projectProfit.map((item) => item.expectedProfitCents)),
    };
  }
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
