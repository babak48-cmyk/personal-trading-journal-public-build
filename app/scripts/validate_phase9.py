from pathlib import Path
root=Path(__file__).resolve().parents[1]
checks={
 'diagnostics source': root/'src-tauri/src/diagnostics.rs',
 'commands': root/'src-tauri/src/commands.rs',
 'lib': root/'src-tauri/src/lib.rs',
 'api': root/'src/services/localApi.ts',
 'app': root/'src/App.tsx',
}
for name,p in checks.items():
    assert p.exists(), f'missing {name}: {p}'
text=(root/'src-tauri/src/diagnostics.rs').read_text()
for token in ['temporary_paths','Repository write/read persistence: PASS','Attachment copy + hash + preview read: PASS','Backup validate + staging restore + restored integrity: PASS']:
    assert token in text, token
assert 'run_beta_self_test' in (root/'src-tauri/src/commands.rs').read_text()
assert 'commands::run_beta_self_test' in (root/'src-tauri/src/lib.rs').read_text()
assert "invoke<BetaSelfTestResult>('run_beta_self_test')" in (root/'src/services/localApi.ts').read_text()
app=(root/'src/App.tsx').read_text()
assert 'Run beta self-test' in app and 'does not modify the live journal' in app
print('PASS: phase9 isolated runtime beta self-test wiring + live-data isolation static validation')
