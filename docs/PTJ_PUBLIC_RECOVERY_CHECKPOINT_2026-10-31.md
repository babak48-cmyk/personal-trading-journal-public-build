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


## Installed Windows targeted regression completion — 2026-11-02
- User installed new isolated DEMO from run `41394601616`, build SHA `22b6aacdc7c7a12bd2c4786cb6956f2b02fbf854` and confirmed no extraneous black console; Issue #5 targeted Windows PASS.
- F05-R1: RANGE From missing — plan confirmation prevented; red border and explicit inline field message observed in screenshot. PASS.
- F05-R2: RANGE To missing — user reports red inline message and blocked confirmation. PASS.
- F05-R3: SINGLE Price missing — user reports red inline message and blocked confirmation. PASS.
- F05-R4: valid draft Zone save — user reports visible `Draft saved successfully` message. PASS.
- Evidence recorded on Public issues #3, #4, #5 and verified by remote readback. Results are USER-REPORTED WINDOWS PASS for these bounded scenarios; no independent DB verification, no full product/roadmap acceptance, no private integration or merge.
- PR #6 remains DRAFT / UNMERGED. Next: review scope/status and outstanding requirement traceability before any new feature batch or merge, preserving original data. Avoid unnecessary repeated manual tests.


## Roadmap deduplication gate — 2026-11-02
- Reviewed approved `PTJ_MASTER_PRODUCT_ROADMAP_2026-10-10.md` and supplementary `PTJ_QUICK_WORKFLOW_COMPLETE_ROADMAP_AND_HANDOFF_v1.1_2026-10-26.md` from Project Sources against Public branch set and open PRs. This is targeted mapping, **not exhaustive requirements traceability**.
- Current Public branches seen: `main`, `feature/phase1-field-manager-demo-2026-10-31`, `feature/qw1a-hotkey-demo-2026-10-26`, `feature/qw1b-quick-zone-demo-2026-10-27`, `fix/windows-demo-f05-feedback-console-2026-11-01`. Open PRs #1 QW-1A, #2 QW-1B, #6 F05/Windows fixes; none merged.
- Independently fetched `app/src-tauri/src/lib.rs` on QW-1A, QW-1B and current fix branch. All three contain native global-shortcut setup and `Ctrl+Alt+J` registration. Thus **QW-1A is ALREADY CODED on Public branches**, not an uncoded task to implement again. Its *real Windows hotkey interaction/shortcut conflict* acceptance is NOT substantiated here; do not repeat known source work.
- QW-1B already has Public feature branch and PR #2, and the current fix branch inherits some Quick Zone implementation. Require exact current feature-by-feature diff before any Quick Capture development; do not blindly cherry-pick or overwrite `App.tsx`.
- Prior F02/F03/F04/F06/F07/F08 user-reported PASS and F05-R1–R4 targeted Windows PASS remain closed for their tested scenarios; do not re-run without changed affected behavior. Public issues #3/#4/#5 contain test evidence. PR #6 remains Draft, not authorized for merge.
- Next small possible approved-roadmap work: **gap review for QW-1B Quick decision capture** within existing SESSION→PLAN→ZONE→EVIDENCE→DECISION lifecycle, distinguishing new user decision from existing saved zone/plan and never generating execution fills. **No new Quick UX design or coding is authorized by this mapping alone**; first verify existing code/requirements and outstanding detailed approvals, then propose one bounded nonduplicative increment.
- Other approved unfinished work (full All-Inputs Field Manager, Audited Data Correction, process vs P&L analytics, missed opportunities and weekly review) remains PARTIAL/OPEN. Proposed QW-2/4 enhancements require independent approval; do not silently promote to approved.

  
## Approved 12-feature Roadmap completion governance — 2026-11-02
- User approved **additive** prioritization/traceability, not a roadmap replacement or permission to close features prematurely. Optimize for completion of safely independent, small remaining requirements while retaining all original approved scope and dependencies. Correctness, adequate tests, explicit user acceptance dominate feature-count reduction.
- Preserve all twelve existing Feature Roadmap groups and their status; no Feature moved to COMPLETE or removed. Detailed complete counts are **UNKNOWN** pending full reconciliation across MR-1.0..1.19, amendments, Main Roadmap, Quick Workflow handoff, canonical code/evidence, and user approvals. Never use the count of overview bullet items as total requirements.
- For each feature, a future traceability ledger must enumerate every approved requirement ID and last explicit scope, status (PROPOSED / APPROVED / DEFERRED / IMPLEMENTED / CI-TESTED / WINDOWS-TESTED / ACCEPTED / BLOCKED / UNKNOWN), concrete artifact/branch/full SHA, tests and Windows evidence, unresolved gaps, affected stage and dependencies, size estimate with rationale, independent completion eligibility, and user acceptance. Historical approved requirements cannot disappear when a feature is marked closed.
- Prioritize candidate **small independent gaps** only after checking upstream/downstream semantics, migrations, data preservation and long-term architecture. Do not make a small feature appear complete by hiding/folding work into another feature, removing prerequisites, or reclassifying APPROVED as PROPOSED.
- UI additive change on Public fix branch: `app/src/App.tsx` commit `5b6b99e74fbd7dc4f88ebeac189261141a682e16` explicitly labels each count as `Listed open topics` rather than certified total requirement count, and shows `Verified full requirement count: pending reconciliation` with completion criteria. Existing 12 statuses/contents preserved; this is **source-implemented only / CI-UNTESTED / WINDOWS-UNTESTED / NOT ACCEPTED**.
- Prior active technical delivery direction (Quick Workflow / Quick Decision Capture gap check) stays in force. This governance addition does not re-prioritize implementation stages and does not authorize merge or private change.


