import type { ContractStatus } from '../constants/enums.js';
import type { BaseEntity } from './common.js';

export interface Contract extends BaseEntity {
  customerId: string;
  projectId: string;
  contractNo?: string | null;
  name: string;
  amountCents: number;
  signedDate?: string | null;
  status: ContractStatus;
  remark?: string | null;
  attachmentPath?: string | null;
}
