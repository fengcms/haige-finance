import type { OperationAction } from '../constants/enums.js';

export interface OperationLog {
  id: string;
  entityType: string;
  entityId?: string | null;
  action: OperationAction;
  detail?: string | null;
  createdAt: number;
}
