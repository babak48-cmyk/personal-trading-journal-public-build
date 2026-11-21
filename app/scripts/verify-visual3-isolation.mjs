// Display-template candidate: verify it cannot overwrite any original app or test profile.
// Source-level checks only; installed Windows acceptance is separate.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const appRoot=resolve(fileURLToPath(new URL('..',import.meta.url)));
const tr=resolve(appRoot,'src-tauri');
const names=['tauri.conf.json','tauri.demo.conf.json','tauri.packagec.conf.json','tauri.group10.conf.json','tauri.packagea.conf.json','tauri.packageb.conf.json','tauri.visual3.conf.json'];
const configs=names.map(p=>JSON.parse(readFileSync(resolve(tr,p),'utf8')));
const ids=configs.map(c=>c.identifier);
if(ids.some(id=>typeof id!=='string'||!id.trim())||new Set(ids).size!==ids.length)
  throw Error('FAIL: visual3 would reuse an existing or missing Tauri data profile');
const [base,,,,a,b,candidate]=configs;
if(base.identifier!=='com.personaltradingjournal.desktop'
   ||a.identifier!=='com.personaltradingjournal.desktop.demo.packagea.acceptance'
   ||b.identifier!=='com.personaltradingjournal.desktop.demo.packageb.acceptance'
   ||candidate.identifier!=='com.personaltradingjournal.desktop.demo.visual3.acceptance')
  throw Error('FAIL: unexpected original or new application identifier');
if(candidate.productName!=='Personal Trading Journal 3 Visual Templates DEMO'
   ||!candidate.app?.windows?.[0]?.title?.includes('3 VISUAL TEMPLATES ISOLATED DEMO'))
  throw Error('FAIL: new demo title is not clearly separated');
if(['build','bundle','version'].some(k=>k in candidate))
  throw Error('FAIL: overlay must not mutate frozen build, version or icon defaults');
if(!base.bundle?.icon?.includes('icons/icon.ico')
   ||base.bundle?.windows?.nsis?.installerIcon!=='icons/icon.ico')
  throw Error('FAIL: existing approved icon config has changed');
const src=readFileSync(resolve(tr,'src','paths.rs'),'utf8');
if(!src.includes('app.path().app_local_data_dir()')
   ||!src.includes('data: root.join("data")')
   ||!src.includes('self.data.join("journal.db")'))
  throw Error('FAIL: SQLite root not proven identifier-local at source level');
console.log('PASS: visual3 installer identity and app-local SQLite root isolated from all previous PTJ instances.');
console.log('LIMIT: installed Windows filesystem behaviour and user acceptance require separate confirmation.');
