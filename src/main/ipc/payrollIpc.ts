import {
  createPayrollItemsBatchSchema,
  idPayloadSchema,
  payPayrollBatchSchema,
  updatePayrollBatchPayloadSchema,
  updatePayrollItemPayloadSchema,
  voidPayrollBatchSchema,
} from '../../shared/schemas/payroll.js';
import { PayrollService } from '../services/payrollService.js';
import { registerIpcHandler } from './helpers.js';

export function registerPayrollIpc() {
  const service = new PayrollService();

  registerIpcHandler('payroll:list-batches', (payload) => service.listBatches(payload));
  registerIpcHandler('payroll:create-batch', (payload) => service.createBatch(payload));
  registerIpcHandler('payroll:update-batch', (payload) => {
    const { id, input } = updatePayrollBatchPayloadSchema.parse(payload);
    return service.updateBatch(id, input);
  });
  registerIpcHandler('payroll:delete-batch', (payload) => {
    const { id } = idPayloadSchema.parse(payload);
    return service.removeBatch(id);
  });
  registerIpcHandler('payroll:get-detail', (payload) => {
    const { id } = idPayloadSchema.parse(payload);
    return service.getDetail(id);
  });
  registerIpcHandler('payroll:create-item', (payload) => service.createItem(payload));
  registerIpcHandler('payroll:create-items-batch', (payload) => service.createItemsBatch(createPayrollItemsBatchSchema.parse(payload)));
  registerIpcHandler('payroll:update-item', (payload) => {
    const { id, input } = updatePayrollItemPayloadSchema.parse(payload);
    return service.updateItem(id, input);
  });
  registerIpcHandler('payroll:delete-item', (payload) => {
    const { id } = idPayloadSchema.parse(payload);
    return service.removeItem(id);
  });
  registerIpcHandler('payroll:confirm-batch', (payload) => {
    const { id } = idPayloadSchema.parse(payload);
    return service.confirmBatch(id);
  });
  registerIpcHandler('payroll:cancel-confirm-batch', (payload) => {
    const { id } = idPayloadSchema.parse(payload);
    return service.cancelConfirmBatch(id);
  });
  registerIpcHandler('payroll:pay-batch', (payload) => service.payBatch(payPayrollBatchSchema.parse(payload)));
  registerIpcHandler('payroll:void-batch', (payload) => {
    const { id, reason } = voidPayrollBatchSchema.parse(payload);
    return service.voidBatch(id, reason);
  });
}
