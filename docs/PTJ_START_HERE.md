## Latest PUBLIC checkpoint — Strategy/Settings destination preflight (2026-11-23)

The latest independently persisted source on active PUBLIC branch `feature/ptj-c-transfer-integrity-2026-11-23` is **`e6bcf4db37771ba186a89a5f326084acdd69c3db`**, followed by docs-only checkpoint commit **`9390b4cf98fc77a7b7663b60833ce307aa1150c3`**. Canonical milestone in existing `docs/PTJ_DEMO_FINDINGS_BATCH_CHECKPOINT.md`: `PTJ-C-TRANSFER-STRATEGY-SETTINGS-PREFLIGHT-2026-11-23`. Inspect current live HEAD/PR #17/CI before any next action: these are historical pointers.

**Source change:** B→C empty-destination check now protects user-created Strategy/Version and Settings Profile/Version even if zero Session/Trade records exist, in addition to previously protected Custom Field, Setup Playbook, user-instrument and Level Source records. Native isolated regression fixture added; no migrations or user/live database changes. Source + checkpoint independently read back from GitHub. New source-equivalent CI [run 45175773609](https://github.com/babak48-cmyk/personal-trading-journal-public-build/actions/runs/45175773609) had frontend PASS, Rust in progress at checkpoint; inspect successor run if superseded by docs-only commit. Prior full ZIP-source protection is CI PASS run 45174739312, frontend and Rust.

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