## QW Decision gap / required-in-Quick rule — 2026-11-02
- Reviewed current Public `app/src/App.tsx`: Quick Decision already saves independent TRADE / NO_TRADE / MISSED via `localApi.createCandidateDecision`, timestamps and history, follows TRADE with separate execution, prevents duplicates on refresh errors, and shows prior Zone decisions. Do **not** reimplement the existing decision capture. Windows end-to-end acceptance of all cases still UNKNOWN.
- Verified real gap: `saveDecision()` enforces USER_REQUIRED `decision.quality` in both modes, but the selection control was rendered only under `!quickMode`. Required input could thus be impossible to satisfy from Quick without switching modes; violates approved Quick required-field visibility.
- Minimal source fix commit `7159cdc80ccdf95445c96e32a6735192d1f35aa4`: render `Decision quality` block in Quick when required, preserving optional field's Detailed-only default, original validation, timestamped decision persistence and backend semantics. Remote file read-back verified.
- Status: **IMPLEMENTED SOURCE ONLY / NOT CI-TESTED / NOT WINDOWS-TESTED / NOT ACCEPTED**. No merge, Private write, installer build or production DB edit.
- Next: execute precise Public branch CI; then targeted Windows acceptance of USER_REQUIRED `decision.quality` in Quick (visible, missing blocks save, filled allows exactly one decision, restore settings), plus avoid redundant previously verified F-series tests.


## Installer / CI batching policy — 2026-11-02 (user approved)
- User explicitly requests balance: avoid generating a Windows DEMO installer for every small task, avoid collecting too many unverified changes and losing acceptance traceability, and minimize GitHub storage.
- Small coherent implementation slices commit to Public isolated branch with lightweight checkpoints; run automated frontend/Rust CI as appropriate **before** installer. One installer per bounded group of related changes needing native Windows observation, with a test matrix listing each change and its own PASS/FAIL/UNKNOWN. Do not merge or mark accepted solely from one installer.
- Immediate batch candidate: required-in-Quick Decision quality UI plus any *verified, low-risk closely related* Decision capture fixes, not unrelated roadmap areas. The previous F05/console regressions have already passed user Windows testing and must not be needlessly repeated.
- GitHub repository should retain source and small text checkpoints; avoid committing installer binaries, screenshots, full logs, local database copies, or artifacts. Inspect existing artifacts/retention before repeated builds; do not delete artifacts without user permission.
- Tooling limitation for this session: available GitHub connector can read workflow run results, but no dispatch/start-workflow action was found. No new CI execution or installer was performed. Request one manual GitHub Actions dispatch only when batch is ready.

  
## Quick Decision batch refinement — 2026-11-02
- Source inspected to avoid duplicate feature work. Existing TRADE/NO_TRADE/MISSED saving, history and separate execution are retained.
- Adjacent Quick UX regression detected after required quality was exposed: grouping the optional `decision.note` field with the required quality control could leak Detailed-only note into Quick for some preferences. Commit `1a47789100c925a9ea42d35c9f8db50b5d0225d0` separates the rendering gates: required `decision.quality` may appear in Quick; `decision.note` stays Detailed-only for this existing UI. Remote source readback verified.
- Scope is exactly the two closely related Quick Decision UI adjustments. No other features or prior tests changed. **Source-only, CI UNKNOWN, Windows UNKNOWN, user acceptance pending**. Build one DEMO only after CI and batch review, never one installer per tweak.


## Quick Decision batch CI gate — 2026-11-02
- User screenshot of GitHub Actions `PTJ manual checks #28` run `41434149361` shows workflow success, branch `fix/windows-demo-f05-feedback-console-2026-11-01`, displayed short SHA `068e815`, and both `frontend` and `rust` green. Connector independently read back jobs: `frontend=success`, `rust=success`.
- Latest checkpoint commit at time of dispatch: `068e8156fe8d10cbd287f88109071a26e6ae24d4`; screenshot shows matching short SHA; source UI batch changes `7159cdc80ccdf95445c96e32a6735192d1f35aa4` and `1a47789100c925a9ea42d35c9f8db50b5d0225d0` precede it.
- **CI-TESTED PASS for that commit, WINDOWS-UNTESTED / NOT ACCEPTED for Quick Decision quality rendering.** One bounded Windows DEMO build is next, once, with no repository binary commit; preserve prior isolated DEMO and user data.


## Quick Decision installed DEMO acceptance QD-1 — 2026-11-02
- User reports the `Decision quality` field is visible in Quick after configuring it Required and opening a NO TRADE decision for an existing Zone in isolated Windows DEMO. **QD-1 USER-REPORTED WINDOWS PASS** for visibility only.
- Pending QD-2: with NO TRADE reason selected and decision quality blank, Save must be blocked with clear feedback. Pending QD-3: valid quality saves decision exactly once, and original optional/Detailed-only behavior after restoring settings. Do not claim these passes before observed.
- No merge or Private update authorized.


## Quick Decision installed DEMO acceptance QD-2 — 2026-11-02
- User reports in Windows isolated DEMO: NO TRADE reason selected, USER_REQUIRED `Decision quality` empty, Save decision prevented persistence and displayed clear required-field error. **QD-2 USER-REPORTED WINDOWS PASS** for missing required quality validation.
- QD-1 visible in Quick also PASS. Pending QD-3 valid save exactly once; optional/Detail behavior restore separately. No repeated F-series tests; no merge/Private modification.


## Quick Decision installed DEMO acceptance QD-3 — 2026-11-02
- User confirmed selecting a valid `Decision quality` and pressing Save decision once in the installed isolated DEMO saved the NO TRADE decision and generated exactly one new decision-history record in the tested Zone.
- **QD-3 USER-REPORTED WINDOWS PASS** for successful single-record save. Together QD-1 visibility and QD-2 required-field blocking PASS. This is bounded UI/history evidence; no independent SQLite verification.
- Pending optional/Detailed-only presentation after reverting Required setting. No repeated tests or installer. Do not mark all Quick Decision or Feature 5 ACCEPTED without explicit scope-level approval; no merge or Private modification.


