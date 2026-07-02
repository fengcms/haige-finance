export const dictionaryTypeOptions = [
  'customer_status',
  'project_status',
  'project_type',
  'contract_status',
  'employee_status',
  'account_type',
  'account_status',
  'project_expense_order_status',
] as const;

export type DictionaryType = (typeof dictionaryTypeOptions)[number];

export const dictionaryStatusOptions = ['active', 'inactive'] as const;
export type DictionaryStatus = (typeof dictionaryStatusOptions)[number];

export interface DefaultDictionaryItem {
  dictType: DictionaryType;
  code: string;
  name: string;
  sortOrder: number;
}

export const dictionaryTypeLabels: Record<DictionaryType, string> = {
  customer_status: '客户状态',
  project_status: '项目状态',
  project_type: '项目类型',
  contract_status: '合同状态',
  employee_status: '员工状态',
  account_type: '账户类型',
  account_status: '账户状态',
  project_expense_order_status: '项目费用单状态',
};

export const defaultDictionaryItems: DefaultDictionaryItem[] = [
  { dictType: 'customer_status', code: 'potential', name: '潜在客户', sortOrder: 10 },
  { dictType: 'customer_status', code: 'signed', name: '已签约', sortOrder: 20 },
  { dictType: 'customer_status', code: 'in_progress', name: '施工中', sortOrder: 30 },
  { dictType: 'customer_status', code: 'completed', name: '已完工', sortOrder: 40 },
  { dictType: 'customer_status', code: 'invalid', name: '无效客户', sortOrder: 50 },

  { dictType: 'project_status', code: 'pending', name: '待签约', sortOrder: 10 },
  { dictType: 'project_status', code: 'signed', name: '已签约', sortOrder: 20 },
  { dictType: 'project_status', code: 'in_progress', name: '施工中', sortOrder: 30 },
  { dictType: 'project_status', code: 'completed', name: '已完工', sortOrder: 40 },
  { dictType: 'project_status', code: 'settled', name: '已结清', sortOrder: 50 },
  { dictType: 'project_status', code: 'voided', name: '已作废', sortOrder: 60 },

  { dictType: 'project_type', code: 'renovation', name: '装修', sortOrder: 10 },
  { dictType: 'project_type', code: 'cabinet', name: '橱柜', sortOrder: 20 },
  { dictType: 'project_type', code: 'repair', name: '维修', sortOrder: 30 },
  { dictType: 'project_type', code: 'other', name: '其他', sortOrder: 40 },

  { dictType: 'contract_status', code: 'draft', name: '未签约', sortOrder: 10 },
  { dictType: 'contract_status', code: 'signed', name: '已签约', sortOrder: 20 },
  { dictType: 'contract_status', code: 'in_progress', name: '进行中', sortOrder: 30 },
  { dictType: 'contract_status', code: 'completed', name: '已完工', sortOrder: 40 },
  { dictType: 'contract_status', code: 'settled', name: '已结清', sortOrder: 50 },
  { dictType: 'contract_status', code: 'voided', name: '已作废', sortOrder: 60 },

  { dictType: 'employee_status', code: 'active', name: '在职', sortOrder: 10 },
  { dictType: 'employee_status', code: 'inactive', name: '停用', sortOrder: 20 },
  { dictType: 'employee_status', code: 'left', name: '离职', sortOrder: 30 },

  { dictType: 'account_type', code: 'cash', name: '现金', sortOrder: 10 },
  { dictType: 'account_type', code: 'bank', name: '银行卡', sortOrder: 20 },
  { dictType: 'account_type', code: 'wechat', name: '微信', sortOrder: 30 },
  { dictType: 'account_type', code: 'alipay', name: '支付宝', sortOrder: 40 },
  { dictType: 'account_type', code: 'shareholder', name: '股东', sortOrder: 50 },
  { dictType: 'account_type', code: 'other', name: '其他', sortOrder: 60 },

  { dictType: 'account_status', code: 'active', name: '启用', sortOrder: 10 },
  { dictType: 'account_status', code: 'inactive', name: '停用', sortOrder: 20 },

  { dictType: 'project_expense_order_status', code: 'draft', name: '草稿', sortOrder: 10 },
  { dictType: 'project_expense_order_status', code: 'confirmed', name: '已确认', sortOrder: 20 },
  { dictType: 'project_expense_order_status', code: 'voided', name: '已作废', sortOrder: 30 },
];
