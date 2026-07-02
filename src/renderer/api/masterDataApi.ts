import type { ListQuery, ListResult } from '@/shared/types/api';
import type { Account } from '@/shared/types/account';
import type { Category } from '@/shared/types/category';
import type { Contract } from '@/shared/types/contract';
import type { Customer } from '@/shared/types/customer';
import type { Employee } from '@/shared/types/employee';
import type { CustomerProject } from '@/shared/types/project';
import type { Supplier } from '@/shared/types/supplier';
import { unwrapResult } from './client';

type ProjectListItem = CustomerProject & { customerName?: string };
type ContractListItem = Contract & { customerName?: string; projectName?: string };

export const customerApi = {
  list: (query?: ListQuery) => unwrapResult(getHaigeApi().customers.list(query)),
  create: (input: unknown) => unwrapResult(getHaigeApi().customers.create(input)),
  update: (id: string, input: unknown) => unwrapResult(getHaigeApi().customers.update(id, input)),
  remove: (id: string) => unwrapResult(getHaigeApi().customers.remove(id)),
};

export const projectApi = {
  list: (query?: ListQuery) => unwrapResult(getHaigeApi().projects.list(query) as Promise<any>) as Promise<ListResult<ProjectListItem>>,
  create: (input: unknown) => unwrapResult(getHaigeApi().projects.create(input)),
  update: (id: string, input: unknown) => unwrapResult(getHaigeApi().projects.update(id, input)),
  remove: (id: string) => unwrapResult(getHaigeApi().projects.remove(id)),
};

export const contractApi = {
  list: (query?: ListQuery) => unwrapResult(getHaigeApi().contracts.list(query) as Promise<any>) as Promise<ListResult<ContractListItem>>,
  create: (input: unknown) => unwrapResult(getHaigeApi().contracts.create(input)),
  update: (id: string, input: unknown) => unwrapResult(getHaigeApi().contracts.update(id, input)),
  remove: (id: string) => unwrapResult(getHaigeApi().contracts.remove(id)),
};

export const employeeApi = {
  list: (query?: ListQuery) => unwrapResult(getHaigeApi().employees.list(query)),
  create: (input: unknown) => unwrapResult(getHaigeApi().employees.create(input)),
  update: (id: string, input: unknown) => unwrapResult(getHaigeApi().employees.update(id, input)),
  remove: (id: string) => unwrapResult(getHaigeApi().employees.remove(id)),
};

export const supplierApi = {
  list: (query?: ListQuery) => unwrapResult(getHaigeApi().suppliers.list(query)),
  create: (input: unknown) => unwrapResult(getHaigeApi().suppliers.create(input)),
  update: (id: string, input: unknown) => unwrapResult(getHaigeApi().suppliers.update(id, input)),
  remove: (id: string) => unwrapResult(getHaigeApi().suppliers.remove(id)),
};

export const accountApi = {
  list: (query?: ListQuery) => unwrapResult(getHaigeApi().accounts.list(query)),
  create: (input: unknown) => unwrapResult(getHaigeApi().accounts.create(input)),
  update: (id: string, input: unknown) => unwrapResult(getHaigeApi().accounts.update(id, input)),
  remove: (id: string) => unwrapResult(getHaigeApi().accounts.remove(id)),
};

export const categoryApi = {
  list: (query?: ListQuery) => unwrapResult(getHaigeApi().categories.list(query)),
  create: (input: unknown) => unwrapResult(getHaigeApi().categories.create(input)),
  update: (id: string, input: unknown) => unwrapResult(getHaigeApi().categories.update(id, input)),
  remove: (id: string) => unwrapResult(getHaigeApi().categories.remove(id)),
};

export type { Account, Category, Contract, ContractListItem, Customer, CustomerProject, Employee, ProjectListItem, Supplier };

function getHaigeApi() {
  if (!window.haige) {
    throw new Error('Electron preload API 未加载。请在 Electron 窗口中使用本系统。');
  }

  return window.haige;
}
