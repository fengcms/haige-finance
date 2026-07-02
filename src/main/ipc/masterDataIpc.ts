import { z } from 'zod';
import type { ListQuery } from '../../shared/types/api.js';
import { MasterDataService } from '../services/masterDataService.js';
import type { EntityName } from '../repositories/masterDataRepository.js';
import { registerIpcHandler } from './helpers.js';

const listQuerySchema = z
  .object({
    keyword: z.string().optional(),
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  })
  .optional();

const updatePayloadSchema = z.object({
  id: z.string().min(1),
  input: z.unknown(),
});

const deletePayloadSchema = z.object({
  id: z.string().min(1),
});

const entityNames: EntityName[] = ['customers', 'projects', 'contracts', 'employees', 'suppliers', 'accounts', 'categories'];

export function registerMasterDataIpc() {
  const service = new MasterDataService();

  for (const entityName of entityNames) {
    registerIpcHandler(`${entityName}:list`, (payload) => service.list(entityName, listQuerySchema.parse(payload) as ListQuery | undefined));
    registerIpcHandler(`${entityName}:create`, (payload) => service.create(entityName, payload));
    registerIpcHandler(`${entityName}:update`, (payload) => {
      const { id, input } = updatePayloadSchema.parse(payload);
      return service.update(entityName, id, input);
    });
    registerIpcHandler(`${entityName}:delete`, (payload) => {
      const { id } = deletePayloadSchema.parse(payload);
      return service.remove(entityName, id);
    });
  }
}
