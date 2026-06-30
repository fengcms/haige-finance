export interface ApiError {
  message: string;
  code?: string;
}

export type ApiResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: ApiError;
    };

export interface ListQuery {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface ListResult<T> {
  items: T[];
  total: number;
}
