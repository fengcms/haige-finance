import { z } from 'zod';
import { createAccountSchema } from '../../shared/schemas/account.js';
import { createCategorySchema } from '../../shared/schemas/category.js';
import { createContractSchema } from '../../shared/schemas/contract.js';
import { createCustomerSchema } from '../../shared/schemas/customer.js';
import { createEmployeeSchema } from '../../shared/schemas/employee.js';
import { createProjectSchema } from '../../shared/schemas/project.js';
import { createSupplierSchema } from '../../shared/schemas/supplier.js';
import type { ListQuery, ListResult } from '../../shared/types/api.js';
import type { Account } from '../../shared/types/account.js';
import type { Category } from '../../shared/types/category.js';
import type { Contract } from '../../shared/types/contract.js';
import type { Customer } from '../../shared/types/customer.js';
import type { Employee } from '../../shared/types/employee.js';
import type { CustomerProject } from '../../shared/types/project.js';
import type { Supplier } from '../../shared/types/supplier.js';
import { MasterDataRepository, type EntityName } from '../repositories/masterDataRepository.js';

type EntityMap = {
  customers: Customer;
  projects: CustomerProject & { customerName?: string };
  contracts: Contract & { customerName?: string; projectName?: string };
  employees: Employee;
  suppliers: Supplier;
  accounts: Account;
  categories: Category;
};

type EntityInput = Record<string, unknown>;

const createSchemas = {
  customers: createCustomerSchema,
  projects: createProjectSchema,
  contracts: createContractSchema,
  employees: createEmployeeSchema,
  suppliers: createSupplierSchema,
  accounts: createAccountSchema,
  categories: createCategorySchema,
} satisfies Record<EntityName, z.ZodTypeAny>;

const updateSchemas = {
  customers: createCustomerSchema.partial(),
  projects: createProjectSchema.partial(),
  contracts: createContractSchema.partial(),
  employees: createEmployeeSchema.partial(),
  suppliers: createSupplierSchema.partial(),
  accounts: createAccountSchema.partial(),
  categories: createCategorySchema.partial(),
} satisfies Record<EntityName, z.ZodTypeAny>;

export class MasterDataService {
  constructor(private readonly repository = new MasterDataRepository()) {}

  list<TName extends EntityName>(entityName: TName, query: ListQuery = {}): ListResult<EntityMap[TName]> {
    return this.repository.list(entityName, query) as unknown as ListResult<EntityMap[TName]>;
  }

  create<TName extends EntityName>(entityName: TName, input: unknown): EntityMap[TName] {
    const now = Date.now();
    const data = createSchemas[entityName].parse(cleanInput(input)) as EntityInput;
    this.validateRelations(entityName, data);

    return this.repository.create(entityName, {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }) as unknown as EntityMap[TName];
  }

  update<TName extends EntityName>(entityName: TName, id: string, input: unknown): EntityMap[TName] {
    z.string().min(1).parse(id);
    const data = updateSchemas[entityName].parse(cleanInput(input)) as EntityInput;
    this.validateRelations(entityName, data);

    return this.repository.update(entityName, id, {
      ...data,
      updatedAt: Date.now(),
    }) as unknown as EntityMap[TName];
  }

  remove(entityName: EntityName, id: string) {
    z.string().min(1).parse(id);
    return this.repository.softDelete(entityName, id, Date.now());
  }

  private validateRelations(entityName: EntityName, data: EntityInput) {
    if (entityName === 'projects' && typeof data.customerId === 'string' && !this.repository.exists('customers', data.customerId)) {
      throw new Error('关联客户不存在');
    }

    if (entityName === 'contracts') {
      if (typeof data.customerId === 'string' && !this.repository.exists('customers', data.customerId)) {
        throw new Error('关联客户不存在');
      }

      if (typeof data.projectId === 'string' && !this.repository.exists('projects', data.projectId)) {
        throw new Error('关联项目不存在');
      }

      if (
        typeof data.customerId === 'string' &&
        typeof data.projectId === 'string' &&
        !this.repository.projectBelongsToCustomer(data.projectId, data.customerId)
      ) {
        throw new Error('所选项目不属于所选客户');
      }
    }
  }
}

function cleanInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value === '' ? undefined : value]),
  );
}
