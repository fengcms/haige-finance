import { getDatabasePath, getSqlite } from '../db/index.js';

export class AppRepository {
  getDatabaseStatus() {
    const db = getSqlite();
    const result = db.prepare('SELECT 1 AS ok').get() as { ok: number };

    return {
      ok: result.ok === 1,
      path: getDatabasePath(),
    };
  }
}