## Quick Decision installed Windows QD-4 and bounded acceptance — 2026-11-02
- User confirmed that after changing `Decision quality` back to Optional in Field Manager and saving, both `Decision quality` and `Decision note` were hidden in Quick decision form as intended. **QD-4 USER-REPORTED WINDOWS PASS**.
- QD-1 / QD-2 / QD-3 / QD-4 all PASS for the specifically tested Quick Decision UI regression; CI run `41434149361` frontend/rust PASS. These changes are **WINDOWS-TESTED for bounded scenarios**, not independent SQLite audit or overall Feature 5 ACCEPTED.
- Do not regenerate installer or repeat this batch. Preserve roadmap remaining requirements, no merged PR, no Private writes. Continue approved requirements gap analysis before next isolated batch.


## Feature 5 Decision type/reason integrity: isolated gap — 2026-11-02
- Following QD-1..QD-4 Windows PASS, inspected current Public `App.tsx` and found a distinct small data-quality gap: Quick Decision type buttons changed `decisionType` but kept `decisionReason`. A selected NO_TRADE reason (e.g. MISSING_CONFIRMATION) could therefore persist after switching to MISSED and be saved as if a missed-opportunity reason; inverse also possible. This is a semantic issue, not a redo of QD tests.
- Minimal source correction `ab26a90414ce9b2a6dc98cd89a5dc7cf0192b6f8`: on an **actual change** among TRADE / NO_TRADE / MISSED, clear only prior `decisionReason` and obsolete `decision.reason` validation; retain current reason if user re-clicks same type. Do not alter timestamps, persisted existing decisions, optional notes, quality, backend or execution.
- Remote GitHub file read-back verified. Status **SOURCE IMPLEMENTED / CI NOT YET RUN / WINDOWS NOT YET TESTED / USER NOT YET ACCEPTED**. Avoid standalone installer; batch with the next coherent low-risk Decision integrity slice after pre-install CI. Exact broader Feature 5 requirements coverage still PARTIAL/UNKNOWN; no feature closure.
- No merge or Private change. No repeat of F-series or QD-1..QD-4.


## Decision semantic-integrity bundle #2 — 2026-11-02
- Public branch still `fix/windows-demo-f05-feedback-console-2026-11-01`; QD-1..QD-4 previously Windows-tested PASS are not repeated.
- Change A: `ab26a90414ce9b2a6dc98cd89a5dc7cf0192b6f8` clears stale decision reason on actual TRADE/NO_TRADE/MISSED type change, preserving same-type selection.
- Change B: `e40a616e11a82a597f5b3d3544900b0ef360bf3f` fixes `saveDecision()` payload to persist `plan_mismatch_reason` only when a TRADE actually opposes the candidate's planned LONG/SHORT intent, otherwise `null`. Previously state from an earlier opposite-direction trade could contaminate a same-direction TRADE or NO_TRADE/MISSED. Existing opposite-direction validation remains intact. No historical records rewritten.
- Both corrections independently fetched after commit; **SOURCE IMPLEMENTED only; CI / native Windows tests / USER acceptance PENDING**. Proposed next grouped test matrix: (1) NO_TRADE selected reason → change to MISSED → old reason absent, new reason required; (2) opposite-direction TRADE mismatch reason required and saved; (3) reverting to aligned TRADE or non-TRADE must not persist mismatch reason. Test only what can be observed in UI and flag backend-only assertions UNKNOWN pending independent evidence.
- No installer generated for either small fix; wait for coherent batch CI then one isolated DEMO. No merge or Private repository change.


## Decision-integrity batch expanded before installer — 2026-11-02
- User explicitly prefers completing more bounded, related work before generating another DEMO. Installer remains deferred; no new CI run or DEMO has been claimed.
- Source review found another adjacent integrity problem: if an opposite-direction TRADE mismatch reason was chosen, changing trade direction and then returning to opposite direction could reuse the earlier reason without a fresh choice. Source fix commit `70fae4dbdfbf6243370a970138e0d79abed64f01` clears only `mismatchReason` on actual direction dropdown changes and on decision-type changes; existing saved records unaffected. Remote read-back verified.
- Grouped current **untested** Decision-integrity code changes: A `ab26a90414ce9b2a6dc98cd89a5dc7cf0192b6f8` stale NO_TRADE/MISSED reason reset; B `e40a616e11a82a597f5b3d3544900b0ef360bf3f` persist mismatch reason only for genuinely opposite-direction TRADE; C `70fae4dbdfbf6243370a970138e0d79abed64f01` clear mismatch reason on direction/type changes.
- Status SOURCE-IMPLEMENTED / CI-UNTESTED / WINDOWS-UNTESTED / NOT ACCEPTED for A-C. Before next DEMO, assess whether any further closely related independent defects warrant same batch; avoid uncontrolled expansion. Then one CI and one isolated installer for batch, with separate test assertions. No merge or Private changes. Preserve completed F-series/QD-series evidence.


