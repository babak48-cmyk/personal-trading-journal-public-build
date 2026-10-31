# PTJ Public Recovery Checkpoint — 2026-10-31

Status: PARTIAL / NOT CI-TESTED / NOT WINDOWS-TESTED / NOT ACCEPTED.

## Authority and protection
- Private repository remains read-only. No private commits, settings changes, or merges authorized.
- New isolated public branch: `feature/phase1-field-manager-demo-2026-10-31`, based on public verified `eb9f3a2512894838f38c41d2b926abe6b099cec5`.
- Preserve `feature/qw1b-quick-zone-demo-2026-10-27` and public main unchanged.
- No real journal database, backup, or installer touched.

## Read-only comparison
- Private feature vs private integration base: 240 commits ahead, 22 net changed paths. This is not a license to publish its history.
- Several Rust custom field and migration 009 files were byte-identical to the successful public branch, so were not copied again.
- Public has distinct Quick Workflow changes; do not overwrite `App.tsx` or `repository.rs` blindly.
- Limited pattern scans of reviewed transferred text found no obvious credential tokens. This is NOT a complete security audit.

## Verified public branch writes
- `app/scripts/verify-demo-config.mjs` updated; DEMO identity/data-path source guard.
- `app/src/fieldManagerSafety.test.ts` added.
- `app/src/fieldInventory.ts`, `app/src/fieldDefinitions.ts`, `app/src/fieldInventory.test.ts` updated.
- Each file was independently fetched from the public branch after writes and its source blob SHA verified.

## Blockers / next action
- Public workflow creation attempt was blocked by tooling; no workflow file was created in that attempt.
- The selected frontend definitions/tests are not yet CI-tested against Public Quick Workflow; fix compatibility if necessary before claiming completion.
- `App.tsx` and `repository.rs` require selective reconciliation, not blind replacement.
- Perform complete security and dependency review before further publication; no private history or sensitive material may be published.
- CI, Windows installer, native profile isolation, and user acceptance remain UNKNOWN / UNTESTED.

## Addendum — regression protection, 2026-10-31
- Rechecked private source against SHA `2d4b08476b17ba94762937314523a8d113ca2862`: identical; read-only.
- Rechecked public recovery branch against validated `eb9f3a2512894838f38c41d2b926abe6b099cec5`: ahead only, no rewind.
- `app/src-tauri/src/repository.rs` was **selectively** extended with `review_pending_validation_tests` (3 tests) from the private source, preserving public `evidence_atomic_batch_tests` (2 tests). Commit `90c564ae31edfc3e63d61f088997687c1c7e64d1`; remote source read-back confirms both test modules coexist.
- Existing public `.github/workflows/ptj-manual-checks.yml` remains unchanged: manual dispatch only; frontend npm ci/test/build/DEMO config and Windows Rust cargo check plus evidence atomicity. It does **not** automatically execute on push, and does not yet explicitly run Review Pending tests. No CI success claimed for this new branch.
- No installer built, no database changed, no private write, no merge, and no reset.
- Remaining: verify Field Manager/Quick UI interaction, run exact-SHA CI, test Review Pending and data isolation on Windows, then build DEMO only after gates pass.

## CI evidence — manual runs #23 and #24 (2026-10-31)
- Run #23 `41188699608`: frontend 96/98 tests passed, 2 failed in `fieldInventory.test.ts`; Rust was in progress at inspection. No full gate pass.
- Run #24 `41188881395`: Rust job SUCCESS, frontend 95/98 passed, 3 failed in `fieldInventory.test.ts`; npm test failure skipped frontend build and DEMO config step. This is a code/test contract mismatch, not a GitHub Billing denial.
- Follow-up assertion-only correction commit `83e66473740df2abe3b6d05826b25de842baca9a`: preserves `candidate.sources` required-in-Quick semantics, unmapped session reflections not formally user-required, and `evidence.direction` VISIBILITY_ONLY audit status. Needs independent fresh CI run; no success claimed.
- User must dispatch `ptj-manual-checks.yml` on the exact recovery branch again; do not build installer until frontend and Rust gates pass and DEMO path isolation is verified.

## DEMO build gate (2026-10-31)
- User screenshot of manual checks #25 `41189336644` shows frontend SUCCESS and Rust SUCCESS; direct GitHub API job read returned 404, so this is screenshot-confirmed, not independent log verification.
- `tauri.demo.conf.json` uses `com.personaltradingjournal.desktop.demo` vs canonical `com.personaltradingjournal.desktop`; `paths.rs` resolves app-local-data directory then `data/journal.db`. Source-only check, not installed Windows proof.
- Existing Public DEMO workflow preserved, but restricted installer artifact upload to `*DEMO*.exe` and added a fail-closed filename check plus SHA256 logging. Commit `40381d00b9b12635aff4e42da187aafb42f879cb`.
- DEMO build is not yet run. Installer is UNTESTED; do not install against canonical live user data. Verify installed DEMO path isolation before acceptance.

## Verified GitHub Actions Windows DEMO build — 2026-10-31
- GitHub Actions run `41190007062` (`PTJ isolated DEMO installer (manual only)`, #18) independently fetched: `completed/success` on branch `feature/phase1-field-manager-demo-2026-10-31`, exact build SHA `3f1d52e56c96556a3b4eff687bdcc750e7275261`.
- Independently fetched job details: `npm ci`, `npm test`, `verify-demo-config.mjs`, isolated DEMO NSIS build, filename fail-closed check, and artifact upload all SUCCESS.
- Independently fetched artifact: ID `13038208171`, name `PTJ-ISOLATED-DEMO-UNTESTED`, compressed size 3,341,338 bytes, not expired at inspection. The artifact name is deliberate: `WINDOWS BUILD PASS` but `INSTALLED WINDOWS DEMO UNTESTED`.
- Installer actual filename, binary hash and installed profile separation were not independently verified here. Do not treat public CI as product acceptance. Before installing, safeguard actual production data and verify native DEMO isolation.
- No merge to main; private read-only; prior public stable branch preserved.
