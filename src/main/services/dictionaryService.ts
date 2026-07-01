import { dictionaryQuerySchema, updateDictionaryItemPayloadSchema } from '../../shared/schemas/dictionary.js';
import type { DictionaryItem } from '../../shared/types/dictionary.js';
import { DictionaryRepository } from '../repositories/dictionaryRepository.js';

export class DictionaryService {
  constructor(private readonly repository = new DictionaryRepository()) {}

  list(query: unknown): DictionaryItem[] {
    return this.repository.list(dictionaryQuerySchema.parse(query));
  }

  update(payload: unknown): DictionaryItem {
    const { id, input } = updateDictionaryItemPayloadSchema.parse(payload);
    return this.repository.update(id, input, Date.now());
  }
}
