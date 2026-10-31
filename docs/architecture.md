# Architecture

## Frontend Boundaries

- `frontend/src/pages`: route entry points. New or migrated pages delegate to a feature.
- `frontend/src/features/<feature>`: the feature's UI, hooks, domain logic, storage adapter, and tests. Keep one canonical implementation here.
- `frontend/src/components`: UI reused by multiple features.
- `frontend/src/lib`: shared infrastructure such as the API transport, account state, and theme engine.
- `frontend/src/hooks`: existing cross-feature hooks. New feature-specific hooks belong to their feature.
- `src-tauri/src/routes`: the matching Rust API for each feature. UI code uses the shared API transport; service credentials and platform access stay in Rust.

Feature code must not import from `pages`. Extract a dependency into its feature
before using it from shared code. Keep genuinely shared utilities in `lib`;
avoid adding a registry, adapter, or wrapper that only forwards an existing call.

The [feature map](features.md) records current locations, including features that
have not migrated. Consolidate one feature at a time. Remove its old imports and
compatibility files in the same change; keep only the public route entry point.

Existing oversized pages are frozen at their imported GitHub line counts in
`scripts/check-architecture.mjs`. These are migration debt, not the target size.
New pages have a 1,200-line limit; no frontend source file may exceed 260 KiB.
Remove legacy exceptions as each feature is extracted. Notes has no exception.

Run `npm run check:architecture` after structural changes.

## Verification

- `npm run check` validates architecture, frontend typecheck, and dead-code ceilings.
- `npm run test:sessions` executes the deterministic backend session-security tests.
- `npm run check:all` adds those backend tests, the frontend suite, frontend build and bundle budget, and Tauri backend `cargo check`.
- `check:all` builds the frontend before checking its bundle budget, so it works from a clean checkout.
- Run the affected feature's tests while iterating, then verify the behavior in the running app. Use `npm run check:all` before handing off a completed feature.
