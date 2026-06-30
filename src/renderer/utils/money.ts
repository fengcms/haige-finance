import { centsToYuan, yuanToCents } from '@/shared/utils/money';

export function formatYuan(cents?: number | null) {
  return centsToYuan(cents ?? 0);
}

export function parseYuan(value?: string | number | null) {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  return yuanToCents(value);
}
