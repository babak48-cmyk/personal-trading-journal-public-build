# PTJ DEMO Findings — Cohesive Batch Checkpoint
Date: 2026-11-12 Australia/Sydney
ID: PTJ-DEMO-FINDINGS-SOURCE-BATCH-2026-11-12
Repository: babak48-cmyk/personal-trading-journal-public-build (temporary public development only)
Branch: feature/demo-findings-cohesive-2026-11-12
Base: feature/package-a-evidence-decision-completion-2026-11-06
Status: SOURCE IMPLEMENTED / GITHUB READBACK VERIFIED (upon independent readback); CI UNKNOWN; WINDOWS UNKNOWN; USER ACCEPTANCE OPEN.

## Scope already implemented
- Execution panel shows backend Net Realized P&L and total known costs alongside gross and R. Unknown remains unknown.
- Backup destination selection through Settings, persisted in existing app_settings (no migration).
- Safe backup flow: create/validate internal backup first; copy to chosen directory without overwrite, checksum comparison and validation; retain internal recovery copy. Reject selected folders inside live app data, except app-managed backups.
- Internal backup filename gains millisecond precision and create_new protection; no silent overwrites.
- New targeted Rust unit tests for copied bytes, duplicate destination, unavailable destination (WRITTEN, NOT EXECUTED).
- No original event correction or fill mutation.

## Observed Windows evidence retained from user's preceding DEMO
ES 2-contract 7402 entry, one exit 7406, second exit 7410: gross $600; close/Review and restart PASS. Review Pending PASS. ES 1-contract 7400 entry, 7408 exit, stop 7396, 2.00 commission + .50 fees each side: gross $400, costs $5, shown net R 1.98; verified by user screenshots. Do not repeat unchanged scenarios.

## Explicit remaining scope
- Historic missing fill costs: requires the separately authorized audited correction design and data safety/migration gate. No direct UPDATE or new writable fill editor authorized yet.
- Exact user-approved source image for official Windows icon exists in ChatGPT attachment/export ZIP, but binary icon files are NOT yet committed to this branch, so installer/Taskbar icon is not changed.
- Custom required field alert in test was expected under user-defined requirement; do not misclassify as confirmed defect. Full Field Manager remains PARTIAL.
- Frontend tests/TypeScript/Vite, Rust tests and exact-head CI NOT VERIFIED. Native Windows installed DEMO NOT TESTED. No installer built in this batch.
- All twelve approved Future Roadmap categories retained. Setup Playbook PROPOSED and NinjaTrader Import CONDITIONAL.

## Authorization/safety
Only temporary public development branch modified. No merge, private source update, schema migration, original user DB change, destructive action, or installer deployment. Do not claim full product acceptance.

## Next
Run relevant frontend and Rust CI for full cohesive package on exact HEAD, remedy failures, integrate the exact binary icon assets (no substitute image), and plan one limited Windows acceptance when the package is ready. Audited correction remains separate design gate.

## 2026-11-12 — Recent list height regression (user screenshots)
- User observed left Recent session list growing indefinitely, lengthening app page; screenshot evidence provided in current project conversation. This is a layout/ergonomics issue, not lost trades.
- Source fix committed on the SAME active cohesive batch branch: App.tsx now uses labelled, keyboard-focusable .recentList region for all sessions; CSS limits this region to clamp(12rem,42vh,28rem) with independent vertical scrolling at desktop widths, while retaining the existing <=680px hidden Recent behavior. Main navigation remains outside list scrolling.
- Code commits: 105b562368d5c02e8ae76e703dbc32d0452211ac (markup) and 4473b0e757442c689ec94de935b9700104217436 (CSS). GitHub file readback verified for both. No session records changed, no DB migration, no new installer.
- Validation state: SOURCE IMPLEMENTED / READBACK VERIFIED; React build and installed Windows layout not yet tested. Include desktop narrow/short window, many sessions, keyboard scrolling, and primary navigation checks within next cohesive Windows acceptance; do not create a special installer solely for this cosmetic fix.

