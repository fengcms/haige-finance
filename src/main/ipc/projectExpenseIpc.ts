import {
  idPayloadSchema,
  updateProjectExpenseItemPayloadSchema,
  updateProjectExpenseOrderPayloadSchema,
  voidProjectExpenseOrderSchema,
} from '../../shared/schemas/projectExpense.js';
import { ProjectExpenseService } from '../services/projectExpenseService.js';
import { registerIpcHandler } from './helpers.js';

export function registerProjectExpenseIpc() {
  const service = new ProjectExpenseService();
  registerIpcHandler('project-expenses:list-orders', (payload) => service.listOrders(payload));
  registerIpcHandler('project-expenses:create-order', (payload) => service.createOrder(payload));
  registerIpcHandler('project-expenses:update-order', (payload) => {
    const { id, input } = updateProjectExpenseOrderPayloadSchema.parse(payload);
    return service.updateOrder(id, input);
  });
  registerIpcHandler('project-expenses:delete-order', (payload) => {
    const { id } = idPayloadSchema.parse(payload);
    return service.removeOrder(id);
  });
  registerIpcHandler('project-expenses:get-detail', (payload) => {
    const { id } = idPayloadSchema.parse(payload);
    return service.getDetail(id);
  });
  registerIpcHandler('project-expenses:create-item', (payload) => service.createItem(payload));
  registerIpcHandler('project-expenses:create-items-batch', (payload) => service.createItemsBatch(payload));
  registerIpcHandler('project-expenses:update-item', (payload) => {
    const { id, input } = updateProjectExpenseItemPayloadSchema.parse(payload);
    return service.updateItem(id, input);
  });
  registerIpcHandler('project-expenses:delete-item', (payload) => {
    const { id } = idPayloadSchema.parse(payload);
    return service.removeItem(id);
  });
  registerIpcHandler('project-expenses:confirm-order', (payload) => service.confirmOrder(payload));
  registerIpcHandler('project-expenses:void-order', (payload) => {
    const { id, reason } = voidProjectExpenseOrderSchema.parse(payload);
    return service.voidOrder(id, reason);
  });
}
