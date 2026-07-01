import Database from 'better-sqlite3';
import { defaultDictionaryItems } from '../dist/shared/constants/dictionaries.js';
import { migrateSql } from '../dist/main/db/migrations.js';
import { seedDefaultData } from '../dist/main/db/seedData.js';

const db = new Database(':memory:');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(migrateSql);
seedDefaultData(db);

const customerStatusCount = db
  .prepare("SELECT COUNT(*) AS count FROM dictionary_items WHERE dict_type = 'customer_status' AND deleted_at IS NULL")
  .get().count;

if (customerStatusCount < 5) {
  throw new Error('Default customer status dictionary seed failed');
}

const target = db
  .prepare("SELECT * FROM dictionary_items WHERE dict_type = 'customer_status' AND code = 'potential' AND deleted_at IS NULL")
  .get();

if (!target) {
  throw new Error('Missing potential customer status dictionary item');
}

const updatedAt = Date.now();
db.prepare(
  `
    UPDATE dictionary_items
    SET name = @name, sort_order = @sortOrder, status = 'inactive', updated_at = @updatedAt
    WHERE id = @id AND deleted_at IS NULL
  `,
).run({
  id: target.id,
  name: '测试潜在客户',
  sortOrder: 99,
  updatedAt,
});

const updated = db.prepare('SELECT name, sort_order AS sortOrder, status FROM dictionary_items WHERE id = ?').get(target.id);
if (updated.name !== '测试潜在客户' || updated.sortOrder !== 99 || updated.status !== 'inactive') {
  throw new Error('Dictionary update check failed');
}

seedDefaultData(db, updatedAt + 1);

const preserved = db.prepare('SELECT name, status FROM dictionary_items WHERE id = ?').get(target.id);
if (preserved.name !== '测试潜在客户' || preserved.status !== 'inactive') {
  throw new Error('Dictionary seed should not overwrite custom name or status');
}

const totalDefaultCount = defaultDictionaryItems.filter((item) =>
  db.prepare('SELECT 1 AS ok FROM dictionary_items WHERE dict_type = ? AND code = ?').get(item.dictType, item.code),
).length;

if (totalDefaultCount !== defaultDictionaryItems.length) {
  throw new Error('Default dictionary item count check failed');
}

db.close();

console.log('Dictionary smoke test passed');
console.log(`Verified default dictionary items: ${defaultDictionaryItems.length}`);
