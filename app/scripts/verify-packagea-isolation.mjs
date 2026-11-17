// Fail closed if Package A accidentally reuses any existing Tauri app identity,
// modifies the accepted application defaults, or uses an unsafe database root.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const tauriRoot=resolve(root,'src-tauri');
const read=filename=>JSON.parse(readFileSync(resolve(tauriRoot,filename),'utf8'));
const configs=[
  'tauri.conf.json',
  'tauri.demo.conf.json',
  'tauri.packagec.conf.json',
  'tauri.group10.conf.json',
  'tauri.packagea.conf.json',
].map(read);
const [base,oldDemo,packageC,group10,packageA]=configs;
const ids=configs.map(c=>c.identifier);
const expected='com.personaltradingjournal.desktop.demo.packagea.acceptance';
if(ids.some(id=>typeof id!=='string'||!id.trim())||new Set(ids).size!==ids.length) {
  throw Error('Unsafe: a Tauri application identity is missing or reused');
}
if(packageA.identifier!==expected)throw Error('Unsafe unexpected Package A application identity');
if(!packageA.productName?.includes('Package A DEMO'))throw Error('Unexpected installer product name');
if(!packageA.app?.windows?.[0]?.title?.includes('PACKAGE A ISOLATED ACCEPTANCE DEMO')) {
  throw Error('Package A Windows title must clearly distinguish this test instance');
}
if('build' in packageA || 'bundle' in packageA || 'version' in packageA) {
  throw Error('Package A overlay must not replace the approved build, bundle, icons or version');
}
if(base.identifier!=='com.personaltradingjournal.desktop' ||
   group10.identifier!=='com.personaltradingjournal.desktop.demo.group10') {
  throw Error('Unexpected change to accepted baseline or prior Group10 identity');
}
const paths=readFileSync(resolve(tauriRoot,'src','paths.rs'),'utf8');
if(!paths.includes('app.path().app_local_data_dir()') ||
   !paths.includes('self.data.join("journal.db")') ||
   !paths.includes('data: root.join("data")')) {
  throw Error('DB must be under the identifier-specific application local-data root');
}
if(!base.bundle?.icon?.includes('icons/icon.ico')||
   base.bundle?.windows?.nsis?.installerIcon!=='icons/icon.ico') {
  throw Error('Missing already approved icon configuration');
}
console.log('PASS: Package A has new unique application identity and distinct app-local-data path; prior app IDs unchanged.');
console.log('CAUTION: Source identity check only. Installed Windows data-path and backup recovery remain UNVERIFIED.');
