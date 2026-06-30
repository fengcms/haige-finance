import type { EmployeeStatus } from '../constants/enums.js';
import type { BaseEntity } from './common.js';

export interface Employee extends BaseEntity {
  name: string;
  phone?: string | null;
  position?: string | null;
  entryDate?: string | null;
  status: EmployeeStatus;
  remark?: string | null;
}
