## Package D installed Windows DEMO evidence — 2026-11-26

PUBLIC PR #17, active branch `feature/ptj-c-transfer-integrity-2026-11-23`. Tested source `cbb5352f889008bca79cf0eee24d837b048c52b6`, tested docs successor `705b3c3dbe0435d859732deba7ce85a073fa71ae`, CI 45737796278 SUCCESS. Latest canonical checkpoint `PTJ-D-INSTALLED-WINDOWS-DEMO-ACCEPTANCE-EVIDENCE-2026-11-26`, commit `b9895bbf970571c5f0565c91a9a18f59d7a5b25d`. Installed scoped Windows DEMO checks PASS: health/schema15, isolated Beta Self-Test 11/11, internal backup and independent validation, duplicate launch blocked (user report), restart observable persistence, isolated C storage identity. User acceptance not yet explicit. Local installer hash and external backup retention not verified; actual B-to-C transfer, installed replacement/rollback injection, independent simultaneous B launch not performed. Do not imply production readiness or close separate gates. No new source changes, merge, PRIVATE write or live restore. Next: explicit scoped user acceptance; preserve limitations and all requirements, then verify approved roadmap before next package. No unnecessary retesting.

---

## Package D CI complete — Windows acceptance gate — 2026-11-26

PUBLIC PR #17, active branch `feature/ptj-c-transfer-integrity-2026-11-23`. Source `cbb5352f889008bca79cf0eee24d837b048c52b6`, exact tested docs successor `705b3c3dbe0435d859732deba7ce85a073fa71ae`, CI 45737796278 SUCCESS (580 frontend tests, 128 native tests, isolated Windows NSIS build). Canonical checkpoint `PTJ-D-CI-COMPLETE-WINDOWS-ACCEPTANCE-GATE-2026-11-26`, commit `38932b4329d39e054ee8b3c6c4b92a60a182f279` in existing checkpoint document. Artifact [15079802751](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45737796278/artifacts/15079802751), name PTJ-PACKAGE-C-ISOLATED-DEMO-UNTESTED; installer SHA256 87EA142AEC44ADF6670443177C1D9E2BD0D23E2EF58DD5002DEC65BC2930E128, CI verified only. Expires 2026-12-03 01:48:19 UTC; no local backup verified. Existing C identity retained; backup useful C data before upgrade; no production installation or destructive test. Development/CI PASS; Windows/user acceptance OPEN. Follow detailed safe acceptance steps in checkpoint. Preserve all prior requirements, evidence and open C/Field Manager gates. No merge or PRIVATE writes.

---

## Package D archive and rollback verification — 2026-11-26

Latest PUBLIC source `cbb5352f889008bca79cf0eee24d837b048c52b6` on `feature/ptj-c-transfer-integrity-2026-11-23`, PR #17. Canonical checkpoint `PTJ-D-ARCHIVE-AND-ROLLBACK-VERIFICATION-2026-11-26` commit `705b3c3dbe0435d859732deba7ce85a073fa71ae`. Previous full CI 45632747613 SUCCESS, including instance lock and staging isolation. New restore changes validate/extract same open archive, reject unexpected sidecars and case collisions, verify rollback database bytes and attachment inventories and recheck rollback integrity before declaring success. Latest CI must be verified; no new installed Windows acceptance. Package D PARTIAL. Next exact-source CI and one cohesive isolated Windows acceptance batch. External non-cooperating tools/older binaries and power interruption are not proven safe. No merge, PRIVATE changes, schema or live data changes. Preserve all requirements and prior acceptance.

---

## Package D staging and instance isolation — 2026-11-26

Latest source `c74defb2f93927888be2848c86d163cbd86e1687` on PUBLIC `feature/ptj-c-transfer-integrity-2026-11-23`, open PR #17. Canonical checkpoint `PTJ-D-STAGING-AND-INSTANCE-ISOLATION-2026-11-26` in `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md` commit `5bf29d95948ceb6a2a03126779f60076e78f7c10`. Prior CI 45631244762 PASS for previous readiness/WAL/downgrade source plus docs. Restore/transfer CI 45632037915 frontend and Rust PASS, packaging was in progress. New exclusive per-root instance lock source and tests persisted/read back, latest CI not yet verified. No installed Windows acceptance. Package D PARTIAL. Next verify live CI, finish bounded archive/concurrency and rollback audit, then cohesive isolated Windows acceptance (including duplicate instance and independent DEMO). No merge, PRIVATE changes, real data operations or requirement closure. Preserve full Field Manager PARTIAL, all 12 categories and C outstanding gates. Reverify live head and results.

---

## Package D release readiness / WAL / downgrade safety — 2026-11-26

Latest PUBLIC development source SHA `1596f1f4ab67866e57d091793d1ad589502d5f56` on `feature/ptj-c-transfer-integrity-2026-11-23`, PR #17. Canonical checkpoint `PTJ-D-RELEASE-READINESS-WAL-DOWNGRADE-GATE-2026-11-26` in `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md`, docs commit `2b1ece09e061f9009e35293fb8a8a8b0cf35bb28`. User authorized continuing Package D. Source readback verified; CI for this increment UNKNOWN (not yet returned), native tests written, not executed in current operation. Previous exact-source CI 45629151538 remains PASS only for earlier SHA cf7899c9629a6a15eed70b93ccc469f1d9ae6aa7. No new installed Windows acceptance.

