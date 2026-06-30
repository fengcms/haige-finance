import type { ApiResult, ListQuery, ListResult } from './api.js';
import type { Account } from './account.js';
import type { Category } from './category.js';
import type { Contract } from './contract.js';
import type { Customer } from './customer.js';
import type { Employee } from './employee.js';
import type { CustomerProject } from './project.js';
import type { ProjectStatsDetail, ProjectStatsListItem } from './projectStats.js';
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
  appPing: () => Promise<PingResult>;
  invoke: <T>(channel: string, payload?: unknown) => Promise<ApiResult<T>>;
  customers: CrudApi<Customer>;
  projects: CrudApi<CustomerProject>;
  contracts: CrudApi<Contract>;
  employees: CrudApi<Employee>;
  accounts: CrudApi<Account>;
  categories: CrudApi<Category>;
  transactions: TransactionApi;
  projectStats: ProjectStatsApi;
}

export interface CrudApi<T> {
  list: (query?: ListQuery) => Promise<ApiResult<ListResult<T>>>;
  create: (input: unknown) => Promise<ApiResult<T>>;
  update: (id: string, input: unknown) => Promise<ApiResult<T>>;
  remove: (id: string) => Promise<ApiResult<{ id: string }>>;
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
