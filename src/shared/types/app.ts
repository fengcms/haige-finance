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
import type { CustomerProject } from './project.js';
import type { ProjectStatsDetail, ProjectStatsListItem } from './projectStats.js';
import type { ReportBundle, ReportQuery } from './report.js';
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
  accounts: CrudApi<Account>;
  categories: CrudApi<Category>;
  transactions: TransactionApi;
  projectStats: ProjectStatsApi;
  reports: ReportApi;
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

export interface ProjectStatsApi {
  list: () => Promise<ApiResult<ProjectStatsListItem[]>>;
  detail: (projectId: string) => Promise<ApiResult<ProjectStatsDetail>>;
}

export interface ReportApi {
  get: (query?: ReportQuery) => Promise<ApiResult<ReportBundle>>;
}

export interface MaintenanceApi {
  info: () => Promise<ApiResult<MaintenanceInfo>>;
  backupDatabase: () => Promise<ApiResult<BackupResult>>;
  restoreDatabase: () => Promise<ApiResult<RestoreResult | null>>;
  undoLastRestore: () => Promise<ApiResult<UndoRestoreResult>>;
  exportExcel: () => Promise<ApiResult<ExportResult>>;
}
