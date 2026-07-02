import type { ApiResult, ListQuery, ListResult } from './api.js';
import type { Account } from './account.js';
import type { Category } from './category.js';
import type { Contract } from './contract.js';
import type { ContractAttachment, ContractAttachmentPreview, GenerateContractPdfResult } from './contractAttachment.js';
import type { Customer } from './customer.js';
import type { DictionaryItem, DictionaryQuery, UpdateDictionaryItemInput } from './dictionary.js';
import type { Employee } from './employee.js';
import type { AuthResult, AuthStatus, ChangePasswordInput, LoginInput, SetupPasswordInput } from './auth.js';
import type { BackupResult, ExportResult, MaintenanceInfo, RestoreResult, UndoRestoreResult } from './maintenance.js';
import type { PayrollBatch, PayrollBatchDetail, PayrollBatchListQuery, PayrollItem } from './payroll.js';
import type { CustomerProject } from './project.js';
import type { ProjectStatsDetail, ProjectStatsListItem } from './projectStats.js';
import type { ProjectExpenseItem, ProjectExpenseOrder, ProjectExpenseOrderDetail, ProjectExpenseOrderListQuery } from './projectExpense.js';
import type { ReportBundle, ReportQuery } from './report.js';
import type { AppSettings, UpdateAppSettingsInput } from './settings.js';
import type { Supplier } from './supplier.js';
import type { AccountBalance, Transaction, TransactionListItem, TransactionListQuery } from './transaction.js';

export interface PingResult {
  message: string;
  appName: string;
  timestamp: string;
  database: {
    ok: boolean;
    path: string;
  };
}

export interface HaigeApi {
  version: string;
  appPing: () => Promise<PingResult>;
  invoke: <T>(channel: string, payload?: unknown) => Promise<ApiResult<T>>;
  auth: AuthApi;
  customers: CrudApi<Customer>;
  projects: CrudApi<CustomerProject>;
  contracts: CrudApi<Contract>;
  contractAttachments: ContractAttachmentApi;
  dictionaries: DictionaryApi;
  employees: CrudApi<Employee>;
  suppliers: CrudApi<Supplier>;
  accounts: CrudApi<Account>;
  categories: CrudApi<Category>;
  transactions: TransactionApi;
  payroll: PayrollApi;
  projectExpenses: ProjectExpenseApi;
  projectStats: ProjectStatsApi;
  reports: ReportApi;
  settings: SettingsApi;
  maintenance: MaintenanceApi;
}

export interface CrudApi<T> {
  list: (query?: ListQuery) => Promise<ApiResult<ListResult<T>>>;
  create: (input: unknown) => Promise<ApiResult<T>>;
  update: (id: string, input: unknown) => Promise<ApiResult<T>>;
  remove: (id: string) => Promise<ApiResult<{ id: string }>>;
}

export interface AuthApi {
  status: () => Promise<ApiResult<AuthStatus>>;
  setupPassword: (input: SetupPasswordInput) => Promise<ApiResult<AuthResult>>;
  login: (input: LoginInput) => Promise<ApiResult<AuthResult>>;
  changePassword: (input: ChangePasswordInput) => Promise<ApiResult<AuthResult>>;
}

export interface ContractAttachmentApi {
  list: (contractId: string) => Promise<ApiResult<ContractAttachment[]>>;
  importFiles: (contractId: string) => Promise<ApiResult<ContractAttachment[]>>;
  reorder: (contractId: string, orderedIds: string[]) => Promise<ApiResult<ContractAttachment[]>>;
  rename: (id: string, originalName: string) => Promise<ApiResult<ContractAttachment>>;
  remove: (id: string) => Promise<ApiResult<{ id: string }>>;
  openFile: (id: string) => Promise<ApiResult<{ id: string; path: string }>>;
  preview: (id: string) => Promise<ApiResult<ContractAttachmentPreview>>;
  generatePdf: (contractId: string) => Promise<ApiResult<GenerateContractPdfResult>>;
}