## Decision integrity / Required note in Quick — 2026-11-03
- Continued bounded Feature 5 review without creating a Windows installer. On Public branch, `decision.note` was always restricted to Detailed view (`!quickMode`), and `saveDecision()` did not enforce its USER_REQUIRED setting. This violates effective required-field visibility and enforcement in Quick.
- Source change `80d4c938deecb18614b80b3d92504cfee38026c1`: show `Decision note` when its Field Manager presentation predicate permits (including effective required status), add `data-validation-id` and error class, enforce nonblank USER_REQUIRED note before saving, and clear its validation feedback on edit. Preserve earlier QD-4 Optional hidden behavior as defined by placement configuration. No historical persistence rewrite.
- This is a **fourth distinct related correction** in the pending Decision-integrity batch, alongside reason resets, mismatch payload gating, and mismatch reset on direction/type changes. The prior QD-1..QD-4 PASS observations are not superseded, but this change needs a new targeted test for Required note (visible, blank blocks, populated allows save, restore optional).
- **STATUS: SOURCE IMPLEMENTED / CI UNTESTED / WINDOWS UNTESTED / USER ACCEPTANCE PENDING.** Avoid claiming complete Field Manager coverage or Feature 5 closure. Before installer verify build + test once for the grouped batch and keep exact batch SHA, then one isolated DEMO. Do not merge or write Private.


## Feature 5 integrity batch CI gate — 2026-11-03
- GitHub Actions manual checks run `41623199355` on Public fix branch at source/checkpoint SHA `30c37d936fa2d6bdcfa1b91c2c39713c61ff36f1` independently checked through GitHub jobs endpoint: `frontend` **completed/success**, `rust` **completed/success**. No failed jobs.
- Four distinct Decision integrity source fixes in batch: stale decision reason reset `ab26a90414ce9b2a6dc98cd89a5dc7cf0192b6f8`; mismatch reason only for actual opposite-direction trade `e40a616e11a82a597f5b3d3544900b0ef360bf3f`; reset mismatch state on direction/type change `70fae4dbdfbf6243370a970138e0d79abed64f01`; respect USER_REQUIRED decision note in Quick `80d4c938deecb18614b80b3d92504cfee38026c1`.
- Status **CI-TESTED PASS**, Windows targeted tests **PENDING**, user acceptance **PENDING**. Build only one isolated DEMO and verify exact source SHA for installer; keep binaries in GitHub Actions temporary artifacts rather than repository. Do not claim general Feature 5 completion or skip historic data safety.


## Feature 5 batch-2 Windows DEMO build — 2026-11-04
- User manually dispatched isolated installer workflow run `41822017055`, source branch fix/windows-demo-f05-feedback-console-2026-11-01, SHA prefix `6b55c79` (checkpoint HEAD `6b55c79224e4009ce0e9a7328f9e707b4e13e39c`). Independently fetched job and artifacts through GitHub connector: `demo-installer` **completed/success**. One artifact `PTJ-ISOLATED-DEMO-UNTESTED`, ID `13317732706`, ZIP size `3,344,568 bytes`, unexpired.
- Four previously enumerated integrity changes are included upstream of source SHA; workflow success is **BUILD PASS, not WINDOWS TEST PASS**. No independent assertion about installed EXE or live data safety. Pending user installation and limited targeted tests. Do not re-run installer workflow unless identified defect or missing artifact; no merge/Private change.


## DI-1 installed Windows result — 2026-11-04
- User confirmed in newly installed isolated DEMO: selected NO TRADE reason `MISSING_CONFIRMATION`, switched to MISSED without saving, and prior reason was cleared with no new reason auto-selected. **DI-1 USER-REPORTED WINDOWS PASS** for UI reset only.
- Outstanding distinct checks: mismatch-reason required when actual opposite-direction TRADE; state reset after direction/type changes; persisted mismatch payload when applicable; USER_REQUIRED decision.note in Quick. No repeats of QD-1..QD-4 or DI-1. No merge/Private changes.


## DI-2 installed Windows result — 2026-11-05
- User reports in isolated DEMO that after selecting a mismatch reason for an opposite-direction TRADE, switching direction back to planned then opposite again resets mismatch reason to `Select`. **DI-2 USER-REPORTED WINDOWS PASS** for visible stale mismatch-state reset.
- Do not infer payload persistence from this UI observation. Next DI-3: attempt opposite-direction TRADE decision without mismatch reason; must block save with clear message. User acceptance of other bundle behaviors pending; no merge or Private changes.


## DI-3 Windows unexpected outcome — 2026-11-05 (OPEN / NOT PASS)
- User screenshot from installed isolated DEMO after pressing Save decision: shows notebook page Trade, Quick trade entry (entry/stop/qty), and header `Trade decision saved. Record only entry, stop and quantity now.`; no error blocking save visible. Current overall Plan header reads `NEUTRAL · Rev 4`. Screenshot reports `0 actual trade(s)`; evidence supports *decision saved*, not execution fill or open trade.
- Expected DI-3 opposite-direction TRADE with missing mismatch reason must be blocked. **DI-3 NOT PASS; TEST VALIDITY/DEFECT CAUSE UNKNOWN** until identify selected Zone's `directional_intent` and saved direction. Current source guard checks `decisionCandidate.directional_intent` equals LONG/SHORT and `decisionDirection !== that intent`; overall plan `initial_bias=NEUTRAL` does not alone establish a mismatch. Zone may have CONDITIONAL/WATCH/UNKNOWN intent or trade direction could have been aligned, in which case mismatch validation intentionally would not trigger. Avoid inventing defect/root cause or treating screenshot as proven bypass of a matching guard.
- Do not click `Open trade` or create further decisions while diagnosing; preserve prior decision as test data (no deletion). Need one focused check of selected Zone and displayed `Planned intent` from Decision panel, then targeted regression only if actual opposite case. Do not repeat DI-1/DI-2 or produce another installer yet.


