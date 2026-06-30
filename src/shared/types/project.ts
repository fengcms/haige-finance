import type { ProjectStatus, ProjectType } from '../constants/enums.js';
import type { BaseEntity } from './common.js';

export interface CustomerProject extends BaseEntity {
  customerId: string;
  name: string;
  community?: string | null;
  address?: string | null;
  projectType?: ProjectType | null;
  status: ProjectStatus;
  remark?: string | null;
}
