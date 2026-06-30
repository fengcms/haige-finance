import type { CustomerStatus } from '../constants/enums.js';
import type { BaseEntity } from './common.js';

export interface Customer extends BaseEntity {
  name: string;
  phone?: string | null;
  address?: string | null;
  community?: string | null;
  houseNumber?: string | null;
  status: CustomerStatus;
  remark?: string | null;
}