## DI-3 clarified / inline opposite-Zone reason feedback fix — 2026-11-05
- User clarified first DI-3 attempt had `New evidence` selected; therefore transition to Quick Trade page was **expected successful save**, not a safety bypass. The later test had `Planned intent LONG`, `Direction SHORT`, mismatch `Select` and Save resulted in **no page transition and no visible warning in viewport**. User screenshot confirms actual opposite-Zone condition. **DI-3 blocking behavior observed; INLINE FEEDBACK FAIL**. Earlier characterization of possible validation bypass superseded by user's clarification; do not erase negative history.
- Code root cause verified: `saveDecision()` set only global `setMessage()` then returned when opposite and no reason; it did not use `blockMissing()` or inline `validationErrors` used elsewhere. With header offscreen, no visible feedback.
- Targeted source correction `631bb1c7f440f5d1d991a9bafd17f26199ea161e`: mismatch reason now appends `decision.mismatchReason` to standard blocking validation, auto-scrolls/focuses select, displays inline alert and error field styling, and clears validation upon choosing reason or changing type/direction. **SOURCE IMPLEMENTED ONLY; CI/WINDOWS UNTESTED; USER ACCEPTANCE PENDING.** No additional decision records created by the correction and no database schema changes.
- Next: one CI on branch HEAD, then one Windows DEMO for DI-3 message regression and remaining Required Decision note tests; do not repeat DI-1/DI-2 or earlier F/QD pass checks. Do not merge or modify Private without authorization.


## Feature 5 DI-4 Field Manager correction and test — 2026-11-05
- Scope: Public isolated fix branch `fix/windows-demo-f05-feedback-console-2026-11-01`; no merge, Private repository modification, database modification, or installer generation.
- Confirmed root cause: `decision.note` appeared in the All-Inputs inventory and `App.tsx` already had Quick rendering plus a `saveDecision()` USER_REQUIRED guard, but `app/src/fieldDefinitions.ts` lacked a formal `decision.note` definition. Thus it was absent from the user-facing Required/Optional manager and `isUserRequired('decision.note',...)` always evaluated false.
- Added the missing optional, user-manageable formal definition and contextual help: commit `c5665a8b62ce27a05a07429e8eb45d146a373c27`, source blob `76722364ab7be40616250ce4308b9cb53ca99dc7`; remote read-back verified.
- Added focused invariant test in `app/src/fieldInventory.test.ts`: user-required Decision note must appear in both Quick and Detailed even if hidden / Detailed-only preferences were set; when Optional, existing Detailed-only behavior remains; `requiredPresentationIssues()` must report no violation. Commit `63a78b70c15f1fd09492dae650b4b11fbda5e619`, blob `80bec15655058b2a9493394cf640179c07ec8333`; remote read-back verified. Test file was **not executed** in this session.
- DI-1/DI-2 are previously Windows-tested PASS; DI-3 save blocking observed but clear inline feedback correction `631bb1c7f440f5d1d991a9bafd17f26199ea161e` awaits CI and Windows retest. DI-4 awaits CI and targeted Windows test. No general Feature 5 acceptance.
- Status: DI-3 feedback and DI-4 formal definition/test **SOURCE-IMPLEMENTED / CI-PENDING / WINDOWS-PENDING / NOT ACCEPTED**. Previous successful CI run `41623199355` predates these changes and must not be used as their CI evidence.
- Next: dispatch **PTJ manual checks** once on exact Public branch HEAD after this checkpoint, independently verify frontend and Rust jobs and exact run SHA; only then group DI-3/DI-4 into a single isolated DEMO installer for targeted user tests, respecting the approved installer batching and data isolation safeguards.


## CI #32 failure, bounded Decision-note mapping repair — 2026-11-05
- User dispatched `PTJ manual checks #32`, run [42004742209](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/42004742209), exact run source commit `066beaec59e89e947f30f10c441051c50b7a9adb` on Public isolated branch. GitHub jobs read-back: `frontend` **completed/failure** at `npm test`; `rust` **in progress** at last API poll, so overall Rust result UNKNOWN. No CI pass claimed.
- Actual frontend failure details from read-only logged-in GitHub run page: 2 assertions: `app/src/domain/fieldInventory.test.ts` required every formal definition to map exactly once to inventory `formalFieldId`, but `decision.note` had no mapping; `app/src/fieldInventory.test.ts` similarly expected `formalFieldId==='decision.note'` and found undefined. Both pinpoint same metadata omission in `app/src/fieldInventory.ts`; no evidence that earlier Windows-tested features regressed.
- Minimal fix commit `28a3706d8e684d5fa6f69b416f0c5f603718cc17`: map existing `decision.note` inventory entry to canonical `formalFieldId='decision.note'`. No other inventory entries, form code, database, historical records, workflow or installer changed. Independent GitHub fetch verified updated blob.
- Status: **SOURCE-FIXED; CI RETEST REQUIRED; WINDOWS TESTS DI-3 inline message and DI-4 Required note still PENDING.** Do not rerun previous Windows PASS tests. Dispatch new `PTJ manual checks` on exact branch HEAD only after this checkpoint; verify both jobs and SHA, then consider single installer for grouped DI-3/DI-4 tests. No Private merge/writes and no binaries committed.


