import { ipcMain } from 'electron';
import { ZodError } from 'zod';
import type { ApiResult } from '../../shared/types/api.js';

type Handler<TPayload, TResult> = (payload: TPayload) => TResult | Promise<TResult>;

export function registerIpcHandler<TPayload = unknown, TResult = unknown>(
  channel: string,
  handler: Handler<TPayload, TResult>,
) {
  ipcMain.handle(channel, async (_event, payload: TPayload): Promise<ApiResult<TResult>> => {
    try {
      const data = await handler(payload);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: normalizeError(error),
      };
    }
  });
}

function normalizeError(error: unknown) {
  if (error instanceof ZodError) {
    return {
      message: error.issues.map((issue) => issue.message).join('；'),
      code: 'VALIDATION_ERROR',
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'INTERNAL_ERROR',
    };
  }

  return {
    message: '未知错误',
    code: 'UNKNOWN_ERROR',
  };
}
