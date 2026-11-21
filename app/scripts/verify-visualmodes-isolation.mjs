// Read-only source guard for the Package B-derived Visual Modes DEMO.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(process.cwd(),'src-tauri');
const read=name=>JSON.parse(readFileSync(resolve(root,name),'utf8'));
const originals=['tauri.conf.json','tauri.demo.conf.json','tauri.packagec.conf.json','tauri.group10.conf.json','tauri.packagea.conf.json','tauri.packageb.conf.json'];
const ids=originals.map(name=>read(name).identifier);
const next=read('tauri.visualmodes.conf.json');
if(next.identifier!=='com.personaltradingjournal.desktop.demo.visualmodes.acceptance'||ids.includes(next.identifier)||new Set(ids).size!==ids.length)throw Error('Unsafe: Visual Modes profile collision');
if(next.productName!=='Personal Trading Journal Visual Modes DEMO'||!next.app?.windows?.[0]?.title?.includes('COLORFUL'))throw Error('Wrong visual package identity');
if(['build','bundle','version'].some(k=>k in next))throw Error('Visual overlay changes non-visual app semantics');
const src=readFileSync(resolve(root,'src','paths.rs'),'utf8');
if(!src.includes('app.path().app_local_data_dir()')||!src.includes('self.data.join("journal.db")'))throw Error('Missing app-specific SQLite path');
const source=readFileSync(resolve(process.cwd(),'src','appearance.ts'),'utf8');
for(const mode of ["BASIC","HIGHLIGHT","COLORFUL"])if(!source.includes("'"+mode+"'"))throw Error('Missing visual mode '+mode);
console.log('PASS: Separate Visual Modes profile; original Package B identifier and data root preserved.');
