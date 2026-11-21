// Source-level isolation gate: Package B cannot share production or any
// earlier DEMO profile. Native Windows installed behaviour is a separate gate.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const tr=resolve(root,'src-tauri');
const read=name=>JSON.parse(readFileSync(resolve(tr,name),'utf8'));
const names=['tauri.conf.json','tauri.demo.conf.json','tauri.packagec.conf.json','tauri.group10.conf.json','tauri.packagea.conf.json','tauri.packageb.conf.json'];
const configs=names.map(read);
const identifiers=configs.map(x=>x.identifier);
if(identifiers.some(x=>!x||typeof x!=='string')||new Set(identifiers).size!==identifiers.length)
  throw Error('Unsafe: missing or reused Tauri data profile identifier');
const base=configs[0],packA=configs[4],packB=configs[5];
if(base.identifier!=='com.personaltradingjournal.desktop'
 ||packA.identifier!=='com.personaltradingjournal.desktop.demo.packagea.acceptance'
 ||packB.identifier!=='com.personaltradingjournal.desktop.demo.packageb.acceptance')
  throw Error('Unexpected production or Package A/B identifier');
if(packB.productName!=='Personal Trading Journal Package B DEMO'
 ||!packB.app?.windows?.[0]?.title?.includes('PACKAGE B ISOLATED ACCEPTANCE DEMO'))
  throw Error('Package B title must be identifiable without modifying the accepted original');
if(['build','bundle','version'].some(k=>k in packB))
  throw Error('Package B overlay must not alter approved version, icons or bundler');
const pathSrc=readFileSync(resolve(tr,'src','paths.rs'),'utf8');
if(!pathSrc.includes('app.path().app_local_data_dir()')
 ||!pathSrc.includes('self.data.join("journal.db")')
 ||!pathSrc.includes('data: root.join("data")'))
  throw Error('Unsafe: Journal SQLite must remain under identifier-specific local data');
if(!base.bundle?.icon?.includes('icons/icon.ico')
 ||base.bundle?.windows?.nsis?.installerIcon!=='icons/icon.ico')
  throw Error('Already accepted installer icon configuration changed');
console.log('PASS: Package B has a unique native Windows identity and isolated app-local SQLite source root.');
console.log('LIMIT: No Windows installation or user acceptance has been performed by this source check.');
