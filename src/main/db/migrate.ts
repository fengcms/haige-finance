import { getSqlite } from './index.js';
import { migrateSql } from './migrations.js';

export function migrateDatabase() {
  const db = getSqlite();
  db.exec(migrateSql);
}
