import type { CategoryStatus, CategoryType, FundType } from '../constants/enums.js';
import type { BaseEntity } from './common.js';

export interface Category extends BaseEntity {
  name: string;
  type: CategoryType;
  fundType?: FundType | null;
  affectsReceivable: boolean;
  affectsProjectProfit: boolean;
  sortOrder: number;
  status: CategoryStatus;
  remark?: string | null;
}
