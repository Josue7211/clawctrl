# Repo Baseline

This cleanup intentionally narrows the repository to the active desktop app surface:

- root package scripts and automated checks
- `frontend/` React app
- `src-tauri/` desktop/backend app
- `shared/` runtime catalogs
- `scripts/` checks used by the current workflow
- `docs/architecture.md` and this baseline note

Historical planning, generated milestone notes, old deploy/docker/supabase examples, iOS experiments, and broad legacy docs were left deleted from the working tree. They can be recovered from Git history if needed, but they are not part of the active reusable baseline.

GitHub's `codex/desktop-import` branch is the imported baseline. Local checkouts
may live on either machine without a T7 mount. Notes is the first feature
consolidated under `frontend/src/features/notes`; see `docs/features.md` for
current ownership and the incremental migration policy.

Current required checks:

- `npm run check`
- `npm run check:all` (includes tests, frontend build and budget, and Rust check)

The imported code had stale page-size limits. Existing oversized pages are
recorded at their imported sizes and may not grow; Notes' size exception was
removed after splitting its workspace and dialogs. These limits expose remaining
migration debt rather than implying that every feature has been reorganized.

Dead-code ceilings were also stale in the imported revision `7182bb7`. The
verified inherited counts are 2 unused files, 154 exports, 145 types, and 6
duplicate export aliases (feature barrel files remain excluded). Keep these as
regression ceilings and lower them during focused cleanup. Unresolved imports
and undeclared dependencies remain errors; the Notes editor's existing
blockquote import is now declared explicitly.

The original production build measures 7,040 KiB of JavaScript and its Notes
chunk exceeds the old 650 KiB ceiling. Notes dialogs now have a separate chunk,
bringing each Notes chunk below that ceiling. The total budget is 7,100 KiB to
cover the imported application and the small cost of module boundaries; the
per-chunk ceiling remains 650 KiB.
