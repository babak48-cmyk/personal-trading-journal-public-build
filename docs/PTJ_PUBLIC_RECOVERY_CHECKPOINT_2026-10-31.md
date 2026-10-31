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
