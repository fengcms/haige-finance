import type Database from 'better-sqlite3';

interface DefaultAccount {
  id: string;
  name: string;
  type: string;
  remark: string;
}

interface DefaultCategory {
  id: string;
  name: string;
  type: string;
  fundType: string;
  affectsReceivable: number;
  affectsProjectProfit: number;
  sortOrder: number;
  remark: string;
}

export const defaultAccounts: DefaultAccount[] = [
  { id: 'account_cash', name: '现金账户', type: 'cash', remark: '默认现金账户' },
  { id: 'account_wechat', name: '微信账户', type: 'wechat', remark: '默认微信收付款账户' },
  { id: 'account_alipay', name: '支付宝账户', type: 'alipay', remark: '默认支付宝收付款账户' },
  { id: 'account_bank', name: '银行卡账户', type: 'bank', remark: '默认公司银行卡账户' },
  { id: 'account_shareholder', name: '股东代收账户', type: 'shareholder', remark: '记录股东代收代付，不默认等同公司账户资金' },
];

export const defaultCategories: DefaultCategory[] = [
  {
    id: 'category_customer_payment',
    name: '客户收款',
    type: 'income',
    fundType: 'customer_payment',
    affectsReceivable: 1,
    affectsProjectProfit: 0,
    sortOrder: 10,
    remark: '客户项目收款，影响项目应收款',
  },
  {
    id: 'category_shareholder_investment',
    name: '股东注资',
    type: 'income',
    fundType: 'shareholder_investment',
    affectsReceivable: 0,
    affectsProjectProfit: 0,
    sortOrder: 20,
    remark: '股东投入公司账户的资金，不属于客户收入',
  },
  {
    id: 'category_loan_in',
    name: '借款收入',
    type: 'income',
    fundType: 'loan_in',
    affectsReceivable: 0,
    affectsProjectProfit: 0,
    sortOrder: 30,
    remark: '借入资金，不属于经营收入',
  },
  {
    id: 'category_other_income',
    name: '其他收入',
    type: 'income',
    fundType: 'other_income',
    affectsReceivable: 0,
    affectsProjectProfit: 0,
    sortOrder: 40,
    remark: '其他收入',
  },
  {
    id: 'category_project_material',
    name: '项目材料',
    type: 'expense',
    fundType: 'project_expense',
    affectsReceivable: 0,
    affectsProjectProfit: 1,
    sortOrder: 110,
    remark: '项目相关材料支出，影响项目利润',
  },
  {
    id: 'category_salary',
    name: '人工工资',
    type: 'expense',
    fundType: 'salary',
    affectsReceivable: 0,
    affectsProjectProfit: 1,
    sortOrder: 120,
    remark: '员工或施工人工支出，可关联员工和项目',
  },
  {
    id: 'category_company_expense',
    name: '公司费用',
    type: 'expense',
    fundType: 'company_expense',
    affectsReceivable: 0,
    affectsProjectProfit: 0,
    sortOrder: 130,
    remark: '公司日常经营费用',
  },
  {
    id: 'category_shareholder_payment',
    name: '股东代付',
    type: 'expense',
    fundType: 'shareholder_payment',
    affectsReceivable: 0,
    affectsProjectProfit: 1,
    sortOrder: 140,
    remark: '股东代为支付的项目或公司费用',
  },
  {
    id: 'category_loan_out',
    name: '借款支出',
    type: 'expense',
    fundType: 'loan_out',
    affectsReceivable: 0,
    affectsProjectProfit: 0,
    sortOrder: 150,
    remark: '借出或还款支出',
  },
  {
    id: 'category_other_expense',
    name: '其他支出',
    type: 'expense',
    fundType: 'other_expense',
    affectsReceivable: 0,
    affectsProjectProfit: 0,
    sortOrder: 160,
    remark: '其他支出',
  },
];

export function seedDefaultData(db: Database.Database, now = Date.now()) {
  const insertAccount = db.prepare(`
    INSERT INTO accounts (
      id,
      name,
      type,
      status,
      opening_balance_cents,
      remark,
      created_at,
      updated_at
    )
    VALUES (
      @id,
      @name,
      @type,
      'active',
      0,
      @remark,
      @createdAt,
      @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      remark = excluded.remark,
      updated_at = excluded.updated_at
  `);

  const insertCategory = db.prepare(`
    INSERT INTO categories (
      id,
      name,
      type,
      fund_type,
      affects_receivable,
      affects_project_profit,
      sort_order,
      status,
      remark,
      created_at,
      updated_at
    )
    VALUES (
      @id,
      @name,
      @type,
      @fundType,
      @affectsReceivable,
      @affectsProjectProfit,
      @sortOrder,
      'active',
      @remark,
      @createdAt,
      @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      fund_type = excluded.fund_type,
      affects_receivable = excluded.affects_receivable,
      affects_project_profit = excluded.affects_project_profit,
      sort_order = excluded.sort_order,
      remark = excluded.remark,
      updated_at = excluded.updated_at
  `);

  const insertOperationLog = db.prepare(`
    INSERT INTO operation_logs (
      id,
      entity_type,
      entity_id,
      action,
      detail,
      created_at
    )
    VALUES (
      'operation_seed_default_data',
      'system',
      NULL,
      'seed',
      'Seed default accounts and categories',
      @createdAt
    )
    ON CONFLICT(id) DO NOTHING
  `);

  const transaction = db.transaction(() => {
    for (const account of defaultAccounts) {
      insertAccount.run({
        ...account,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const category of defaultCategories) {
      insertCategory.run({
        ...category,
        createdAt: now,
        updatedAt: now,
      });
    }

    insertOperationLog.run({ createdAt: now });
  });

  transaction();
}
