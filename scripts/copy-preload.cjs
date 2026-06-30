const fs = require('node:fs');
const path = require('node:path');

const source = path.join(process.cwd(), 'src/preload/index.cjs');
const targetDir = path.join(process.cwd(), 'dist/preload');
const target = path.join(targetDir, 'index.cjs');

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
