# PTJ VISUAL BASELINE FREEZE — 2026-11-21
Checkpoint ID: PTJ-VISUAL-ROLLBACK-BASELINE-BEFORE-THREE-TEMPLATES-2026-11-21

## Frozen accepted look
- The **installed and user-launched Package B isolated Windows DEMO** remains the exact unchanged visual/functional fallback, frozen in PUBLIC repository branch `baseline/ptj-package-b-installed-demo-2026-11-21` at SHA **`cea0d87b7c95f532c0a6324fe5d91cf72ba69670`**. The baseline branch was created directly from this SHA before any 3-template source change. Do NOT advance this branch.
- Exact prior Windows installer: `Personal Trading Journal Package B DEMO_1.9.6-beta.1_x64-setup.exe`, EXE SHA256 `359AA7CFA9D6704447A99A70203C9A12C2391886E24080338BAC3D3FCEAB6C36`, 3,753,757 bytes, Actions run `44852000798`, artifact `14685782110` with 7-day retention. EXE build PASS; user reported installed/launched, not full feature accepted. An artifact's expiration will not invalidate the immutable git SHA; preserve installer locally if desired.
- Earlier successful source CI for initial Package B: `7e59d05502c981e70dce42f6f1a1e1f4500f02a8`, run `44851945029` frontend+Windows Rust PASS.
- Subsequent *uninstalled* source-only fix for Review Pending Open review navigation: commit `1a8d5e6ac8035ff27b85e96298026aca6156324d` on feature branch. **Not part of installed baseline.** Visual development starts after this fix on new branch `feature/ptj-three-visual-templates-2026-11-21`; track this distinction.
- User reported current installed trade Gross Realized +$200, Closed, Open qty 0, Net R unknown, Review Pending Open review jump issue. User later confirmed Review completion through lower page. These reports do not imply the installed Open review shortcut itself was fixed.

## Approved add-on scope
- Three selectable display presets: CURRENT original **byte-identical legacy CSS appearance**, PROFESSIONAL raised subtle KPI cards, QUICK_HIGHLIGHT stronger contrasting cards and clearer metric icons.
- Existing System/Light/Dark, Warm/Cool/Neutral, Font family/size, Accent settings remain and apply across presets with same values. One-click switch and persistent choice. No performance/edge claim.
- Presentation only: preserve React events, lifecycle, persisted Trade/Decision/Fill/Risk, Review, account metrics, cost unknown, derived calculations. No SQLite schema or Rust ledger modifications, migrations, private repo writes, merges, installations or user data operations.
- Limit initial visuals to trade/entry KPI panels, summary, Review Pending and their cards. No global layout overhaul. If visual result fails, select CURRENT (immediate style rollback), or return to frozen baseline branch/SHA before further work, WITHOUT overwriting DB. Preserve new app profile separately from historical production.
- Status PROPOSED DESIGN USER-APPROVED, not implemented or Windows-accepted until independently verified.

## Guardrails
- Preserve user-approved Package B baseline and all 12 roadmap categories. Do not mark Package B ACCEPTED due to appearance work.
- Changes are isolated to PUBLIC branch, pending CI. No separate installer requested; build candidate only when useful and authorized after source review.


## Implementation checkpoint — visual templates v0.1 (2026-11-21)
- **Work branch:** `feature/ptj-three-visual-templates-2026-11-21`; last verified application source SHA `ec6feccd13d964a690ff07325e9300bb54107cd2` (not built/installed). The original fallback remains unchanged at `baseline/ptj-package-b-installed-demo-2026-11-21` SHA `cea0d87b7c95f532c0a6324fe5d91cf72ba69670`. The installed baseline also predates the pending Review Pending navigation improvement on which this visual branch was based.
- **Implemented:** frontend-only visual preset `CURRENT|PROFESSIONAL|QUICK_HIGHLIGHT`, backwards-compatible `normalizeAppearance` default `CURRENT` for existing settings; persisted by existing `appearance_preferences_v1` JSON `save_appearance_preferences` command (Rust validates existing keys and preserves extra JSON; no schema migration). Warm/Cool background, font family, font size, theme and user accent share existing controls across all 3. Topbar one-click switch + Appearance selector; no trade form changes.
- **Scope:** scoped to pre-entry risk/reward KPI strip, saved trade execution KPI strip and Review Pending cards. Existing numeric field calculations and unknown-value semantics are unchanged. Semantic green/red/amber borders for verified gross P&L, risks and unknown, no fabricated net R. CSS `data-visual-preset="current"` has no KPI overrides; original styling remains.
- **Files modified/added relative to pre-visual source:** `app/src/appearance.ts`, `app/src/App.tsx`, `app/src/styles.css`, `app/src/visualPreset.test.ts`, updated existing appearance tests, and one CI branch filter. `app/src-tauri/**` unchanged; no DB migration, no private repo writes, no merge, no user file operation or installer.
- **Test gate:** first CI exposed old exact-object tests missing new key, fixed; next run exposed strict TypeScript undefined possibility for gross P&L display, fixed without changing calculation. On `44901669294`, frontend tests + TS/Vite observed SUCCESS; native Windows Rust still IN PROGRESS at time of checkpoint, must independently verify later. Previously accepted Windows-installed DEMO remains operational and untouched.
- **Remaining:** exact source Frontend/Rust CI complete readback, Windows visual/UX verification on a deliberately separate candidate if approved, user acceptance and explicit authorization for any later merge/install. No acceptance claim before these gates.