## DI-5/DI-6 read-path audit and bounded source change — 2026-11-05
- Scope: Public isolated branch `fix/windows-demo-f05-feedback-console-2026-11-01`; source-only, no database writes, no private branch changes, no merge, no installer.
- CI baseline: run [42008272346](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/42008272346), exact SHA `64f704c091ffce790ef6137dbc2360b04503051c`: independently queried `frontend` and `rust` jobs both completed SUCCESS. This CI does **not** cover the next source change.
- Existing `App.tsx` `saveDecision()` computes `opposite` only when TRADE direction differs from planned LONG/SHORT Zone intent; submits `plan_mismatch_reason: opposite ? reason : null`. Rust `repository.rs` DTO, INSERT and `list_candidate_decisions` SELECT all include `plan_mismatch_reason`. That proves source wiring, **not independent persisted database test**.
- Distinct UI gap: `Previous decisions at this zone` listed date/type/reason or alignment but did not render persisted `plan_mismatch_reason`. Source commit `dc70e1c3259736405ead65029b38e3f734e6801c` adds a conditional read-only `Opposite-plan reason: {d.plan_mismatch_reason}` in existing decision history, no change to save semantics, database schema, previously saved records or earlier successful test cases. Independent GitHub file read-back verified.
- DI-5 now has a targeted Windows UI assertion: save opposite-direction TRADE with chosen mismatch reason, then reopen that Zone's previous decisions and verify exactly that stored reason is displayed; restart/reopen for persistence if practical. UI evidence alone does not prove every SQLite invariant.
- DI-6: verify for aligned TRADE and NO_TRADE that no opposite-plan reason appears, but distinguish omitted UI field from independent storage validation. The frontend source nulling remains verified; optional Rust/SQLite integration assertion for database truth still open and must use isolated temporary test DB only. Do not claim DI-6 persistence PASS without a meaningful test.
- Current statuses: DI-1/DI-2 user-reported installed Windows PASS; DI-3 missing-reason blocking observed and inline error fix source-only pending Windows; DI-4 formal Required-note fix SOURCE IMPLEMENTED + previous CI PASS, Windows pending; DI-5 history visibility SOURCE IMPLEMENTED, new CI/Windows pending; DI-6 source read-path reviewed, persistence test pending. No full Feature 5/Field Manager ACCEPTED claim.
- Next: tightly scoped tests for DI-5/DI-6 as feasible, one CI after source batch, then a single isolated DEMO installer with only changed-case Windows checks; no repeat of already-passed QD/F/DI-1/DI-2.


## DI-6 SQLite isolation regression coverage — 2026-11-05
- Public isolated branch `fix/windows-demo-f05-feedback-console-2026-11-01`; source-only, no real/user DB opened or modified, no build artifact, no Private changes, no PR merge.
- Inspection of `app/src-tauri/src/repository.rs` found that backend accepted `plan_mismatch_reason` from caller for aligned TRADE and NO_TRADE/MISSED (despite frontend nulling it). This left a stale-reason contamination possibility at persistence boundary.
- Targeted change commit `be0e4e5b8fff67fe9ebc9467aeab0b6db8296650`: backend normalizes `plan_mismatch_reason` to NULL for decisions other than opposing-zone TRADE (preserving the separate existing unplanned TRADE explanation case). Opposite TRADE still requires a reason. No schema/migrations/history rewrites; only new decision INSERT and its returned DTO affected. Independent GitHub fetch verified committed text.
- Added four isolated Rust unit/integration-style tests in existing `repository.rs` using `Connection::open_in_memory()` and minimal test-only schema: opposing TRADE reason is persisted and round-tripped by `list_candidate_decisions`; opposing TRADE without reason inserts zero records; aligned TRADE rejects stale reason at storage boundary; both NO_TRADE and MISSED ignore stale reason. Test results **UNKNOWN until next CI**; do not claim pass just because source committed.
- Prior CI #33 run `42008272346`, SHA `64f704c091ffce790ef6137dbc2360b04503051c`, frontend+Rust both SUCCESS, predates DI-5/DI-6.
- DI-5 read-only history UI change `dc70e1c3259736405ead65029b38e3f734e6801c` is also included before this checkpoint. Required next: one manual CI frontend/Rust on this branch HEAD, independent job read-back, then one isolated DEMO for DI-3/DI-4/DI-5/DI-6 target checks. Do not repeat prior Windows-tested DI-1/DI-2, QD, F scenarios.
- Project status remains Feature 5 PARTIAL; full All-Inputs Field Manager and Audited Data Correction OPEN, other approved Roadmap requirements retained. Code source-implemented, CI-PENDING for this latest batch, Windows-PENDING, user acceptance-PENDING.


## DI-3–DI-6 CI #34 verified — 2026-11-05
- User dispatched Public `PTJ manual checks #34`, run [42023886750](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/42023886750), branch `fix/windows-demo-f05-feedback-console-2026-11-01`, exact run source SHA `d2ac6a578156f3780a3908b014841d79ceb2e94b`.
- Independent GitHub Actions jobs read-back: `frontend` completed **success**, `rust` completed **success**. This is **CI-TESTED PASS for the exact run SHA**, including DI-5 read-only history addition and DI-6 Rust in-memory SQLite tests; not an installed-Windows acceptance claim.
- Four targeted pending Windows checks: DI-3 inline reason-missing message; DI-4 USER_REQUIRED Decision note visible/block/valid/optional; DI-5 saved opposite-plan reason visible in Zone decision history after reload; DI-6 aligned/non-trade mismatch reason absent from persisted history (UI absence alone is insufficient to prove DB-null; Rust CI tests cover isolated persistence semantics). Avoid repeating DI-1/DI-2, QD-1..4 or F-series Windows PASS cases.
- **Next: one manual isolated DEMO installer workflow** using exact branch, then independently verify build job, artifact and build source SHA. Installer is NOT built by manual-checks workflow. Confirm Windows DEMO data isolation before installing; preserve original user data. No merge, no Private change, no binary committed to repository, no roadmap requirements closed by CI.


