// Guard the isolated Group 10 DEMO against accidental replacement of
// the accepted production, Package B or Package C app data profiles.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=p=>JSON.parse(readFileSync(resolve(root,'src-tauri',p),'utf8'));
const base=read('tauri.conf.json');
const prior=read('tauri.demo.conf.json');
const c=read('tauri.packagec.conf.json');
const group=read('tauri.group10.conf.json');
const ids=[base.identifier,prior.identifier,c.identifier,group.identifier];
if(ids.some(x=>!x) || new Set(ids).size!==ids.length)throw Error('Unsafe reused app-data identifier');
if(group.identifier!=='com.personaltradingjournal.desktop.demo.group10')throw Error('Unexpected Setup DEMO path');
if(!group.app.windows[0].title.includes('GROUP 10 ISOLATED DEMO')||
   !group.productName.includes('Group 10 DEMO'))throw Error('Unclear Group 10 installer identity');
if(group.build || group.bundle || group.version)throw Error('Do not override approved build/icon/version');
const paths=readFileSync(resolve(root,'src-tauri/src/paths.rs'),'utf8');
if(!paths.includes('app.path().app_local_data_dir()')||!paths.includes('self.data.join("journal.db")'))
 throw Error('The app database must use identifier-specific local data');
console.log('PASS: Group 10 independently isolated Tauri app ID and journal DB path. Installed Windows acceptance pending.');
