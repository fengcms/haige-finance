import { getSqlite } from './index.js';
import { seedDefaultData } from './seedData.js';

export function seedDatabase() {
  const db = getSqlite();
  const now = Date.now();

  db.prepare(
    `
      INSERT INTO app_meta (key, value, created_at, updated_at)
      VALUES (@key, @value, @createdAt, @updatedAt)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
  ).run({
    key: 'db_initialized',
    value: 'true',
    createdAt: now,
    updatedAt: now,
  });

  db.prepare(
    `
      INSERT INTO app_meta (key, value, created_at, updated_at)
      VALUES (@key, @value, @createdAt, @updatedAt)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
  ).run({
    key: 'db_schema_version',
    value: '2',
    createdAt: now,
    updatedAt: now,
  });

  seedDefaultData(db, now);
}
