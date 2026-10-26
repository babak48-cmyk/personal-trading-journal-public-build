// Source-only check; does NOT test a native Windows runtime or write to app data.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const standard = JSON.parse(readFileSync(resolve(appRoot, 'src-tauri/tauri.conf.json'), 'utf8'));
const demo = JSON.parse(readFileSync(resolve(appRoot, 'src-tauri/tauri.demo.conf.json'), 'utf8'));
if (!standard.identifier || !demo.identifier || standard.identifier === demo.identifier) {
  throw new Error('DEMO must have a unique Tauri identifier; refusing shared profile.');
}
if (!demo.identifier.endsWith('.demo') || !demo.productName?.includes('DEMO')) {
  throw new Error('DEMO product identifier and label must be unambiguous.');
}
if (demo.version || demo.build || demo.bundle) {
  throw new Error('DEMO override must inherit version/build/bundle from canonical config.');
}
if (demo.app?.windows?.[0]?.title?.includes('DEMO') !== true) {
  throw new Error('DEMO window title must clearly disclose separate profile.');
}
console.log('PASS: DEMO configuration source identity differs from normal app. Windows data-path isolation remains UNTESTED.');
