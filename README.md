# Public CI candidate — Personal Trading Journal

This is a source-only, independently initialized public-build candidate derived from a private project.

Source branch: `feature/gate3-inventory-coverage-2026-10-15`  
Source SHA: `9aab398839f45cf4e31afd83ca9bc92df1856297`  
Date: 2026-10-26.

**Do not** upload private source history, databases, trading records, private audit reports, older archives, installers, logs, or proprietary project planning files.

All workflows are **manual only** (`workflow_dispatch`). Run `PTJ manual checks` before the installer workflow. The installer uses the DEMO Tauri identifier, not the standard installed application identifier. A successful CI build **does not** prove Windows runtime or database isolation. Never launch Gate 3 builds against the user's live SQLite; v9 schema migration occurs on open. Use separately backed-up isolated DEMO data only after runtime safety approval.

This candidate has undergone heuristic file-content scanning, **not** an independent full-source security proof. Publication requires the repository owner's explicit final review. Public files can be copied permanently.
