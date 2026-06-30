import type { ApiResult } from '@/shared/types/api';

export async function unwrapResult<T>(promise: Promise<ApiResult<T>>): Promise<T> {
  const result = await promise;

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}
