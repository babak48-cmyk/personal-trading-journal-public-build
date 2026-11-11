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