## Installed DEMO DI-3 to DI-6 targeted results and label correction — 2026-11-06
- Build run [42028050738](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/42028050738), exact source SHA `1c632c0982666ef184bb485e3053d92b1b24fe9a`, GitHub Actions `demo-installer` completed success. Artifact `PTJ-ISOLATED-DEMO-UNTESTED`, ID `13414638518`, compressed size 3,348,309 bytes, non-expired at inspection. Workflow source uses isolated DEMO Tauri identifier `com.personaltradingjournal.desktop.demo`; installed disk paths not independently inspected. Browser initially blocked ZIP as dangerous; user subsequently reported download and installed/opened application; no independent malware verdict.
- DI-3 USER-REPORTED WINDOWS PASS: screenshot shows planned Zone LONG, selected TRADE SHORT, mismatch reason unselected; red inline required message in viewport and Decision page retained. Screenshot supports visible blocking, not independent SQLite inspection.
- DI-4 USER-REPORTED WINDOWS PASS bounded checks: Field Manager screenshot shows `Decision note` as `Required by you`; Quick form renders note and empty Save displays inline red required message without navigation. User filled `DI-4 Required note test`, clicked Save once and screenshot shows Quick trade-entry page (decision acknowledged; **no execution**). Later Zone history screenshot displays three rows, newest `TRADE LONG / ALIGNED` at displayed 12:24 AM; no duplicate visible for that displayed time, but true before/after counts or independent DB audit unavailable. User reported restoring Decision note to Optional; persisted setting was not independently read back.
- DI-5 USER-REPORTED WINDOWS PASS for readback UI: `Previous decisions at this zone` displayed `TRADE SHORT / MISMATCH`, `Opposite-plan reason: NEW_EVIDENCE`. This verifies observable history rendering, not an independent DB query.
- DI-6 four in-memory SQLite Rust tests included in successful CI #34, run `42023886750` exact SHA `d2ac6a578156f3780a3908b014841d79ceb2e94b`, frontend and rust jobs SUCCESS; no installed-DB inspection. Existing historical data unchanged by backend normalization.
- New minor UX defect found in DI-4: note text label remained `Optional note` even while user-required. Public source-only UI correction commit `5ebf24c76d4366f1d2ff527bfadb674475886ceb`: display effective `(Required)` or `(Optional)` status after the configured label. Independently read back updated `app/src/App.tsx`; status **SOURCE IMPLEMENTED / CI UNTESTED / WINDOWS UNTESTED / NOT ACCEPTED**. This source change is **not** in previously installed DEMO; defer a new installer until another coherent approved batch. Existing DI-3/DI-4/DI-5 Windows observations are not invalidated; avoid re-running them without affected changes.
- Remaining: DI-4 custom-label/required marker UI needs next bundled CI and targeted Windows smoke-check; full Field Manager and Audited Data Correction remain OPEN/PARTIAL, Feature 5 not globally ACCEPTED. Private canonical repository untouched, no merge, no installer added to repository. Continue approved roadmap reconciliation without claiming all functionality complete.


## Next cohesive Field Manager batch scoping — 2026-11-06 (READ-ONLY DESIGN)
- Latest confirmed Public source on `fix/windows-demo-f05-feedback-console-2026-11-01` includes cosmetic `Decision note` effective Required/Optional label correction, source commit `5ebf24c76d4366f1d2ff527bfadb674475886ceb`; previous installed DEMO is older. No new CI for the label change, no new installer, no acceptance claim.
- Read-only audit of current Public `app/src/fieldInventory.ts`, `fieldDefinitions.ts`, `App.tsx`: 88 inventoried entries and 27 active visibility fields in source. Not a certified total approved-requirements count. `evidence.note`, `evidence.price`, `evidence.direction` are active visibility entries but lack formal FieldRequirement definitions, so user-required preference and field-manager Required/Optional connection is not currently established. Distinguish `VISIBILITY_ONLY` from `CONNECTED`.
- `saveEvidence()` commits a selected batch through `localApi.addEvidenceObservationsAtomic` and currently checks selected evidence type(s), without `isUserRequired('evidence.note')` or `isUserRequired('evidence.price')` checks. Evidence NOTE/PRICE are actual observed-stage inputs, not Plan provenance, and should never be requested during planning.
- Proposed next independently testable, low-risk cohesive Field Manager increment, **NOT APPROVED FOR CODE by this audit alone**: connect optional `evidence.note` and `evidence.price` to formal Field Manager Required/Optional control; preserve default optional visibility, user-required Quick/Detailed precedence, stage-specific inline validation/focus before atomic save, and existing saved history; support price zero as a valid numeric value if otherwise valid and retain tick/market-specific input semantics. Include Vitest control-policy tests and Rust/SQLite safety regression if save contract affected. No new migrations or historical overwrite anticipated; verify prior to implementation. Do not turn `evidence.direction` into arbitrary required text: its existing default/semantic policy needs separate review.
- Acceptance criteria to request user approval for: (1) Optional behavior unchanged; (2) Required note blank blocks Evidence save with clear inline indication, then valid note allows exactly one atomic batch; (3) Required price blank blocks but valid price saves; (4) Required fields cannot be hidden in Quick by placement/visibility; (5) existing records and Review Pending/Decision unchanged. Run one frontend+Rust CI for batch and only one installer when grouped with other ready changes; no repetition of already Windows-passed DI/F/QD tests.
- Governance: approved roadmap scope includes full All-Inputs Manager, but this proposed exact increment awaits explicit scope approval. Audited Data Correction, typed custom fields/options, broad Field Manager and Quick Workflow remain open; Public branch changes require later separately authorized reconciliation; Private canonical read-only.


