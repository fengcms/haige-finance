import { CENTS_PER_YUAN } from '../constants/finance.js';

export function centsToYuan(cents: number): string {
  return (cents / CENTS_PER_YUAN).toFixed(2);
}

export function yuanToCents(yuan: string | number): number {
  const value = typeof yuan === 'number' ? yuan : Number(yuan);
  if (!Number.isFinite(value)) {
    throw new Error('Invalid money amount');
  }

  return Math.round(value * CENTS_PER_YUAN);
}
