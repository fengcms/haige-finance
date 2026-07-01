import type { DictionaryStatus, DictionaryType } from '../constants/dictionaries.js';
import type { BaseEntity } from './common.js';

export interface DictionaryItem extends BaseEntity {
  dictType: DictionaryType;
  code: string;
  name: string;
  sortOrder: number;
  status: DictionaryStatus;
  isSystem: boolean;
  remark?: string | null;
}

export interface DictionaryQuery {
  dictType?: DictionaryType;
}

export interface UpdateDictionaryItemInput {
  name?: string;
  sortOrder?: number;
  status?: DictionaryStatus;
  remark?: string | null;
}
