import { DictionaryService } from '../services/dictionaryService.js';
import { registerIpcHandler } from './helpers.js';

export function registerDictionaryIpc() {
  const service = new DictionaryService();

  registerIpcHandler('dictionaries:list', (payload) => service.list(payload));
  registerIpcHandler('dictionaries:update', (payload) => service.update(payload));
}
