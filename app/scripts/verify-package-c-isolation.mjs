// Source-level fail-closed DEMO isolation guard, NOT Windows acceptance.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=(path)=>JSON.parse(readFileSync(resolve(root,'src-tauri',path),'utf8'));
const app=read('tauri.conf.json'),prior=read('tauri.demo.conf.json'),pkg=read('tauri.packagec.conf.json');
if(!app.identifier||!prior.identifier||!pkg.identifier||
  new Set([app.identifier,prior.identifier,pkg.identifier]).size!==3)
  throw new Error('Package C / prior DEMO / production identifiers must be unique');
if(pkg.identifier!==app.identifier+'.demo.packagec')
  throw new Error('Unexpected new Package C app identity');
if(!pkg.productName?.includes('Package C DEMO')||
   !pkg.app?.windows?.[0]?.title?.includes('ISOLATED DEMO'))
  throw new Error('Package C window/installer label must clearly identify the separate test profile');
if(pkg.version||pkg.build||pkg.bundle)
  throw new Error('Package C override must preserve standard build/bundle/version inheritance');
const paths=readFileSync(resolve(root,'src-tauri/src/paths.rs'),'utf8');
if(!paths.includes('app.path().app_local_data_dir()')||!paths.includes('self.data.join("journal.db")'))
  throw new Error('SQLite must stay in the active Tauri identifier local app-data path');
console.log('PASS: Package C source configuration has independent app identity/data path; Windows installation remains UNTESTED');
