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