## 2026-11-12 — backup error handling, draft PR gate
- The earlier backup implementation silently skipped attachment walk errors with `filter_map(Result::ok)`; this could create incomplete backups. Changed to fail closed on unreadable attachment enumeration and unsafe path derivation, rather than omitting evidence. Commit `b4c4467a1d3f643fd87746f19e0025fc953e2f6c`.
- When copying to a user-selected folder fails, the message now explicitly preserves and reports the already validated internal backup path. Commit `8e93631ffcfbacf8b810d79e35c812108028dfa4`.
- Draft review PR #8 opened from `feature/demo-findings-cohesive-2026-11-12` into the previous feature branch. DRAFT / UNMERGED. PR URL: https://github.com/babak48-cmyk/personal-trading-journal-public-build/pull/8 . No merge authorization.
- GitHub PR-only workflow run lookup on earlier head `b4c4467a1d3f643fd87746f19e0025fc953e2f6c` returned [] and commit status lookup []; this does NOT demonstrate CI PASS. No local Rust toolchain or GitHub clone due network DNS failure. Current head CI, frontend build, Rust tests and Windows validation remain UNKNOWN.
- Remaining safety concern to inspect: failed creation of an archive may leave an incomplete `.zip` at the internal backup destination. Consider staged archive/atomic finalization before Windows acceptance.
- Approved exact icon bytes are not on branch; do not substitute or label integration completed. All previous user Windows PASS scenarios retained. Full all-input coverage and audited fill correction remain open.

## 2026-11-12 — Backup hardening and exact-head CI (material checkpoint)
Checkpoint ID: PTJ-DEMO-BACKUP-ATOMIC-VALIDATION-CI-2026-11-12
- Safe write: temporary `.partial` archive, new UUID-based filename, sync, final rename only after ZIP completion; failed archives remove only their new staging file. Commit `c810ba098a2fc76c460f81d3a38e0039d1329648`.
- Saved external destination is re-canonicalized at copy time; stale/repointed directories under live app data are rejected. Commit `911692ac8b4a781e996225ad4c77ae76dd7f572b`.
- Backup validation now enumerates archive entries, rejects unsafe or duplicate paths, reads attachment payloads to surface ZIP/CRC errors, and compares actual attachment file count with backup_info.json; legacy v1 manifest format unchanged. Commit `644088ace9e5e5d09ff4b74f68e81a85032d1b77`.
- Unit test added for missing vs present attachment in archive; source commit `0ac52208e0b1b689476952bb5ae3ec7d0e1a9d06`. Older backup destination tests retained.
- **Exact-head GitHub Actions run 43040263276 SUCCESS** for commit `0ac52208e0b1b689476952bb5ae3ec7d0e1a9d06`: frontend job SUCCESS (npm ci, Vitest, TypeScript/Vite build, DEMO config check), Rust job SUCCESS (cargo check and complete Rust library tests). Separate job results checked directly. This evidence does **not** establish native Windows installed runtime or user acceptance.
- Draft PR #8 remains unmerged; no changes to private main, schema, live trading database or existing records. Exact approved binary icon remains OUTSIDE GitHub branch; its original PNG and ICO set reside in chat-generated local package. No substitute icon, no build until asset is included.
- Targeted Windows acceptance still open for selectable Backup destination, net P&L display, Recent scrolling and eventual icon. Old user-confirmed ES execution/Review PASS remains valid.

## 2026-11-12 — Official icon exact-source transfer gate
- The user approved exactly the image named `Neon Financial Journal App Icon(1).png` (not an alternative generated or search image).
- Local source file verified: 2,558,186 bytes, SHA256 `a8d698360c4b76ee10270f0c00a3e3fc379872e5c3b0f32fd842afb934e6eb3c`.
- Local ICO for Tauri Windows: 121,621 bytes, SHA256 `1add9664f063c9c4e7ea2fbbb7257b2c6d78ea94d3c8161e9814d8def42cc1ea`, embedded sizes 16,24,32,48,64,128,256. Packaged with approved original PNG and `app/src-tauri/tauri.conf.json` in `PTJ_Exact_Approved_Icon.zip` attached to this chat.
- **NOT IN GITHUB**, because this available GitHub connector can write UTF-8 text and blobs only from material supplied in the tool request, and cannot ingest the local binary asset bytes directly; no surrogate logo or invented upload claim. Need an authorized binary transfer path before activating bundle.icon entries. No incorrect installer icon change committed.
- PR #8 body refreshed with exact hashes, CI run and review gates; remains DRAFT, UNMERGED.

