import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import path from 'node:path';
import { getSqlite } from '../db/index.js';
import { BackupService } from '../backup/backupService.js';
import { ReportService } from '../services/reportService.js';
import type { ExportResult } from '../../shared/types/maintenance.js';

interface SheetColumn {
  header: string;
  key: string;
  width?: number;
}

export class ExportService {
  constructor(
    private readonly backupService = new BackupService(),
    private readonly reportService = new ReportService(),
  ) {}

  async exportExcel(): Promise<ExportResult> {
    const info = this.backupService.getInfo();
    const createdAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const fileStamp = dayjs().format('YYYYMMDD-HHmmss');
    const exportPath = path.join(info.exportDir, `haige-finance-export-${fileStamp}.xlsx`);
    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'haige-finance';
    workbook.created = new Date();

    addSheet(workbook, '客户', [
      { header: '客户名称', key: 'name', width: 20 },
      { header: '电话', key: 'phone', width: 16 },
      { header: '小区', key: 'community', width: 18 },
      { header: '房号', key: 'house_number', width: 14 },
      { header: '地址', key: 'address', width: 28 },
      { header: '状态', key: 'status', width: 14 },
      { header: '备注', key: 'remark', width: 24 },
    ], this.selectRows('SELECT name, phone, community, house_number, address, status, remark FROM customers WHERE deleted_at IS NULL ORDER BY created_at DESC'));

    addSheet(workbook, '项目', [
      { header: '项目名称', key: 'name', width: 22 },
      { header: '客户', key: 'customer_name', width: 20 },
      { header: '小区', key: 'community', width: 18 },
      { header: '地址', key: 'address', width: 28 },
      { header: '类型', key: 'project_type', width: 14 },
      { header: '状态', key: 'status', width: 14 },
    ], this.selectRows(`
      SELECT projects.name, customers.name AS customer_name, projects.community, projects.address, projects.project_type, projects.status
      FROM projects
      LEFT JOIN customers ON customers.id = projects.customer_id
      WHERE projects.deleted_at IS NULL
      ORDER BY projects.created_at DESC
    `));

    addSheet(workbook, '合同', [
      { header: '合同名称', key: 'name', width: 22 },
      { header: '合同编号', key: 'contract_no', width: 18 },
      { header: '客户', key: 'customer_name', width: 20 },
      { header: '项目', key: 'project_name', width: 22 },
      { header: '金额(元)', key: 'amount_yuan', width: 14 },
      { header: '签约日期', key: 'signed_date', width: 14 },
      { header: '状态', key: 'status', width: 14 },
    ], this.selectRows(`
      SELECT
        contracts.name,
        contracts.contract_no,
        customers.name AS customer_name,
        projects.name AS project_name,
        ROUND(contracts.amount_cents / 100.0, 2) AS amount_yuan,
        contracts.signed_date,
        contracts.status
      FROM contracts
      LEFT JOIN customers ON customers.id = contracts.customer_id
      LEFT JOIN projects ON projects.id = contracts.project_id
      WHERE contracts.deleted_at IS NULL
      ORDER BY contracts.created_at DESC
    `));

    addSheet(workbook, '财务流水', [
      { header: '日期', key: 'occurred_date', width: 14 },
      { header: '方向', key: 'direction', width: 10 },
      { header: '金额(元)', key: 'amount_yuan', width: 14 },
      { header: '账户', key: 'account_name', width: 18 },
      { header: '分类', key: 'category_name', width: 18 },
      { header: '资金性质', key: 'fund_type', width: 18 },
      { header: '客户', key: 'customer_name', width: 18 },
      { header: '项目', key: 'project_name', width: 20 },
      { header: '状态', key: 'status', width: 12 },
      { header: '备注', key: 'remark', width: 24 },
    ], this.selectRows(`
      SELECT
        transactions.occurred_date,
        transactions.direction,
        ROUND(transactions.amount_cents / 100.0, 2) AS amount_yuan,
        accounts.name AS account_name,
        categories.name AS category_name,
        transactions.fund_type,
        customers.name AS customer_name,
        projects.name AS project_name,
        transactions.status,
        transactions.remark
      FROM transactions
      LEFT JOIN accounts ON accounts.id = transactions.account_id
      LEFT JOIN categories ON categories.id = transactions.category_id
      LEFT JOIN customers ON customers.id = transactions.customer_id
      LEFT JOIN projects ON projects.id = transactions.project_id
      WHERE transactions.deleted_at IS NULL
      ORDER BY transactions.occurred_date DESC, transactions.created_at DESC
    `));

    const reports = this.reportService.getReports(undefined);
    addSheet(workbook, '月度收支表', [
      { header: '月份', key: 'month', width: 12 },
      { header: '收入(元)', key: 'incomeYuan', width: 14 },
      { header: '支出(元)', key: 'expenseYuan', width: 14 },
      { header: '收支差额(元)', key: 'profitYuan', width: 16 },
    ], reports.monthlyIncomeExpense.map((item) => ({
      month: item.month,
      incomeYuan: centsToYuanNumber(item.incomeCents),
      expenseYuan: centsToYuanNumber(item.expenseCents),
      profitYuan: centsToYuanNumber(item.profitCents),
    })));

    addSheet(workbook, '项目利润表', [
      { header: '项目', key: 'projectName', width: 22 },
      { header: '客户', key: 'customerName', width: 18 },
      { header: '合同金额(元)', key: 'contractAmountYuan', width: 16 },
      { header: '已收款(元)', key: 'receivedYuan', width: 14 },
      { header: '已支出(元)', key: 'expenseYuan', width: 14 },
      { header: '应收款(元)', key: 'receivableYuan', width: 14 },
      { header: '当前毛利(元)', key: 'currentProfitYuan', width: 16 },
      { header: '预计毛利(元)', key: 'expectedProfitYuan', width: 16 },
    ], reports.projectProfit.map((item) => ({
      projectName: item.projectName,
      customerName: item.customerName,
      contractAmountYuan: centsToYuanNumber(item.contractAmountCents),
      receivedYuan: centsToYuanNumber(item.receivedCents),
      expenseYuan: centsToYuanNumber(item.expenseCents),
      receivableYuan: centsToYuanNumber(item.receivableCents),
      currentProfitYuan: centsToYuanNumber(item.currentProfitCents),
      expectedProfitYuan: centsToYuanNumber(item.expectedProfitCents),
    })));

    addSheet(workbook, '客户应收表', [
      { header: '客户', key: 'customerName', width: 20 },
      { header: '合同金额(元)', key: 'contractAmountYuan', width: 16 },
      { header: '已收款(元)', key: 'receivedYuan', width: 14 },
      { header: '应收款(元)', key: 'receivableYuan', width: 14 },
    ], reports.customerReceivable.map((item) => ({
      customerName: item.customerName,
      contractAmountYuan: centsToYuanNumber(item.contractAmountCents),
      receivedYuan: centsToYuanNumber(item.receivedCents),
      receivableYuan: centsToYuanNumber(item.receivableCents),
    })));

    addSheet(workbook, '账户余额表', [
      { header: '账户', key: 'accountName', width: 20 },
      { header: '期初余额(元)', key: 'openingBalanceYuan', width: 16 },
      { header: '收入(元)', key: 'incomeYuan', width: 14 },
      { header: '支出(元)', key: 'expenseYuan', width: 14 },
      { header: '当前余额(元)', key: 'balanceYuan', width: 16 },
    ], reports.accountBalance.map((item) => ({
      accountName: item.accountName,
      openingBalanceYuan: centsToYuanNumber(item.openingBalanceCents),
      incomeYuan: centsToYuanNumber(item.incomeCents),
      expenseYuan: centsToYuanNumber(item.expenseCents),
      balanceYuan: centsToYuanNumber(item.balanceCents),
    })));

    await workbook.xlsx.writeFile(exportPath);

    return {
      exportPath,
      createdAt,
      sheets: workbook.worksheets.map((sheet) => sheet.name),
    };
  }

  private selectRows(sql: string) {
    return getSqlite().prepare(sql).all() as Record<string, unknown>[];
  }
}

function addSheet(workbook: ExcelJS.Workbook, name: string, columns: SheetColumn[], rows: Record<string, unknown>[]) {
  const worksheet = workbook.addWorksheet(name);
  worksheet.columns = columns;
  worksheet.addRows(rows);
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function centsToYuanNumber(cents: number) {
  return Number((cents / 100).toFixed(2));
}
