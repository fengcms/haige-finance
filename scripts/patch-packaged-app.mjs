import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createPackage, extractAll } from '@electron/asar';

const appResourcesDir = path.join(process.cwd(), 'release', 'mac-arm64', '海哥财务管理.app', 'Contents', 'Resources');
const appAsarPath = path.join(appResourcesDir, 'app.asar');
const backupAsarPath = path.join(appResourcesDir, `app.asar.backup-${Date.now()}`);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'haige-finance-asar-'));

if (!fs.existsSync(appAsarPath)) {
  throw new Error(`app.asar not found: ${appAsarPath}`);
}

extractAll(appAsarPath, tempDir);

fs.rmSync(path.join(tempDir, 'dist'), { recursive: true, force: true });
fs.cpSync(path.join(process.cwd(), 'dist'), path.join(tempDir, 'dist'), { recursive: true });

fs.copyFileSync(appAsarPath, backupAsarPath);
await createPackage(tempDir, appAsarPath);
fs.rmSync(tempDir, { recursive: true, force: true });

console.log('Packaged app patched');
console.log(`Updated: ${appAsarPath}`);
console.log(`Backup: ${backupAsarPath}`);
