export const customerStatusOptions = ['potential', 'signed', 'in_progress', 'completed', 'invalid'] as const;
export type CustomerStatus = (typeof customerStatusOptions)[number];

export const projectStatusOptions = ['pending', 'signed', 'in_progress', 'completed', 'settled', 'voided'] as const;
export type ProjectStatus = (typeof projectStatusOptions)[number];

export const projectTypeOptions = ['renovation', 'cabinet', 'repair', 'other'] as const;
export type ProjectType = (typeof projectTypeOptions)[number];

export const contractStatusOptions = ['draft', 'signed', 'in_progress', 'completed', 'settled', 'voided'] as const;
export type ContractStatus = (typeof contractStatusOptions)[number];

export const contractAttachmentFileTypeOptions = ['image', 'pdf'] as const;
export type ContractAttachmentFileType = (typeof contractAttachmentFileTypeOptions)[number];

export const contractAttachmentSourceTypeOptions = ['uploaded', 'generated'] as const;
export type ContractAttachmentSourceType = (typeof contractAttachmentSourceTypeOptions)[number];

export const employeeStatusOptions = ['active', 'inactive', 'left'] as const;
export type EmployeeStatus = (typeof employeeStatusOptions)[number];

export const accountTypeOptions = ['cash', 'bank', 'wechat', 'alipay', 'shareholder', 'other'] as const;
export type AccountType = (typeof accountTypeOptions)[number];

export const accountStatusOptions = ['active', 'inactive'] as const;
export type AccountStatus = (typeof accountStatusOptions)[number];

export const categoryTypeOptions = ['income', 'expense'] as const;
export type CategoryType = (typeof categoryTypeOptions)[number];

export const categoryStatusOptions = ['active', 'inactive'] as const;
export type CategoryStatus = (typeof categoryStatusOptions)[number];

export const transactionDirectionOptions = ['income', 'expense'] as const;
export type TransactionDirection = (typeof transactionDirectionOptions)[number];

export const transactionStatusOptions = ['normal', 'voided', 'deleted'] as const;
export type TransactionStatus = (typeof transactionStatusOptions)[number];

export const fundTypeOptions = [
  'customer_payment',
  'project_expense',
  'salary',
  'company_expense',
  'shareholder_investment',
  'shareholder_collection',
  'shareholder_payment',
  'loan_in',
  'loan_out',
  'transfer',
  'other_income',
  'other_expense',
] as const;
export type FundType = (typeof fundTypeOptions)[number];

export const operationActionOptions = ['create', 'update', 'delete', 'void', 'restore', 'seed'] as const;
export type OperationAction = (typeof operationActionOptions)[number];
