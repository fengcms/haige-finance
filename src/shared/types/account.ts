import type { AccountStatus, AccountType } from '../constants/enums.js';
import type { BaseEntity } from './common.js';

export interface Account extends BaseEntity {
  name: string;
  type: AccountType;
  status: AccountStatus;
  openingBalanceCents: number;
  remark?: string | null;
}