Three scoped fixes: refuse future schema before migration/journal settings; reject incomplete WAL checkpoint; readiness requires validated backup, not ZIP extension alone. No schema change, real database access, merge or PRIVATE writes. Package D still PARTIAL; further staging/concurrent-write safety audit and exact-source CI followed by cohesive isolated Windows upgrade/backup/restore/restart/rollback acceptance. Preserve all 12 categories, full Field Manager PARTIAL, all previously accepted evidence, Package C transfer and C8/C9 outstanding gates. Reverify live head/PR/CI before acting.

---

## Verified Package D publish-only-validated backup gate — 2026-11-26

Latest independently CI-tested CODE SHA on authorized PUBLIC feature branch `feature/ptj-c-transfer-integrity-2026-11-23`: `cf7899c9629a6a15eed70b93ccc469f1d9ae6aa7`. Canonical checkpoint `PTJ-D-PUBLISH-ONLY-VERIFIED-BACKUP-2026-11-26` on that branch in `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md`, recorded by docs commit `0927d403f0d49a1babf048ac97dcb0341bbcf88c`. [CI run 45629151538](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45629151538) VERIFIED completed SUCCESS for frontend, Rust native regressions and isolated Windows Package C NSIS build. Draft PR #17 remains OPEN/UNMERGED as of checkpoint; reverify live branch, PR and CI each session.

Package D / #12: `app/src-tauri/src/backup.rs` now hashes the exact SQLite bytes packaged in each ZIP and revalidates finished staged ZIP via read-only SQLite integrity/FK/schema, attachment count/ZIP integrity and DB hash before publishing any `.zip`. New isolated native fixture verifies two valid sequential unique backups, preserved prior bytes, surviving attachments and no leaked `.partial` files. Scope implemented + CI-TESTED ONLY; no installed-Windows user retest and no new installer action necessary. Prior D safety fixes (archive read-only validation, B→C catalog completeness protection, attachment-absence rollback/UUID recovery directory) retained. No user-data or PRIVATE repo writes, no migrations or merge.

Full Package D category12 remains PARTIAL; whole installed Windows upgrade/backup/restore/rollback acceptance and final user approval are open. Package C true installed B→C empty-target import/restart/rollback remains open. C8 high-risk history correction requires separate user permission. Keep all twelve roadmap categories, all approved unfinished clauses and FULL Field Manager PARTIAL; never equate CI with Windows PASS/user ACCEPTANCE. Continue targeted non-destructive release-safety audit on active PUBLIC branch, cohesive packaging only after substantive scope ready.

---

## Verified Package D rollback-recovery gate — 2026-11-26

Authorized PUBLIC development branch `feature/ptj-c-transfer-integrity-2026-11-23`, Draft PR #17 OPEN/unmerged. Last code SHA `e3449ae3316b3b7692ebe08090d035ec2d77e30d` passed independent [GitHub Actions 45627933680](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45627933680), all three jobs frontend SUCCESS, Rust SUCCESS, isolated Windows Package C NSIS build SUCCESS. Canonical checkpoint `PTJ-D-FAILED-RESTORE-ROLLBACK-ATTACHMENT-ABSENCE-2026-11-26` saved by docs commit `cae58ec1690ee961deeb795a16140cb3c979c342` in `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md` on PUBLIC development branch; newer commits may exist, always check live HEAD.

Package D confirmed and fixed rollback orphan attachment bug when the original empty destination had NO attachments folder. Unique UUID rollback directories protect recovery snapshots from same-second collision; rollback failures now explicitly report failure and snapshot location. New synthetic failure-injected Rust regression proves destination folder absence + SQLite integrity + untouched source ZIP restored/preserved; existing restore tests and all frontend, Rust/Windows CI passed. No user SQLite data or installed runtime touched, no changes to backup schema or format. Source implementation/CI PASS only; NOT installed Windows user-accepted. Existing Package D archived SQLite read-only ZIP validation and missing default-catalog transfer protection still CI PASS, documented in prior checkpoints.

Package D overall PARTIAL pending cohesive Windows installation/upgrade/restore/rollback acceptance. Package C true installed B→C empty-profile import/restart/rollback still OPEN. C8 high-risk history corrections separately authorization gated. Preserve ALL 12 Future Roadmap categories, FULL All-Inputs Field Manager PARTIAL and Package A/B/C accepted results within exact scope. No merge, PRIVATE write, production database restore, destructive migration or installer cycle just for this safety fix.

NEXT: continue narrowly scoped release safety audit on active PUBLIC dev branch, target realistic upgrade/storage failures; only cohesive Windows test gate after code batch is ready. Record verified next checkpoint and ensure START_HERE reflects it.

---

## Verified Package D transfer-catalog integrity gate — 2026-11-26

