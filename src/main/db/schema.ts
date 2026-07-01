import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type {
  AccountStatus,
  AccountType,
  CategoryStatus,
  CategoryType,
  ContractStatus,
  ContractAttachmentFileType,
  ContractAttachmentSourceType,
  CustomerStatus,
  EmployeeStatus,
  FundType,
  OperationAction,
  ProjectStatus,
  ProjectType,
  TransactionDirection,
  TransactionStatus,
} from '../../shared/constants/enums.js';

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

const timestamps = {
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
};

export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone'),
    address: text('address'),
    community: text('community'),
    houseNumber: text('house_number'),
    status: text('status').$type<CustomerStatus>().notNull().default('potential'),
    remark: text('remark'),
    ...timestamps,
  },
  (table) => ({
    nameIdx: index('idx_customers_name').on(table.name),
    phoneIdx: index('idx_customers_phone').on(table.phone),
    communityIdx: index('idx_customers_community').on(table.community),
    statusIdx: index('idx_customers_status').on(table.status),
  }),
);

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    name: text('name').notNull(),
    community: text('community'),
    address: text('address'),
    projectType: text('project_type').$type<ProjectType>(),
    status: text('status').$type<ProjectStatus>().notNull().default('pending'),
    remark: text('remark'),
    ...timestamps,
  },
  (table) => ({
    customerIdx: index('idx_projects_customer_id').on(table.customerId),
    statusIdx: index('idx_projects_status').on(table.status),
    communityIdx: index('idx_projects_community').on(table.community),
  }),
);

export const contracts = sqliteTable(
  'contracts',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id),
    contractNo: text('contract_no'),
    name: text('name').notNull(),
    amountCents: integer('amount_cents').notNull(),
    signedDate: text('signed_date'),
    status: text('status').$type<ContractStatus>().notNull().default('draft'),
    remark: text('remark'),
    attachmentPath: text('attachment_path'),
    ...timestamps,
  },
  (table) => ({
    contractNoIdx: uniqueIndex('idx_contracts_contract_no').on(table.contractNo),
    customerIdx: index('idx_contracts_customer_id').on(table.customerId),
    projectIdx: index('idx_contracts_project_id').on(table.projectId),
    statusIdx: index('idx_contracts_status').on(table.status),
  }),
);

export const contractAttachments = sqliteTable(
  'contract_attachments',
  {
    id: text('id').primaryKey(),
    contractId: text('contract_id')
      .notNull()
      .references(() => contracts.id),
    fileType: text('file_type').$type<ContractAttachmentFileType>().notNull(),
    sourceType: text('source_type').$type<ContractAttachmentSourceType>().notNull(),
    originalName: text('original_name').notNull(),
    storedName: text('stored_name').notNull(),
    storedPath: text('stored_path').notNull(),
    mimeType: text('mime_type'),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => ({
    contractIdx: index('idx_contract_attachments_contract_id').on(table.contractId),
    fileTypeIdx: index('idx_contract_attachments_file_type').on(table.fileType),
    sortOrderIdx: index('idx_contract_attachments_sort_order').on(table.sortOrder),
  }),
);

export const employees = sqliteTable(
  'employees',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone'),
    position: text('position'),
    entryDate: text('entry_date'),
    status: text('status').$type<EmployeeStatus>().notNull().default('active'),
    remark: text('remark'),
    ...timestamps,
  },
  (table) => ({
    nameIdx: index('idx_employees_name').on(table.name),
    phoneIdx: index('idx_employees_phone').on(table.phone),
    statusIdx: index('idx_employees_status').on(table.status),
  }),
);

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').$type<AccountType>().notNull(),
    status: text('status').$type<AccountStatus>().notNull().default('active'),
    openingBalanceCents: integer('opening_balance_cents').notNull().default(0),
    remark: text('remark'),
    ...timestamps,
  },
  (table) => ({
    nameIdx: uniqueIndex('idx_accounts_name').on(table.name),
    typeIdx: index('idx_accounts_type').on(table.type),
    statusIdx: index('idx_accounts_status').on(table.status),
  }),
);

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').$type<CategoryType>().notNull(),
    fundType: text('fund_type').$type<FundType>(),
    affectsReceivable: integer('affects_receivable', { mode: 'boolean' }).notNull().default(false),
    affectsProjectProfit: integer('affects_project_profit', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    status: text('status').$type<CategoryStatus>().notNull().default('active'),
    remark: text('remark'),
    ...timestamps,
  },
  (table) => ({
    nameTypeIdx: uniqueIndex('idx_categories_name_type').on(table.name, table.type),
    typeIdx: index('idx_categories_type').on(table.type),
    fundTypeIdx: index('idx_categories_fund_type').on(table.fundType),
    statusIdx: index('idx_categories_status').on(table.status),
  }),
);

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    transactionNo: text('transaction_no'),
    direction: text('direction').$type<TransactionDirection>().notNull(),
    amountCents: integer('amount_cents').notNull(),
    occurredDate: text('occurred_date').notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    fundType: text('fund_type').$type<FundType>().notNull(),
    isCompanyFund: integer('is_company_fund', { mode: 'boolean' }).notNull().default(true),
    affectsReceivable: integer('affects_receivable', { mode: 'boolean' }).notNull().default(false),
    affectsProjectProfit: integer('affects_project_profit', { mode: 'boolean' }).notNull().default(false),
    customerId: text('customer_id').references(() => customers.id),
    projectId: text('project_id').references(() => projects.id),
    employeeId: text('employee_id').references(() => employees.id),
    status: text('status').$type<TransactionStatus>().notNull().default('normal'),
    voidedAt: integer('voided_at'),
    voidReason: text('void_reason'),
    remark: text('remark'),
    ...timestamps,
  },
  (table) => ({
    transactionNoIdx: uniqueIndex('idx_transactions_transaction_no').on(table.transactionNo),
    occurredDateIdx: index('idx_transactions_occurred_date').on(table.occurredDate),
    accountIdx: index('idx_transactions_account_id').on(table.accountId),
    categoryIdx: index('idx_transactions_category_id').on(table.categoryId),
    customerIdx: index('idx_transactions_customer_id').on(table.customerId),
    projectIdx: index('idx_transactions_project_id').on(table.projectId),
    employeeIdx: index('idx_transactions_employee_id').on(table.employeeId),
    statusIdx: index('idx_transactions_status').on(table.status),
    fundTypeIdx: index('idx_transactions_fund_type').on(table.fundType),
  }),
);

export const operationLogs = sqliteTable(
  'operation_logs',
  {
    id: text('id').primaryKey(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    action: text('action').$type<OperationAction>().notNull(),
    detail: text('detail'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    entityIdx: index('idx_operation_logs_entity').on(table.entityType, table.entityId),
    actionIdx: index('idx_operation_logs_action').on(table.action),
    createdAtIdx: index('idx_operation_logs_created_at').on(table.createdAt),
  }),
);
