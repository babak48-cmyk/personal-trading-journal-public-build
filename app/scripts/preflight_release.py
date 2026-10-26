from pathlib import Path
import json, re, sqlite3, tempfile, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
errors=[]
notes=[]

def req(cond,msg):
    if not cond: errors.append(msg)

pkg=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
conf=json.loads((ROOT/'src-tauri/tauri.conf.json').read_text(encoding='utf-8'))
req(pkg.get('type')=='module','package.json should remain ESM (type=module).')
req(conf.get('bundle',{}).get('targets')==['nsis'],'First personal beta should bundle NSIS only.')
req(conf.get('version')=='1.5.0','Tauri app version expected to be 1.5.0 for this gate.')
req(conf.get('bundle',{}).get('windows',{}).get('webviewInstallMode',{}).get('type')=='downloadBootstrapper','Windows WebView2 installer mode not explicitly configured.')

cargo=(ROOT/'src-tauri/Cargo.toml').read_text(encoding='utf-8')
req('rusqlite' in cargo,'rusqlite dependency missing.')
req('tauri-plugin-dialog' in cargo,'Tauri dialog plugin dependency missing.')

lib=(ROOT/'src-tauri/src/lib.rs').read_text(encoding='utf-8')
required_commands=['database_health','runtime_readiness','run_beta_self_test','create_backup','replace_live_from_backup','confirm_initial_plan','create_candidate_decision','create_trade_with_entry','save_trade_review','save_session_review','get_analytics_summary','import_attachment','export_journal_html','export_journal_csv']
for c in required_commands:
    req(f'commands::{c}' in lib,f'Critical command not registered: {c}')

migs=sorted((ROOT/'src-tauri/migrations').glob('*.sql'))
req(len(migs)>=6,'Expected at least six database migrations.')
nums=[]
for m in migs:
    mt=re.match(r'(\d+)_',m.name)
    if mt: nums.append(int(mt.group(1)))
req(nums==sorted(nums) and len(set(nums))==len(nums),'Migration numbering is duplicated or out of order.')

# Re-run the authoritative Python validation suite.
for script in ['validate_phase0.py','validate_phase6.py','validate_phase7.py','validate_beta_e2e.py','validate_phase8.py','validate_phase9.py']:
    cp=subprocess.run([sys.executable,str(ROOT/'scripts'/script)],capture_output=True,text=True)
    if cp.returncode:
        errors.append(f'{script} failed: {cp.stdout}\n{cp.stderr}')
    else:
        notes.append(cp.stdout.strip())

print('Personal Trading Journal release preflight')
for n in notes: print('PASS:',n.replace('PASS: ','',1))
if errors:
    for e in errors: print('FAIL:',e)
    sys.exit(1)
print('PASS: static release configuration and all available validation suites')
print('NOTE: native Rust/Tauri compilation is a separate Windows-only release gate.')