The authorized PUBLIC development branch `feature/ptj-c-transfer-integrity-2026-11-23` (Draft PR #17 OPEN/UNMERGED) has the exact-source CI-verified Package D missing-default-reference protection code SHA `8eb103f77a7e329deb9fe638f4463d10476e4d35`; docs-only canonical checkpoint `PTJ-D-TRANSFER-MISSING-DEFAULTS-NEGATIVE-GATE-2026-11-26` recorded in `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md` on development branch by commit `137e89c5d41aa06cb536c3dbade9a8b0e33a24cc`. [CI run 45625851445](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45625851445) independently checked COMPLETED SUCCESS for frontend, Rust and separate Package C Windows NSIS build. Archive validator work from prior checkpoint `PTJ-D-READONLY-ARCHIVE-SQLITE-VALIDATION-2026-11-26` remains covered.

Protect existing default Instrument, Level Source and Evidence catalogs against BOTH changed and missing records before B→C import, with synthetic negative tests for deleted ES, VAH, ATS defaults. Fresh completely unseeded empty Package C destination continues to be accepted; partial catalog deletion is blocked. Source-only and native CI PASS, **not yet installed Windows retested**. No active user action, installer reinstallation, real SQLite operation, merge or PRIVATE write. All approved A/B/C tests remain preserved; Package D CATEGORY12 remains PARTIAL and Package C real isolated B→C import/restart/rollback open. C8 high-risk history corrections still require separate authorization; FULL All-Inputs Field Manager remains PARTIAL; all 12 future categories retained.

NEXT: audit/resolve remaining release stability and recovery risks coherently. Refresh live branch/PR/CI before any change; no destructive restore, merge, data migration or scope expansion without required authorization.

---

## Latest current milestone — 2026-11-26 Package D archive safety

Active authorized PUBLIC code branch `feature/ptj-c-transfer-integrity-2026-11-23`, Draft PR #17 OPEN / UNMERGED. **Latest tested SOURCE SHA `edb0f306862713c56e494fbfaebdd4cce316d54d`**. Canonical code-branch checkpoint `PTJ-D-READONLY-ARCHIVE-SQLITE-VALIDATION-2026-11-26` recorded by docs commit `7857e407248ed95155c2c2d4963dd6ccb0637ac1` in `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md`. [CI 45623055790](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45623055790) independent final readback frontend SUCCESS, Rust SUCCESS, separate Package C Windows NSIS build SUCCESS. New archive preflight verifies real archived SQLite read-only in an auto-cleaned temporary file, runs SQLite integrity and FK checks and compares actual schema with manifest; negative regression fixtures reject checksum-valid fake SQLite and schema mismatch. No format/migration/live user data changes. **No need to ask user to reinstall**; new validator not separately installed-Windows user-tested.

**Package C Windows DEMO test cycle ended with qualified evidence:** user demonstrated installed app, Safety/self-test, corrected Recent and Trade journal navigation, completed locked Review, Sydney Decision-hour example, and both old schema11 and current schema15 backup ZIP validation. Exact latest Package C screenshot evidence and test limitations live in canonical code-branch checkpoint. Package C still **PARTIAL**: real B→C isolated EMPTY-target import/restart/rollback, Windows GC numerical scenario NO SAMPLE, C8 high-risk corrections subject to separate approval, and C9 DST/mixed currency boundary coverage remain OPEN. Keep ALL 12 roadmap categories and FULL All-Inputs Field Manager unfinished requirements intact; Setup Playbook proposed, NinjaTrader import conditional. CI PASS != new installed Windows PASS != full user acceptance.

**NEXT:** continue Package D / category 12 practical release stability and rollback audit on PUBLIC development branch; read only relevant source/checkpoints; code safe approved non-destructive fixes in cohesive batches. No merge, PRIVATE modifications, SQLite restore, destructive migration or unapproved C8 historical edits. Verify live head SHA and newest CI before making changes; this pointer is a dated checkpoint.

---

## Current installed-DEMO delivery gate — 2026-11-24

Package C isolated Windows NSIS installer **BUILT / CI PASS**, **NOT YET WINDOWS-INSTALLED OR USER ACCEPTED**. Exact PUBLIC development code branch `feature/ptj-c-transfer-integrity-2026-11-23` source unchanged from C9 last tested code SHA `6937032470bd6a6afa5128c2807c08b7e193936b`; installer-enabled PR HEAD `45a22f829ca31e29e4558d77a7190c0336e960be`, followed by **docs-only checkpoint commit `3efb4716dd4366c730480a1dce1de821eeec498b`**. The canonical evidence is checkpoint `PTJ-C-ISOLATED-WINDOWS-INSTALLER-CI-SUCCESS-2026-11-24` in `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md` on PUBLIC development branch.

GitHub Actions [45209484158](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45209484158) **frontend SUCCESS / Rust SUCCESS / isolated Package C NSIS SUCCESS**. EXE `Personal Trading Journal Package C DEMO_1.9.6-beta.1_x64-setup.exe` SHA256 `28C4DF47C5A99282A6A07A0240C68764C7AAFF884E02FF889D95264787DED1AA`. Artifact ZIP [14835568245](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45209484158/artifacts/14835568245), ZIP SHA256 `303b5c19576bed1ac7e69bd08e27b3f1662ed5395d49998985114c2be9ce7242` (7-day retention). The ZIP SHA differs from EXE SHA. Independently readback-verified GitHub checkpoint; check newer live SHA before resuming.

NEXT **no new feature scope**: download/isolate Windows Package C DEMO then targeted installed B26 A/C Review readback, B→C backed-up ZIP import/rollback/restart, GC cost/R and C9 usability; preserve accepted A and B01–B25. Package C PARTIAL until Windows and user acceptance; higher-risk C8 timestamp/ownership/link corrections separately authorization-gated. No merge, PRIVATE writes or user real SQLite operations.

---

## Current validated Package C milestone — 2026-11-24 C9 historic clocks and currency

Authorized PUBLIC code branch `feature/ptj-c-transfer-integrity-2026-11-23`, Draft PR #17 UNMERGED. Last exact CI-tested **CODE SHA `6937032470bd6a6afa5128c2807c08b7e193936b`**, canonical milestone `PTJ-C9-DECISION-HOUR-TIMEZONE-AND-CURRENCY-INTEGRITY-2026-11-24` in existing `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md` on the code branch, appended by **docs-only checkpoint `b5fd4078036878420afa5f5bca07b091630f1c48`**. [GitHub Actions 45194565705](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45194565705) independently confirmed frontend SUCCESS and Rust SUCCESS after resolving real fixture failures. These pointers are historical; verify current GitHub head and workflow on recovery.

**C9:** original persisted Decision event timestamp + saved IANA Session timezone now support DST-aware read-only Weekday/Decision-hour review; unknown/invalid time never gets an invented local hour. Verified historical Session currency required before monetary net P&L/expectancy is aggregated; mixed currencies or missing historical currency suppress monetary totals as UNKNOWN while eligible unitless R remains available. No foreign exchange rate invented, original fills or database changed. Native/TypeScript fixture tests and readback completed in GitHub. This is IMPLEMENTED + CI-TESTED, **not Windows-installed / user ACCEPTED**.

**Retained:** previous CI-tested isolated Package C B→C full ZIP SHA+rollback preflight/UI, protection of customized destination registries, chronological R drawdown/streak, GC persisted money/risk negative fixtures and all accepted Package A/B01–B25 tests. Package C remains PARTIAL. Remaining gates: separately authorized C8 high-risk timestamp/ownership/reference correction semantics, full C9 acceptance traceability, B26 completed Review A/C installed Windows readback, isolated DEMO B→C import/restart/rollback, GC installed tests, one cohesive Windows installer and user approval. Do not merge, touch PRIVATE or user live SQLite. Preserve all 12 roadmap categories and FULL All-Inputs Field Manager.

---

## Latest Package C verified regression checkpoint — 2026-11-24

PUBLIC active development branch `feature/ptj-c-transfer-integrity-2026-11-23`, Draft PR #17 UNMERGED. Last independently CI-tested **CODE SHA `1415e378a477dd9aeb6926e80b2b9292af1879ac`**, followed by docs-only checkpoint **`23a6cd07d36a3ca033c56c00f2bc96918c4ee696`**. Canonical checkpoint ID: `PTJ-C-GC-PERSISTED-ACCOUNTING-NEGATIVE-GATE-2026-11-24` in existing `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md` on PUBLIC development branch. [Run 45191376624](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45191376624) completed **frontend SUCCESS + Rust SUCCESS**. These are verified historical anchors; always refresh live branch SHA and CI.

New targeted native SQLite GC fixture tests persisted contract snapshots, 2-contract partial exits, cost and initial-risk R calculation, independent Analytics readback, unknown fee remains NULL and excludes net/R, and corrupt excess exit is read-only fail-closed. No runtime schema or user data changed. This is CI-TESTED only, NOT installed Windows-tested or accepted.

Prior C9 chronological realized-R drawdown/streak regression, Package C isolated DEMO user backup preview/import panel, full source ZIP checksum/rollback and destination authored-config protection remain verified as recorded in prior checkpoints. Completion blockers: B26 completed Review A/C Windows installed readback, isolated B→C rollback/restart, exact-source Windows installer acceptance, final C9 event-time/context requirement coverage, and separate authorization for newly high-risk C8 timestamp/ownership/link changes. Package C remains PARTIAL, preserve all approved requirements, 12 roadmap categories and full All-Inputs Field Manager, no merge/PRIVATE write/unsafe restore.

---

## Latest independently CI-verified Package C — C9 chronological R (2026-11-23)

Active authorized PUBLIC branch `feature/ptj-c-transfer-integrity-2026-11-23`, Draft PR #17 UNMERGED. Latest CI-tested **CODE SHA `6ff60ba6ce81762b4cdda59f318172efa34bcb7e`** (C9 true exit-timestamp-qualified streaks and realized-R peak/trough, fail-closed UNKNOWN), followed by canonical docs-only checkpoint commit **`98450cf388048735ee40bb2ddaf7a187db7297cf`**. Source of full scope/evidence: existing `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md` on PUBLIC development branch, milestone `PTJ-C9-CHRONOLOGICAL-CLOSED-R-STREAK-AND-DRAWDOWN-2026-11-23`. [Run 45180077242](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45180077242) completed **frontend SUCCESS + Rust SUCCESS** on exact code. User/installed Windows acceptance NOT established.

Earlier `PTJ-C-COHESIVE-TRANSFER-BASELINE-AND-USER-PREFLIGHT-2026-11-23` is preserved: built-in edited catalog/Workspace overwrite preflight guard plus nonprogrammer isolated Package C DEMO backup preview and explicit full-archive-hash import UI, exact code SHA `250314229813ce22440123732f8fab6e56079a48`, run 45178848710 both jobs SUCCESS. No merge, PRIVATE change, live database access, installer or Windows data restore.

**Package C PARTIAL**: still need isolated Windows Package B→C transfer/rollback/restart, B26 completed Review A/C readback, GC negative accounting, C8 high-risk corrections separate authorization, full C9 requirements acceptance, Windows package and explicit user acceptance. Do not lose full All-Inputs Field Manager or any of 12 roadmap categories. The current branch HEAD may now be later docs-only: independently check live SHA, PR and CI each new chat.

---

## Current Package C recovery pointer — 2026-11-23 cohesive transfer preflight

Active authorized PUBLIC code branch `feature/ptj-c-transfer-integrity-2026-11-23`, Draft PR #17 UNMERGED. Newest exact **CI-tested source SHA** `250314229813ce22440123732f8fab6e56079a48`; canonical milestone `PTJ-C-COHESIVE-TRANSFER-BASELINE-AND-USER-PREFLIGHT-2026-11-23` saved in existing `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md` on the code branch by **docs-only commit `206b28c025654cbb665114e9ba2f89cb1a888272`**. GitHub Actions [45178848710](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45178848710) completed SUCCESS for frontend AND Rust on this exact unchanged source.

Package C transfer now rejects edited **built-in** instruments/Level Source/evidence catalogs and renamed/extraneous workspaces as well as user-defined settings, using an exact seed-generated baseline and native tests. An isolated Package C DEMO-only UI lets a nonprogrammer pick a Package B ZIP, preview immutable inventories/full ZIP hash, explicitly confirm and import; the native app-identifier/backup/rollback gates remain. No live user data, PRIVATE repo, merge, migration, installer or Windows test occurred.

**Delivery still PARTIAL.** Next: exact-source isolated Windows install + B26 Review A/C, GC negative calculations, B→C history transfer/restart/rollback/readback with user acceptance; reconcile full C8/C9 gaps. Separate explicit approval still needed for new high-risk historical timestamp/ownership/link corrections. Preserve all accepted A and B01–B25 evidence, full 12 roadmap categories, and full All-Inputs Field Manager. Re-check live branch/CI; this pointer is historical.

---

## Latest PUBLIC checkpoint — Strategy/Settings destination preflight (2026-11-23)

The latest independently persisted source on active PUBLIC branch `feature/ptj-c-transfer-integrity-2026-11-23` is **`e6bcf4db37771ba186a89a5f326084acdd69c3db`**, followed by docs-only checkpoint commit **`9390b4cf98fc77a7b7663b60833ce307aa1150c3`**. Canonical milestone in existing `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md`: `PTJ-C-TRANSFER-STRATEGY-SETTINGS-PREFLIGHT-2026-11-23`. Inspect current live HEAD/PR #17/CI before any next action: these are historical pointers.

**Source change:** B→C empty-destination check now protects user-created Strategy/Version and Settings Profile/Version even if zero Session/Trade records exist, in addition to previously protected Custom Field, Setup Playbook, user-instrument and Level Source records. Native isolated regression fixture added; no migrations or user/live database changes. Source + checkpoint independently read back from GitHub. **Source-equivalent CI PASS VERIFIED:** [run 45176139219](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45176139219) completed with frontend SUCCESS and Rust SUCCESS on code SHA `e6bcf4db37771ba186a89a5f326084acdd69c3db`; canonical closure addendum `PTJ-C-TRANSFER-STRATEGY-SETTINGS-CI-CLOSURE-2026-11-23` saved by docs-only commit `8f10fd504b75422b488ad9b1d6b5574aff88ad5b`. Prior full ZIP-source protection is CI PASS run 45174739312, frontend and Rust.

**Open gates:** full C8/C9 approvals and acceptance, B26 completed Review Windows, GC negative-case accounting, additional destination baseline/settings protection, isolated installed Windows DEMO backup/transfer/rollback/restart, and user acceptance. No merge, PRIVATE modifications, original data changes, or approval of conditional features. Preserve previously accepted A and B01–B25 without unnecessary retest.

---

## Latest transfer-integrity development checkpoint — 2026-11-23

Authoritative PUBLIC product branch remains `feature/ptj-c-transfer-integrity-2026-11-23` (Draft PR #17, UNMERGED). Latest independently fetched CODE SHA `b529d1a3fb1ef8c6c9095191be64c4ffb3b556e5`, followed by canonical docs-only checkpoint `4ac0801eba25541eb7b860f0bec86dac67f937cd`, **`PTJ-C-TRANSFER-FULL-ARCHIVE-HASH-AND-SOURCE-ISOLATION-2026-11-23`** in `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md` on the product branch. Reverify live HEAD and CI before acting; these are historical exact anchors.

Package C B→C import now requires full SHA-256 of original ZIP (including attachments and manifest), not merely database SHA, and rejects sources located within the Package C destination root. Final installed-copy postcheck rehashes the ZIP within rollback-capable Restore. Added Rust negative fixtures for changed attachment with identical DB hash, and self-staging source location. Source files and checkpoint independently GitHub-read-back. **Final source-equivalent CI verified PASS:** GitHub [run 45174739312](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45174739312) completed with **frontend SUCCESS and Rust SUCCESS**, including native regression suite; canonical addendum `PTJ-C-TRANSFER-FULL-ZIP-CI-CLOSURE-2026-11-23` committed on development branch `ed47f53b3b61ffbf62bba38946fac54ed94627e5`. Source remained at `b529d1a3fb1ef8c6c9095191be64c4ffb3b556e5` throughout this verification. Incoming previous transfer UI/registry safeguard [45166699677](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45166699677) completed SUCCESS frontend+Rust.

No Windows DEMO, installer, user SQLite, PRIVATE repo changes or merge. Package C remains PARTIAL: full B→C installed Windows/rollback + B26 Review readback + GC negative cases + C8 high-risk correction separate authorization + C9 complete coverage + user acceptance still OPEN; 12 roadmap categories and accepted A/B B01–B25 evidence preserved.

---

## Latest operational transfer safety checkpoint — 2026-11-23

Canonical active PUBLIC development branch: `feature/ptj-c-transfer-integrity-2026-11-23` (Draft PR #17, UNMERGED). The most recent independently GitHub-read-back code change is **`2d41ff13e9810dd6ca6815bbada612f695473584`** in `app/src-tauri/src/demo_transfer.rs`; its canonical `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md` entry is **`PTJ-C-TRANSFER-NONEMPTY-USER-CONFIG-PREFLIGHT-2026-11-23`**, recorded by docs-only commit **`8ee1e38a39f05ffab69f5e5423b4823e34c8f767`**. This is a historical verified pointer; re-check live HEAD and exact CI in each new chat.

**Key improvement:** Package C import into an "empty" DEMO destination now refuses not only prior Trades/Events but also existing user-owned Custom Field definitions/options, Setup Playbook details/priorities, and user-defined instruments/Setups/Level Sources, even with zero Sessions. Native negative tests were added; prior B→C fixture preserved. **CI for this increment is not yet verified PASS in this pointer**; workflow [45166529922](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45166529922) was pending/running when last checked. The preceding C8 three-way Fill correction readback was CI PASS [45165570035](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45165570035).

Package C remains PARTIAL. Required next gates: verify final CI on exact source; examine remaining custom destination settings risk; B26 saved review Windows readback, GC negative tests, isolated B→C backup/rollback/restart, one cohesive exact-source Windows DEMO, and explicit user acceptance. Historical timestamp/identity/foreign-key correction changes remain separately authorization-gated. Never merge, touch PRIVATE or user live DB, or repeat accepted A/B B01–B25 tests without technical necessity.

---

## Latest verified Package C checkpoint — 2026-11-23

The latest independently verified PUBLIC development checkpoint is `PTJ-C8-FILL-CORRECTION-THREE-WAY-PERSISTED-READBACK-2026-11-23`, saved in the existing canonical `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md` on `feature/ptj-c-transfer-integrity-2026-11-23`. Exact **CI-tested source code SHA** `cb989ffbf00bfd4e3922fae2e05f6f0bd9c0af8e`, followed by **docs-only** checkpoint commit `4b15ae0de4f05dd76e0d53b2ab86fccee3a7bf6d`. The [GitHub workflow 45165570035](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45165570035) completed SUCCESS for both frontend and Rust.

New C8 protection: after an audited historical Fill correction, the app requires matching receipt, exact append-only audit event and independently re-read effective Fill value before declaring a save verified; ambiguous post-commit outcomes remain locked. Source/tests independently read back from GitHub. This is IMPLEMENTED + CI-TESTED, **not Windows-tested or accepted**. The previous manual audited-history recovery and C9 known-cost analytics are retained.

Remaining gates: safe exact authorization for historical timestamp/snapshot/ownership/relationship mutations; complete C9 data-grounded coverage; B26 closed Review A/C Windows readback and GC negative fixtures; controlled B→C backup/rollback/restart integration, isolated Windows DEMO and explicit acceptance. Prior Windows-accepted Package A and B01–B25 remain preserved. No merge, PRIVATE actions, live user database writes or installer. Continue only from live PUBLIC HEAD, never assume an older snapshot is latest.

---

## Current operational update — 2026-11-23 Package C obstacle removal

**Read this update before the earlier bootstrap snapshot below; bootstrap SHAs are historical.** The **active code branch remains** `feature/ptj-c-transfer-integrity-2026-11-23` (PUBLIC only, draft PR #17 not merged). Newest independently read-back code SHA at this update: `566f81579736d22bfd1c5f1537827164edad0124`; subsequent **docs-only** checkpoint commit on active code branch: `d8a2dad5c31238f0e206f92e78198168ec65fada`. Its detailed canonical checkpoint is `PTJ-C8-C9-OBSTACLE-REMOVAL-2026-11-23` in `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md` on the active code branch. Always re-fetch the live HEAD and exact CI; this is an observed historical pointer.

- Last completed pre-obstacle GitHub workflow: run `45153738608` SUCCESS frontend + Rust. Additional native C9 metrics code/tests run `45161633017` SUCCESS as observed. Newest full source C8 audit-read-guard workflow `45161972558` was still in progress at checkpoint; inspect latest result before declaring PASS.
- Package C now includes known closed-trade `expectancy_pnl` and `win_loss_payoff_r` with denominators and native tests; new C8 Fill correction UI fail-closed gate locks historical corrections until independent Audit history read succeeds. All new changes are sourced and GitHub readback-verified. CI evidence and Windows acceptance remain separate.
- Important corrected C8 fact: Price and Quantity historical Fill correction already exist via audited Preview/Record backend and Fill correction panel. Do not reimplement or disable them as though absent; **Windows safety/acceptance remains incomplete**. Broader timestamp, snapshot and cross-record identity/link correction requires an exact approved whitelist, append-only migration/rollback design and separate explicit authorization.
- Still open: C9 full metric/semantics coverage; B26 Windows Review A/C, GC negative accounting cases, isolated B→C backup/transfer/rollback, an exact-source Windows DEMO installer and explicit acceptance. Existing Package A and B01–B25 accepted Windows scope must remain intact. Full Field Manager and all 12 roadmap categories preserved.
- No merge, PRIVATE write, live SQLite change or Windows installer performed in this update. Next approved step: verify latest native CI, finish remaining safe C9/C8 integrity gates and plan **one cohesive** isolated Windows package instead of micro-installer cycles.

---

# PTJ — START HERE / Continuity & Recovery

**Snapshot:** 2026-11-23 (Australia/Sydney) | **Status:** Continuity bootstrap, source/data unchanged. This page is a pointer, not a replacement for approved requirements or evidence.

## 1. Authoritative operational state (verified at bootstrap)
- **ONLY active development repository:** [PUBLIC personal-trading-journal-public-build](https://github.com/babak48-cmyk/personal-trading-journal-public-build). PRIVATE historical repo is READ-ONLY; no private changes/merges without explicit approval.
- **Latest verified active product development branch at inspection:** `feature/ptj-c-transfer-integrity-2026-11-23`; **HEAD before documentation-only bootstrap:** `66eb2ea8035ce3300eaaa91a08f14b9ab84e7a6b`; [Draft PR #17](https://github.com/babak48-cmyk/personal-trading-journal-public-build/pull/17) OPEN, NOT MERGED. [Parent B26 Draft PR #16](https://github.com/babak48-cmyk/personal-trading-journal-public-build/pull/16) OPEN, NOT MERGED, HEAD `b04b3ed3bcef7a92e33d914df1f31775c6b5302d`.
- **Current documentation-only branch:** `docs/ptj-continuity-recovery-2026-11-23`, branched from that exact development HEAD. Its documentation commit is **not a new tested application source**. Always re-check live PR, branch HEAD, commits and CI at next startup; never assume this snapshot remains current.
- **Latest material development checkpoint verified by direct GitHub read:** `PTJ-C-WEEKLY-TRADE-READ-FAILCLOSED-AND-CLOSURE-GATE-INVENTORY-2026-11-23`, in [existing checkpoint register](PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md), at source-tested SHA `5a54a1bde3a85efd5c632d4d4ebd1a49a580170c`. [CI run 45139617190](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45139617190): COMPLETED SUCCESS, frontend and Rust SUCCESS, 105/105 native tests PASS. Subsequent HEAD `66eb2ea...` is a **documentation checkpoint**, not a separately Windows-accepted product.

## 2. Accepted evidence vs open gates
- Package A: accepted by the user **within its tested scope**; not blanket fulfillment of the full Field Manager or roadmap.
- Package B: isolated Windows DEMO B01–B25 user accepted within recorded ES scenarios; independent re-entry, partial fills, audit costs, two completed reviews and restart persistence recorded. See [2026-11-22 master transfer](PTJ_MASTER_TRANSFER_PUBLIC_SOURCE_B_TO_C_2026-11-22.md) and [detailed checkpoint register](PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md). Preserve PASS; do not reflexively rerun.
- B26 completed Review read-only detail: implemented/CI-tested, **updated Windows-installed field-level A/C readback NOT VERIFIED**. Other open B issues: Partial Exits label/semantics; stale UI message; decision timestamps/order; GC contract/R and targeted negative cases.
- Package C: **PARTIAL**. Append-only Fill Cost, Initial Risk, Level Source Type/Price correction subsets; audit-chain export/backup integrity, decision-only HTML reporting, weekly fail-closed behavior and some analytics have CI evidence. **Not all approved historical correction categories or analytics clauses reconciled/accepted**. Do not treat UNKNOWN as zero or CI as installed acceptance.
- **OPEN:** C8-B explicit scope/authorization for timestamp, fill price/quantity, ownership/links and other historical corrections, migration/rollback; C9-B requirement-by-requirement analytic gaps; complete isolated B→C Windows DEMO transfer with verified database isolation, selected GC/negative tests, completed Review readback, user signoff. No current Package C installer/Windows PASS or merge authorization shown by checked checkpoint.
- **Remaining roadmap:** all approved Master Requirements/addenda and **all twelve Future Roadmap categories** remain operative, including unfinished full All-Inputs Field Manager, Custom Fields, audited correction and weekly learning. Setup Playbook PROPOSED and NinjaTrader Import CONDITIONAL absent separate approval. No old requirement is closed merely by this index.

## 3. Canonical source trail — read only what the task needs
1. [Current PUBLIC checkpoint register](PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md) — latest checkpoint first (read end/tail), then relevant prior evidence.
2. [Master transfer, Package B→C (2026-11-22)](PTJ_MASTER_TRANSFER_PUBLIC_SOURCE_B_TO_C_2026-11-22.md) — decisions, accepted B scenarios, remaining scope and data safety.
3. Approved **Project Sources**: `GLOBAL_PROJECT_CONTINUITY_POLICY_v1.2.md`, `PTJ_COHESIVE_DELIVERY_POLICY_v1.0_2026-11-06.md`, complete Master Requirements MR-1.0–MR-1.12 plus MR-1.13–MR-1.19/addenda, `PTJ_MASTER_PRODUCT_ROADMAP_2026-10-10.md`, `PTJ_QUICK_WORKFLOW_COMPLETE_ROADMAP_AND_HANDOFF_v1.1_2026-10-26.md` and frozen decisions. Project Sources filenames are **reference identifiers**, not claims that copies exist on this PUBLIC branch.
4. PRIVATE historical governance **READ-ONLY**, only when needed: branch `docs/continuity-gate-2026-10-13` files `docs/PTJ_PROJECT_INDEX.md`, `docs/PTJ_CURRENT_STATE.md`, `docs/PTJ_REQUIREMENTS_STATUS.md`. Historical snapshots do not override newer PUBLIC approvals/evidence.
5. For implementation questions, inspect only affected PUBLIC source, diffs, exact-SHA CI, and user Windows evidence. Main is **not** assumed latest.

## 4. Stable material checkpoint / recovery rule (Global Continuity v1.2)
- **Trigger ONLY on material change:** approved/frozen decision, cohesive milestone, consequential failure/risk, gate transition, or handoff. Do not checkpoint every message, field edit or cosmetic fix.
- Append a **compact dated delta** to the **existing** `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md` (unless a later explicitly approved canonical checkpoint supersedes it); keep this START_HERE short and update its latest verified pointers when a material state changes. No duplicate master-state/handoff files per minor event.
- Record: checkpoint ID/date/timezone; approved scope and requirement IDs; branch + **full source SHA** and exact changed files; preserved PASS; source/CI/Windows/user acceptance **separately** as PASS/FAIL/BLOCKED/UNKNOWN; migration/data/backup risks; unsaved assets; exact next approved action. Distinguish a docs-only commit SHA from a source-test SHA.
- **Write → independently GitHub fetch/read-back → confirm blob/content and branch full commit SHA**. Only then mark VERIFIED. Otherwise mark UNSAVED/UNVERIFIED and preserve a portable recovery note; Git hash/CI artifact is not a standalone backup of local SQLite, attachments, screenshots or installer.
- At each new chat: START_HERE → live public HEAD/PR/CI → latest checkpoint → only applicable requirements/evidence → identify UNSAVED/UNKNOWN → resume explicitly approved action. Never merge or modify PRIVATE, protected original user data, migrations or frozen requirements without required authorization.

## 5. Exact next approved project action
Resume on live PUBLIC product branch/PR #17, **not** this documentation branch. First reconcile C8-B historical correction whitelist and authorization, C9-B analytics gaps, and remaining actual B defects using existing evidence; keep A/B accepted tests. Complete a cohesive approved source package and targeted CI, then **one** isolated Windows DEMO and user acceptance when authorized. Do not start implementation as part of this documentation-only recovery setup.

## 6. Recovery gaps at bootstrap
- The **verbatim former/older Project Instructions** were **not available as an authenticated complete historical text** in this operation; **no incomplete text has been published under a misleading “full archive” title**. Preserve originals wherever they currently reside; exact complete source is required before creating that archive.
- No independent backup/read of the user's Windows SQLite database, attachments, local installers, or screenshots was made in this documentation task. These are **external recovery dependencies**, not GitHub-saved assets.
- This snapshot establishes a durable entry point **only after its GitHub write and independent read-back**; it does not certify all historical documents, acceptance cases or local data are redundantly backed up.
