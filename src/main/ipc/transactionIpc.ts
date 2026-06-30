import { z } from 'zod';
import { TransactionService } from '../services/transactionService.js';
import { registerIpcHandler } from './helpers.js';

const updatePayloadSchema = z.object({
  id: z.string().min(1),
  input: z.unknown(),
});

const deletePayloadSchema = z.object({
  id: z.string().min(1),
});

export function registerTransactionIpc() {
  const service = new TransactionService();

  registerIpcHandler('transactions:list', (payload) => service.list(payload));
  registerIpcHandler('transactions:create', (payload) => service.create(payload));
  registerIpcHandler('transactions:update', (payload) => {
    const { id, input } = updatePayloadSchema.parse(payload);
    return service.update(id, input);
  });
  registerIpcHandler('transactions:void', (payload) => service.void(payload));
  registerIpcHandler('transactions:delete', (payload) => {
    const { id } = deletePayloadSchema.parse(payload);
    return service.remove(id);
  });
  registerIpcHandler('transactions:account-balances', () => service.getAccountBalances());
}
