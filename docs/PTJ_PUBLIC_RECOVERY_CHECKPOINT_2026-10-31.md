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


## Installed Windows DEMO acceptance ledger — 2026-11-01 (user-reported, not independent DB verification)
Scope: installed isolated DEMO from Actions run `41190007062`, build-source SHA `3f1d52e56c96556a3b4eff687bdcc750e7275261`, artifact `13038208171`; current branch HEAD and installed binary must not be equated. No private data modified and no merge or build authorized by this checkpoint.

- D01–D04: PASS by user report for installation/profile separation/persistence safeguards; detailed original evidence remains in conversation/handoff and should not be expanded beyond its scope.
- F01: UNKNOWN; do not mark PASS or repeat without checking previous evidence and a defined criterion.
- F02: PASS — field labels/help observed.
- F03: PASS — `plan.mainScenario` Optional→Required protection against hiding/Detailed-only, persistence, then restored Optional.
- F04: PASS — protected/conditional field controls including decision reason and candidate price protections.
- F05: PARTIAL / NOT ACCEPTED. F05-A (NO_TRADE/MISSED reason) visible required validation PASS. F05-B/C/D/E (SINGLE/RANGE blank required price) blocked invalid save but did not show appropriate inline error/focus, UX FAIL. F05-F/G valid Range save PASS, both bounds present; do NOT claim DB corruption. Separately, save-success confirmation insufficient. Open Public issues [#3](https://github.com/babak48-cmyk/personal-trading-journal-public-build/issues/3) `F05-RANGE-VALIDATION-UX-01` and [#4](https://github.com/babak48-cmyk/personal-trading-journal-public-build/issues/4) `F05-SAVE-FEEDBACK-UX-02`.
- F06: PASS / CLOSED (user-reported Windows): `plan.alternativeScenario` Optional/Visible, draft session `2026-10-27 ES DEMO` short ID `1844ad`; `F06 test` was saved, observed after reload, Visible→Hidden→Visible and original text retained. No claim of independent SQLite inspection.
- F07: PASS / CLOSED (user-reported Windows): same optional field moved `Quick + Detailed`→`Detailed only`; absent in Quick, appeared in Detailed with `F06 test` intact; restored `Quick + Detailed`.
- F08: PASS / CLOSED (user-reported Windows): Zone condition order changed to `Abandon conditions` before `Entry conditions`; remained after reopening Settings; reflected in actual Zone form; original `Entry conditions`→`Abandon conditions` order restored.
- Additional Windows UX defect: launching installed DEMO opens extra black console window, usually behind GUI; **closing console alone also closes main app**. Open Public [#5](https://github.com/babak48-cmyk/personal-trading-journal-public-build/issues/5) `WINDOWS-DEMO-CONSOLE-01`. Public `app/src-tauri/src/main.rs` lacks conditional `windows_subsystem = "windows"` attribute, likely but unverified root cause. Do not advise closing console separately while using DEMO.
- User acceptance of full Field Manager, Quick Workflow and entire roadmap: NOT GRANTED. Partial scenario passes are not product-wide acceptance.

### Testing boundary and subsequent planning
- **F09 is not a verified final test**. Existing F01–F08 labels are conversation-level acceptance probes, NOT an approved exhaustive sequence or denominator. No complete remaining-test count verified; do not invent F09–Fn or continue indiscriminate manual testing.
- Freeze ad hoc F-series expansion until reconcile untested functionality and accepted requirements against `MR-1.12`, Master Roadmap and Quick Workflow handoff, and then propose a *bounded, smallest useful* remaining acceptance set for user approval.
- Fix existing reproducible issues #3, #4, #5 in an isolated Public code batch **only after user authorization**, then CI/build and focused installed Windows retest. Preserve private read-only, installed DEMO data and working beta.
- Maintain statuses rigorously: PASS = narrow user-reported scenario; F05 PARTIAL; F01 UNKNOWN; broader Field Manager/custom fields/Quick Workflow remain PARTIAL/UNKNOWN until individually verified and accepted.
- Only small text checkpoints/issue records in GitHub; no installers, large artifacts, databases, backups or screenshots. This addendum is evidence bookkeeping, **not code progress**, and must be independently read back.


## Public-only defect-fix branch progress — 2026-11-01
- User authorized continuation of defect correction and approved future development subject to established roadmap and Public-only boundary. No private writes, original data changes, merges or installer execution authorized/performed.
- Created isolated branch `fix/windows-demo-f05-feedback-console-2026-11-01` from checkpoint commit `b41712357c17bdfc2ad221eb4de77f7ca02054b9`.
- Implemented small conditional Windows release-subsystem correction in `app/src-tauri/src/main.rs`: `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`. Commit `cfb29c3be5662c9c61b2a47a722f07936ff9e2b3`; remote file blob independently read back and confirmed.
- **State: IMPLEMENTED (source only), NOT CI-TESTED, NOT WINDOWS-TESTED, NOT ACCEPTED.** Issue #5 remains open until actual Windows installed DEMO launch and close behavior verified, including data isolation.
- Inspected `app/src/App.tsx` in Public: `confirm()` validates missing SINGLE/RANGE prices and uses `blockMissing()`, while `saveAndAdvanceDraft()` is separate and reports a generic draft-saved message. Exact reason why inline errors were not visible in F05 Windows must be reproduced with version-specific test before safe code change. Issues #3 and #4 remain OPEN/NOT FIXED; no false claims of correction.
- Next: scoped source-level correction for #3/#4 with targeted tests, CI on exact fix commit, then new isolated DEMO installer and minimal Windows retest only after CI. Future feature work must be drawn from approved roadmap with explicit requirement status; do not extend ad-hoc F-series. No PR/merge yet.


## Public WIP F05 source patch — 2026-11-02
- Current isolated Public branch `fix/windows-demo-f05-feedback-console-2026-11-01`. No Private writes, database operations, merges, or installer builds.
- `app/src/App.tsx` commit `5a53d6d7eab90513e01628cd4dc140aaf96cb538` independently read back: in-place `draftSaveFeedback` status after `saveInitialPlanDraft` success/failure; inline role=alert error text for missing candidate SINGLE price / RANGE From / RANGE To; Zone validation summary in draft Zone step.
- Crucial semantic boundary: `saveAndAdvanceDraft` is intentionally allowed to persist incomplete draft data. `confirm()` remains the gate for validation of required fields and immutable plan confirmation; patch does NOT weaken this separation.
- Earlier conditional Windows GUI-subsystem fix remains committed. Issue #3/#4/#5 status **IMPLEMENTED SOURCE CHANGE / CI-UNTESTED / WINDOWS-UNTESTED / NOT ACCEPTED**. Inline error behavior, accessibility/focus and save feedback must be regression-tested in installed Windows build.
- Draft PR [#6](https://github.com/babak48-cmyk/personal-trading-journal-public-build/pull/6) opened from isolated fix branch targeting `feature/phase1-field-manager-demo-2026-10-31`. Draft, **DO NOT MERGE** without user approval.
- CI not run: repository's manual workflow `ptj-manual-checks.yml` requires exact branch dispatch and separate gate verification; no runtime pass claimed. Next: run frontend/Rust CI, review any failures, produce new isolated installer only after green gates and safeguard evidence, then focused user Windows retest. Future roadmap scope remains unimplemented; do not assume beta defect resolution completes roadmap.


## CI acceptance gate — 2026-11-02 (exact source checkout)
- GitHub Actions `PTJ manual checks #27`, run [41386898654](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/41386898654), manually dispatched for Public branch `fix/windows-demo-f05-feedback-console-2026-11-01`, exact checkout SHA `e49d787963720ecf3bb7b5f7be96bbe6596740c1`.
- GitHub browser read and independent GitHub workflow jobs fetch: `frontend` completed/success, `rust` completed/success, overall run SUCCESS. This verifies the workflow jobs, not a Windows installed-app test.
- Source fixes for issues #3/#4/#5 have CI gate PASS on this SHA; all remain WINDOWS-UNTESTED / NOT ACCEPTED / OPEN.
- The next branch commit is documentation-only and is **not** the CI-tested SHA; preserve exact provenance when building or dispatching installer.
- Isolated DEMO installer workflow is `.github/workflows/ptj-isolated-demo-installer.yml`, manual-only. Before downloading/installing verify exact workflow source SHA, DEMO identity, artifact and data-path safeguards. Do not merge to Private or Public main.


## Isolated DEMO installer build gate — 2026-11-02
- GitHub Actions `PTJ isolated DEMO installer (manual only)`, run [41394601616](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/41394601616), user dispatched on Public-only fix branch `fix/windows-demo-f05-feedback-console-2026-11-01`, exact source commit `22b6aacdc7c7a12bd2c4786cb6956f2b02fbf854`; GitHub page shows overall SUCCESS.
- GitHub workflow job independently fetched: `demo-installer` completed SUCCESS, job ID `125113111204`. Artifact independently fetched: ID `13118718069`, name `PTJ-ISOLATED-DEMO-UNTESTED`, ZIP size `3340278` bytes, not expired at inspection.
- Scope: public-build only. Workflow source mandates `npm ci`, `npm test`, DEMO config verification, Tauri NSIS build with `src-tauri/tauri.demo.conf.json`, fail-closed `*DEMO*.exe` filename check, and artifact upload. CI success is not independently inspecting binary hash, exact inner installer filename, installation path, or installed database separation.
- Installed Windows result still UNKNOWN; issues #3, #4, #5 remain OPEN / NOT WINDOWS-TESTED / NOT ACCEPTED. User should preserve prior installed DEMO state and confirm data safety before installing; verify after new installation that independent DEMO profile is preserved, no black console appears, and the two F05 UI feedback issues are fixed. Do NOT overwrite production data or merge to Private/main.
