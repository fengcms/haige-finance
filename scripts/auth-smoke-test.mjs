import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'haige-auth-smoke-'));
process.chdir(tempRoot);

const { migrateDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/migrate.js')).href);
const { seedDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/seed.js')).href);
const { getDatabasePath, closeDatabase } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/db/index.js')).href);
const { AuthService } = await import(pathToFileURL(path.join(projectRoot, 'dist/main/services/authService.js')).href);

migrateDatabase();
seedDatabase();

const service = new AuthService();
if (service.getStatus().passwordSet) {
  throw new Error('Auth status should start without password');
}

service.setupPassword({ password: '123456', confirmPassword: '123456' });
if (!service.getStatus().passwordSet) {
  throw new Error('Password setup failed');
}

service.login({ password: '123456' });

try {
  service.login({ password: 'wrong-password' });
  throw new Error('Wrong password should fail');
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes('密码错误')) {
    throw error;
  }
}

service.changePassword({
  oldPassword: '123456',
  newPassword: 'abcdef',
  confirmPassword: 'abcdef',
});

service.login({ password: 'abcdef' });

const db = new Database(getDatabasePath(), { readonly: true });
const secretRows = db.prepare("SELECT key, value FROM app_meta WHERE key LIKE 'auth_password_%'").all();
db.close();
closeDatabase();

if (secretRows.some((row) => row.value === 'abcdef' || row.value === '123456')) {
  throw new Error('Password should not be stored in plain text');
}

console.log('Auth smoke test passed');
console.log(`Verified setup, login, wrong password, change password in temp directory: ${tempRoot}`);