export interface DictionaryApi {
  list: (query?: DictionaryQuery) => Promise<ApiResult<DictionaryItem[]>>;
  update: (id: string, input: UpdateDictionaryItemInput) => Promise<ApiResult<DictionaryItem>>;
}

export interface TransactionApi extends CrudApi<Transaction> {
  list: (query?: TransactionListQuery) => Promise<ApiResult<ListResult<TransactionListItem>>>;
  void: (id: string, reason: string) => Promise<ApiResult<TransactionListItem>>;
  accountBalances: () => Promise<ApiResult<AccountBalance[]>>;
}

export interface PayrollApi {
  listBatches: (query?: PayrollBatchListQuery) => Promise<ApiResult<PayrollBatch[]>>;
  createBatch: (input: unknown) => Promise<ApiResult<PayrollBatch>>;
  updateBatch: (id: string, input: unknown) => Promise<ApiResult<PayrollBatch>>;
  removeBatch: (id: string) => Promise<ApiResult<{ id: string }>>;
  getDetail: (id: string) => Promise<ApiResult<PayrollBatchDetail>>;
  createItem: (input: unknown) => Promise<ApiResult<PayrollItem>>;
  createItemsBatch: (input: unknown) => Promise<ApiResult<PayrollItem[]>>;
  updateItem: (id: string, input: unknown) => Promise<ApiResult<PayrollItem>>;
  removeItem: (id: string) => Promise<ApiResult<{ id: string }>>;
  confirmBatch: (id: string) => Promise<ApiResult<PayrollBatch>>;
  cancelConfirmBatch: (id: string) => Promise<ApiResult<PayrollBatch>>;
  payBatch: (input: unknown) => Promise<ApiResult<PayrollBatch>>;
  voidBatch: (id: string, reason: string) => Promise<ApiResult<PayrollBatch>>;
}

export interface ProjectStatsApi {
  list: () => Promise<ApiResult<ProjectStatsListItem[]>>;
  detail: (projectId: string) => Promise<ApiResult<ProjectStatsDetail>>;
}

export interface ProjectExpenseApi {
  listOrders: (query?: ProjectExpenseOrderListQuery) => Promise<ApiResult<ProjectExpenseOrder[]>>;
  createOrder: (input: unknown) => Promise<ApiResult<ProjectExpenseOrder>>;
  updateOrder: (id: string, input: unknown) => Promise<ApiResult<ProjectExpenseOrder>>;
  removeOrder: (id: string) => Promise<ApiResult<{ id: string }>>;
  getDetail: (id: string) => Promise<ApiResult<ProjectExpenseOrderDetail>>;
  createItem: (input: unknown) => Promise<ApiResult<ProjectExpenseItem>>;
  createItemsBatch: (input: unknown) => Promise<ApiResult<ProjectExpenseItem[]>>;
  updateItem: (id: string, input: unknown) => Promise<ApiResult<ProjectExpenseItem>>;
  removeItem: (id: string) => Promise<ApiResult<{ id: string }>>;
  confirmOrder: (id: string, accountId: string) => Promise<ApiResult<ProjectExpenseOrder>>;
  voidOrder: (id: string, reason: string) => Promise<ApiResult<ProjectExpenseOrder>>;
}

export interface ReportApi {
  get: (query?: ReportQuery) => Promise<ApiResult<ReportBundle>>;
}

export interface SettingsApi {
  get: () => Promise<ApiResult<AppSettings>>;
  update: (input: UpdateAppSettingsInput) => Promise<ApiResult<AppSettings>>;
}

export interface MaintenanceApi {
  info: () => Promise<ApiResult<MaintenanceInfo>>;
  backupDatabase: () => Promise<ApiResult<BackupResult>>;
  restoreDatabase: () => Promise<ApiResult<RestoreResult | null>>;
  undoLastRestore: () => Promise<ApiResult<UndoRestoreResult>>;
  exportExcel: () => Promise<ApiResult<ExportResult>>;
}