## 2026-11-12 — Cohesive Zone/Field Manager increment (CI correction ongoing)
Checkpoint ID: PTJ-QUICK-ZONE-REQUIRED-PROTECTED-2026-11-12
- Static inventory review showed 65 inventoried controls, 39 candidate-for-customization, 36 actively configured visibility inputs at audit time. `candidate.trendRelationship` was initially (incorrectly) assumed editable but is explicitly `systemLocked:true, requirementManaged:false` in approved field definitions. CI run 43046548847 exposed this through four frontend tests; the invalid activation and UI customization were REVERTED. The protected field remains unchanged.
- Added shared `zoneRequiredIssues` for both initial-plan confirmation and adding a live Zone. It validates only authorized USER_REQUIRED Zone label, sources, planned conditions, invalidation, and existing price geometry; incomplete drafts remain permitted. No observed evidence is demanded at the planning stage; no original events or storage schema changed.
- Required Zone label now has visible error highlighting, focus target, and clears error on edit. Live Zone validation IDs are routed to the PLAN notebook page and tested.
- Source commits: 8683a81a3b43a2097a4b6570baf3338210006748, bd6b349708a383287465fcd86e019a37015ae4f8, 30f7ba09304c79ebdf9c213fc6a5d7dfec385bf1, fb5802b9a31d45e287dd9081adee1da379f375a2, 543b31e394887667446142317cddad901903a61b, 0b185d0ef7eea95d4b9a51f138092d40726c3294, a56aa2f1c2e7db4bc6889031773a13c7e9e7facb, 1a0489290ad13da70d83bca9a83b8083cc6eaad5, e04c29017ed1418d7f44d1c0c1c4833314174302.
- New tests: `zoneRequired.test.ts` and updated `quickValidationRoute.test.ts`. Latest CI run 43047254006 queued/pending at observation time; **NOT PASS** until independent verification. Historical successful CI runs are only evidence for their exact tested commits.
- No private repo or main write, no merge, no migration, no Windows installer. Draft PR #8 stays open/unmerged. All 12 roadmap categories remain intact; Full Field Manager PARTIAL.

## 2026-11-12 — Zone range parity and verified Field Manager CI
Checkpoint ID: PTJ-ZONE-GEOMETRY-PARITY-2026-11-12
- Prior Feature Manager controls commit `2c22b4e8da449202818d40598e40ec91ec230e20` passed GitHub Actions run **43054777536** (Frontend PASS, Rust PASS; independently read back).
- Source gap: initial Zone confirmation rejected ranges with `price_from > price_to`, but live-Zone creation did not provide equivalent frontend geometry validation. Added shared `zoneRangeOrderIssue` and invoked it in both lifecycle stages, preserving individual missing-field validation and original immutable revision semantics. Live Zone invalid ranges now highlight both range bounds, show an informative message, and route to the actual Planning form. No new observed evidence requirements, migration or data changes.
- Source commits: `708f7d43540abe48719f01801135883dea9efe01` (shared helper), `a6b5fb9373e951c9c7dfa1278e9b1f3773b58c47` (both forms), `249070b648c206109bbed83812c1fed1200173a6` (unit tests).
- Latest CI run `43060130020` launched for `249070b648c206109bbed83812c1fed1200173a6`. Frontend job SUCCESS; Rust job in progress at observation time. Until verified, overall head CI = NOT YET VERIFIED.
- Unresolved: exact binary icon integration (original user-approved design only); native Windows installed DEMO targeted acceptance (Backup, net P&L, Recent, icon); audited Fill cost corrections require separately authorized model/migration; all 12 roadmap categories including complete Field Manager remain open until accepted. PR #8 DRAFT/UNMERGED, private repo untouched.
