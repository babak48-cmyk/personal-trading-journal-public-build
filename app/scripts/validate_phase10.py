from pathlib import Path
import json, sys

root=Path(__file__).resolve().parents[1]
errors=[]
required=[
    root/'.github/workflows/windows-beta-build.yml',
    root/'scripts/verify_windows_artifact.py',
    root/'scripts/build_windows.ps1',
    root/'docs/WINDOWS_BUILD_HANDOFF.md',
]
for p in required:
    if not p.exists(): errors.append(f'missing {p.relative_to(root)}')

pkg=json.loads((root/'package.json').read_text(encoding='utf-8'))
if not str(pkg.get('version','')).startswith('1.7.0-beta.'): errors.append('package version is not a 1.7.0 beta release-candidate')

wf=(root/'.github/workflows/windows-beta-build.yml').read_text(encoding='utf-8')
for token in ['windows-latest','stable-x86_64-pc-windows-msvc','npm run build','npm run tauri build -- --bundles nsis','verify_windows_artifact.py','upload-artifact@v4']:
    if token not in wf: errors.append(f'workflow missing token: {token}')

ps=(root/'scripts/build_windows.ps1').read_text(encoding='utf-8')
if 'validate_phase10.py' not in ps: errors.append('local build script does not run phase10 validation')

if errors:
    print('FAIL: phase10 build handoff validation')
    for e in errors: print(' -',e)
    sys.exit(1)
print('PASS: phase10 Windows build automation/handoff static validation')
