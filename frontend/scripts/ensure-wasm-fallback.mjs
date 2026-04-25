import { cpSync, existsSync, mkdirSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const nextWasmRoot = path.join(root, '..', 'node_modules', 'next', 'wasm', '@next');
const sharedRoot = path.join(root, '..', 'node_modules', '@next');

for (const packageName of ['swc-wasm-nodejs', 'swc-wasm-web']) {
  const sourceDir = path.join(sharedRoot, packageName);
  const targetDir = path.join(nextWasmRoot, packageName);

  if (!existsSync(sourceDir)) {
    continue;
  }

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  if (readdirSync(targetDir).length === 0) {
    cpSync(sourceDir, targetDir, { recursive: true });
  }
}
