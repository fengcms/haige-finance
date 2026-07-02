export const pageSizeOptions = [10, 20, 50, 100] as const;

export type PageSizeOption = (typeof pageSizeOptions)[number];

export const defaultPageSize: PageSizeOption = 20;
export const maxPageSize = 100;

export function normalizePageSize(value: unknown): PageSizeOption {
  const numericValue = Number(value);
  return pageSizeOptions.includes(numericValue as PageSizeOption) ? (numericValue as PageSizeOption) : defaultPageSize;
}
