import type { PageSizeOption } from '../constants/pagination.js';

export interface AppSettings {
  defaultPageSize: PageSizeOption;
}

export interface UpdateAppSettingsInput {
  defaultPageSize?: PageSizeOption;
}
