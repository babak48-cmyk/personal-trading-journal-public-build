from pathlib import Path
import re, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def req(c,m):
    if not c: errors.append(m)

runtime=(ROOT/'src-tauri/src/runtime.rs').read_text(encoding='utf-8')
db=(ROOT/'src-tauri/src/db.rs').read_text(encoding='utf-8')
lib=(ROOT/'src-tauri/src/lib.rs').read_text(encoding='utf-8')
commands=(ROOT/'src-tauri/src/commands.rs').read_text(encoding='utf-8')
api=(ROOT/'src/services/localApi.ts').read_text(encoding='utf-8')
app=(ROOT/'src/App.tsx').read_text(encoding='utf-8')
css=(ROOT/'src/styles.css').read_text(encoding='utf-8')

for token in ['foreign_key_violations','ready_for_live_data','latest_backup_age_hours','attachments_writable','exports_writable']:
    req(token in runtime, f'runtime readiness missing {token}')
req('PRAGMA busy_timeout = 5000' in db,'SQLite busy_timeout safeguard missing')
req('foreign_key_violation_count' in db,'foreign-key validation helper missing')
req('mod runtime;' in lib and 'commands::runtime_readiness' in lib,'runtime readiness command not registered')
req('pub fn runtime_readiness' in commands,'runtime readiness command missing')
req("runtimeReadiness: () => invoke<RuntimeReadiness>('runtime_readiness')" in api,'frontend runtime API missing')
req('Local Safety Check' in app,'Safety UI panel missing')
req('Create backup' in app and 'ready_for_live_data' in app,'Safety UI does not expose backup/readiness state')
req('.safetyPanel' in css,'Safety UI styles missing')

if errors:
    for e in errors: print('FAIL:',e)
    sys.exit(1)
print('PASS: phase8 runtime safeguards + local safety center static validation')
