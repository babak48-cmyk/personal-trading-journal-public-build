from pathlib import Path
import hashlib, json, sys

root = Path(__file__).resolve().parents[1]
nsis = root / 'src-tauri' / 'target' / 'release' / 'bundle' / 'nsis'
installers = sorted(nsis.glob('*.exe')) if nsis.exists() else []
if not installers:
    print(f'FAIL: no NSIS installer found in {nsis}')
    sys.exit(1)
rows=[]
for p in installers:
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''):
            h.update(chunk)
    rows.append({'file':p.name,'bytes':p.stat().st_size,'sha256':h.hexdigest()})
out = root / 'src-tauri' / 'target' / 'release' / 'bundle' / 'beta_artifacts.json'
out.write_text(json.dumps({'status':'PASS','installers':rows},indent=2),encoding='utf-8')
print('PASS: Windows installer artifact verified')
for r in rows:
    print(f"  {r['file']}  {r['bytes']} bytes  sha256={r['sha256']}")
