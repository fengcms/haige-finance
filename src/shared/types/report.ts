export interface ReportQuery {
  month?: string;
}

export interface DashboardReport {
  month: string;
  monthIncomeCents: number;
  monthExpenseCents: number;
  monthProfitCents: number;
  accountBalanceCents: number;
  projectReceivableCents: number;
  expectedProfitCents: number;
}

export interface MonthlyIncomeExpenseItem {
  month: string;
  incomeCents: number;
  expenseCents: number;
  profitCents: number;
}

export interface ProjectProfitReportItem {
  projectId: string;
  projectName: string;
  customerName?: string | null;
  contractAmountCents: number;
  receivedCents: number;
  expenseCents: number;
  receivableCents: number;
  currentProfitCents: number;
  expectedProfitCents: number;
}

export interface CustomerReceivableReportItem {
  customerId: string;
  customerName: string;
  contractAmountCents: number;
  receivedCents: number;
  receivableCents: number;
}

export interface AccountBalanceReportItem {
  accountId: string;
  accountName: string;
  openingBalanceCents: number;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}

export interface ReportBundle {
  dashboard: DashboardReport;
  monthlyIncomeExpense: MonthlyIncomeExpenseItem[];
  projectProfit: ProjectProfitReportItem[];
  customerReceivable: CustomerReceivableReportItem[];
  accountBalance: AccountBalanceReportItem[];
}
