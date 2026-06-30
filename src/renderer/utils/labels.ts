export const customerStatusLabels: Record<string, string> = {
  potential: '潜在客户',
  signed: '已签约',
  in_progress: '施工中',
  completed: '已完工',
  invalid: '无效客户',
};

export const projectStatusLabels: Record<string, string> = {
  pending: '待签约',
  signed: '已签约',
  in_progress: '施工中',
  completed: '已完工',
  settled: '已结清',
  voided: '已作废',
};

export const projectTypeLabels: Record<string, string> = {
  renovation: '装修',
  cabinet: '橱柜',
  repair: '维修',
  other: '其他',
};

export const contractStatusLabels: Record<string, string> = {
  draft: '未签约',
  signed: '已签约',
  in_progress: '进行中',
  completed: '已完工',
  settled: '已结清',
  voided: '已作废',
};

export const employeeStatusLabels: Record<string, string> = {
  active: '在职',
  inactive: '停用',
  left: '离职',
};

export const accountTypeLabels: Record<string, string> = {
  cash: '现金',
  bank: '银行卡',
  wechat: '微信',
  alipay: '支付宝',
  shareholder: '股东',
  other: '其他',
};

export const accountStatusLabels: Record<string, string> = {
  active: '启用',
  inactive: '停用',
};

export const categoryTypeLabels: Record<string, string> = {
  income: '收入',
  expense: '支出',
};

export const categoryStatusLabels: Record<string, string> = {
  active: '启用',
  inactive: '停用',
};

export const transactionDirectionLabels: Record<string, string> = {
  income: '收入',
  expense: '支出',
};

export const transactionStatusLabels: Record<string, string> = {
  normal: '正常',
  voided: '已作废',
  deleted: '已删除',
};

export const receiptStatusLabels: Record<string, string> = {
  not_started: '未收款',
  partial: '部分收款',
  paid: '已收齐',
  overpaid: '超收',
};

export const fundTypeLabels: Record<string, string> = {
  customer_payment: '客户收款',
  project_expense: '项目支出',
  salary: '工资',
  company_expense: '公司费用',
  shareholder_investment: '股东注资',
  shareholder_collection: '股东代收',
  shareholder_payment: '股东代付',
  loan_in: '借款收入',
  loan_out: '借款支出',
  transfer: '账户转账',
  other_income: '其他收入',
  other_expense: '其他支出',
};

export function toOptions(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({
    value,
    label,
  }));
}