## PACKAGE-A WORKSTREAM KICKOFF — 2026-11-06
- **Authorization:** User explicitly authorized starting cohesive Package A promptly (2026-11-06), following approved `PTJ_COHESIVE_DELIVERY_POLICY_v1.0_2026-11-06.md` in ChatGPT Project Sources. Explicit authorization is for non-destructive implementation within previously approved requirements; does not authorize merge, production DB migrations, scope changes or activation of proposals/conditional features.
- **Scope:** current Public source branch `feature/package-a-evidence-decision-completion-2026-11-06` created from `fix/windows-demo-f05-feedback-console-2026-11-01`. This is an **incremental source-level component of Package A**, not a declaration that the full Package A is complete or that two fields constitute the whole deliverable.
- **Evidence-stage continuity:** formal optional Field Manager definitions for `evidence.price` and `evidence.note` (stage Evidence), linked to existing visibility/Quick-Detailed placement, dynamic Required/Optional labels and inline error/focus path before `addEvidenceObservationsAtomic`. Quick user-required controls remain visible even when preference hides them; optional defaults unchanged. Price uses `null` to identify missing value rather than truthiness; no fabricated values. Existing Evidence type/role, timestamp, zone association, decision/fill separation, atomic batch persistence are unchanged. `evidence.direction` remains `VISIBILITY_ONLY` pending distinct semantic review; no arbitrary Required policy imposed.
- **Source & tests:** added `app/src/evidenceValidation.ts` pure helper and `app/src/evidenceValidation.test.ts` covering optional defaults, missing required note/price, price zero, independent required preferences; expanded `fieldManagerSafety.test.ts` to assert registered connection and Quick/Detailed required visibility. Source-only commit sequence: `0401a624f9e20d567952f9623dc9405d8dc9744f`, `b8367f89f6be5a87734ed8643a08c2e1fd54cae5`, `7da91f1df00ffae90d09cc615aef8fc6bf2de58a`, `f10a7ee60c23ac8ec5c472bd9f982bd1edc7d198`, `f301dcdbccabc26049d801c0a066120d0ede13a0`, `39bea83d83b89ead0127e81629474be6ef06c8c1`, `6c7395cb3c056b3416ea9488614e57a01103245b`. Selected file content was independently re-fetched; matching source markers confirmed, with initial false-negative substring lookup in inventory resolved by direct readback. **Tests NOT RUN**; workflow `ptj-manual-checks.yml` only supports `workflow_dispatch`, unavailable through current connector. Local `git ls-remote` cannot resolve github.com. Never represent added tests as PASS.
- **Gate:** IMPLEMENTED (unmerged isolated Public source) / CI UNKNOWN / WINDOWS UNTESTED / USER ACCEPTANCE PENDING. No DB migrations, installer or real journal data touched; Private canonical app branch unchanged. Reuse earlier Decision DI-3..DI-6 PASS evidence unless affected paths change.
- **NEXT:** continue complete Package A crosswalk/implementation across Plan/Zone guided UX, Full Field Manager, Custom Fields, Evidence and Decision; group further related fixes on isolated branch; one consolidated frontend/Rust CI when coherent batch is ready, then one targeted Windows DEMO. Preserve every approved MR and all twelve Future Roadmap categories. Custom fields and DB-migration changes require specific safety/authorization gate; avoid premature installer.


## PACKAGE-A EVIDENCE FORM + FIELD MANAGER INTEGRATION — 2026-11-06
- **Authorization:** user approved continuing cohesive Package A, reuse existing PASS verification, avoid per-field installers. Public isolated branch `feature/package-a-evidence-decision-completion-2026-11-06` only; no merge/private modification/migration/installer/local data access.
- **Implemented in source:** activated the formal `Evidence` group in Field Requirements settings, so the newly registered `evidence.price` and `evidence.note` Required/Optional controls are actually available to the trader. Live Evidence form applies policy + visible indicators, configured label/help for both, focus/field highlights, optional defaults, and validation before existing `addEvidenceObservationsAtomic`. Clears stale validation errors when changing Zone. Both detail fields can now be re-ordered from the Field Manager using existing persisted field-order preferences, and form renders in saved order; no new SQLite schema/table/column. Required presentation precedence still overrides hidden/DETAILED_ONLY settings. Nonrequired field visibility retains previous behavior. No observed data is invented; planning and Evidence stages remain separated.
- **Truthful coverage display:** Field Manager inventory now distinguishes `CONNECTED`, `VISIBILITY_ONLY`, `PROTECTED`, `PENDING` rather than calling every active visibility control fully connected. Existing inventory retains 88 declared controls in source; new formal Evidence definitions increase exact formal count from earlier snapshot; no claim of full All-Inputs coverage. Known active visibility-only gaps include `plan.preSessionStateIntensity`, `evidence.direction`, `psychology.intensity`, `review.mistakes`, `rule.note` and six session-review reflections; avoid automatically converting `evidence.direction` (preselected NEUTRAL) into user-required without truthful missing-value semantics.
- **Tests added, execution pending:** `evidenceValidation.test.ts` covers optional and required statuses including numeric zero; `fieldManagerSafety.test.ts` covers policy-to-Quick visibility and inventory status; `fieldInventory.test.ts` covers both Evidence ordering variants and no loss of field IDs. Source-only commits for second group: `6530a4861963d3411799e408ed0486267c2b0982`, `2112d890768e8b909bdf091b6072dd7e5a0c4d68`, `804d294252d993c4d7dc4bb305463abb581e8836`, `606721da93847d18e0b2744345b7fff191518823`, `3480ee50b1bdbe24863b763313480e4f913281fc`. Independently fetched `App.tsx` afterward and verified Evidence group, coverage, dynamic label/help, ordering and validator markers. **No successful npm/Vitest/TS/Rust run yet**; source-only and test files committed is not CI PASS.
- **CI blocker/plan:** existing `.github/workflows/ptj-manual-checks.yml` triggers only on manual `workflow_dispatch`; current GitHub connector does not offer dispatch and local git clone fails DNS. Do not launch a DEMO merely to test this intermediate change. Run one consolidated frontend/Rust CI when additional Package A functionality is coherent and dispatch is available. If test/build fails, repair branch before promoting.
- **Still open:** all-input completeness across every lifecycle stage, Custom Fields typed value entry/option snapshots and historical report mapping, Plan/Zone guided usability, Decision/Quick workflow consolidation, end-to-end Windows acceptance. Full Field Manager and Package A remain PARTIAL. Schema v9 custom fields are a migration-sensitive concern; require explicit safety gate and approval before any live-data exposure. Public code must be reconciled explicitly before private integration.
