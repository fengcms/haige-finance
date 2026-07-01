import fs from 'node:fs';
import path from 'node:path';
import { extractFile, listPackage } from '@electron/asar';

const appAsarPath = path.join(process.cwd(), 'release', 'mac-arm64', '海哥财务管理.app', 'Contents', 'Resources', 'app.asar');

if (!fs.existsSync(appAsarPath)) {
  throw new Error(`Packaged app.asar not found: ${appAsarPath}`);
}

const header = listPackage(appAsarPath);
const requiredFiles = [
  '/dist/main/main.js',
  '/dist/preload/index.cjs',
  '/dist/renderer/index.html',
  '/dist/shared/schemas/account.js',
  '/dist/shared/constants/enums.js',
];

for (const file of requiredFiles) {
  if (!header.includes(file)) {
    throw new Error(`Packaged app is missing required file: ${file}`);
  }
}

const rendererIndex = extractFile(appAsarPath, 'dist/renderer/index.html').toString('utf8');
if (rendererIndex.includes('src="/assets') || rendererIndex.includes('href="/assets')) {
  throw new Error('Packaged renderer index.html uses absolute /assets paths. Vite build must use base: "./" for file:// loading.');
}

console.log('Pack smoke test passed');
console.log(`Verified app.asar: ${appAsarPath}`);
