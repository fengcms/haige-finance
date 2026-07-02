import type { SupplierStatus, SupplierType } from '../constants/enums.js';
import type { BaseEntity } from './common.js';

export interface Supplier extends BaseEntity {
  name: string;
  contactName?: string | null;
  phone?: string | null;
  address?: string | null;
  type: SupplierType;
  status: SupplierStatus;
  remark?: string | null;
}
