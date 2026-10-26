from pathlib import Path
import json, re, sys
root=Path(__file__).resolve().parents[1]
errors=[]

pkg=json.loads((root/'package.json').read_text(encoding='utf-8'))
conf=json.loads((root/'src-tauri/tauri.conf.json').read_text(encoding='utf-8'))
cargo=(root/'src-tauri/Cargo.toml').read_text(encoding='utf-8')
vm=re.search(r'^version\s*=\s*"([^"]+)"',cargo,re.M)
rv=re.search(r'^rust-version\s*=\s*"([^"]+)"',cargo,re.M)
versions={'package.json':pkg.get('version'),'tauri.conf.json':conf.get('version'),'Cargo.toml':vm.group(1) if vm else None}
if len(set(versions.values()))!=1:
    errors.append(f'version mismatch: {versions}')
if versions['package.json']!='1.7.0-beta.1': errors.append('expected release-candidate version 1.7.0-beta.1')
if not rv or tuple(map(int,rv.group(1).split('.')[:2])) < (1,90): errors.append('Cargo.toml rust-version must be >= 1.90 for current dialog plugin line')
expected={
 '@tauri-apps/api':'2.12.1',
 '@tauri-apps/plugin-dialog':'2.8.1',
}
for k,v in expected.items():
    if pkg.get('dependencies',{}).get(k)!=v: errors.append(f'{k} should be pinned to {v}')
if pkg.get('devDependencies',{}).get('@tauri-apps/cli')!='2.12.1': errors.append('@tauri-apps/cli should be pinned to 2.12.1')
eng=pkg.get('engines',{})
if 'node' not in eng or 'npm' not in eng: errors.append('package engines must declare node and npm')

wf=(root/'.github/workflows/windows-beta-build.yml').read_text(encoding='utf-8')
for token in ['npm run test','cargo fmt --check','cargo check','validate_phase11.py','collect_build_diagnostics.ps1']:
    if token not in wf: errors.append(f'workflow missing release-candidate gate token: {token}')
ps=(root/'scripts/build_windows.ps1').read_text(encoding='utf-8')
for token in ['validate_phase11.py','npm run test','cargo fmt --check','cargo check']:
    if token not in ps: errors.append(f'local build script missing: {token}')
for p in [root/'scripts/collect_build_diagnostics.ps1',root/'docs/NATIVE_BUILD_RC.md']:
    if not p.exists(): errors.append(f'missing {p.relative_to(root)}')

if errors:
    print('FAIL: phase11 release-candidate build-readiness validation')
    for e in errors: print(' -',e)
    sys.exit(1)
print('PASS: phase11 release-candidate build-readiness validation')
print('Versions:',versions)
