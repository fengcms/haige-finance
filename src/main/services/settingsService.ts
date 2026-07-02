import { defaultPageSize, normalizePageSize } from '../../shared/constants/pagination.js';
import { updateAppSettingsSchema } from '../../shared/schemas/settings.js';
import type { AppSettings } from '../../shared/types/settings.js';
import { getSqlite } from '../db/index.js';

const defaultPageSizeKey = 'settings_default_page_size';

export class SettingsService {
  get(): AppSettings {
    return {
      defaultPageSize: normalizePageSize(this.getMeta(defaultPageSizeKey) ?? defaultPageSize),
    };
  }

  update(input: unknown): AppSettings {
    const data = updateAppSettingsSchema.parse(input);
    const now = Date.now();

    if (data.defaultPageSize !== undefined) {
      this.setMeta(defaultPageSizeKey, String(data.defaultPageSize), now);
    }

    return this.get();
  }

  private getMeta(key: string): string | null {
    const row = getSqlite().prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as { value?: string } | undefined;
    return row?.value ?? null;
  }

  private setMeta(key: string, value: string, now: number) {
    getSqlite()
      .prepare(
        `
          INSERT INTO app_meta (key, value, created_at, updated_at)
          VALUES (@key, @value, @now, @now)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        `,
      )
      .run({ key, value, now });
  }
}
