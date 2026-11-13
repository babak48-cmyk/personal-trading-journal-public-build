// Source-only UX DEMO identity guard. Native Windows installation remains a separate gate.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=name=>JSON.parse(readFileSync(resolve(root,'src-tauri',name),'utf8'));
const normal=read('tauri.conf.json');
const baseline=read('tauri.demo.conf.json');
const ux=read('tauri.ux-demo.conf.json');
if(ux.identifier!=='com.personaltradingjournal.desktop.uxdemo'
 || new Set([normal.identifier,baseline.identifier,ux.identifier]).size!==3)
 throw new Error('Refusing UX demo: identifier must differ from production AND baseline DEMO.');
if(ux.productName!=='Personal Trading Journal UX DEMO'
 || !ux.app?.windows?.[0]?.title?.includes('UX DEMO')
 || ux.version||ux.build||ux.bundle)
 throw new Error('UX demo name, title or config override not isolated.');
const paths=readFileSync(resolve(root,'src-tauri/src/paths.rs'),'utf8');
if(!paths.includes('app.path().app_local_data_dir()')
 || !paths.includes('self.data.join("journal.db")'))
 throw new Error('App-specific journal data directory guard failed.');
const app=readFileSync(resolve(root,'src/App.tsx'),'utf8');
if(!app.includes('You are here:')||!app.includes('Open Trade Reviews'))
 throw new Error('Source does not contain required new UX navigation.');
console.log('PASS: distinct UX DEMO identifier and UI; Windows runtime path separation still untested.');
