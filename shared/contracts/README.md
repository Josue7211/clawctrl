# Notes API contract

[notes.openapi.json](notes.openapi.json) is the authoritative OpenAPI 3.1 contract
for listing, creating, reading, and updating vault notes. It describes the existing
SQLite owner and routes; it creates no second store. Notes quick capture uses the
same PUT as a normal create. The general `/api/quick-capture` inbox is separate
(F07). [R05 device connections](../../docs/mobile-connectivity.md) add revocable Notes-only credentials; an iPhone app remains I01–I04.

## Ownership and checks

- `src-tauri/src/notes_contract.rs` validates PUT bodies against this exact schema.
- `src-tauri/src/routes/vault_note_write.rs` owns conditional writes and receipts;
  the existing vault helpers own folders, search, versions, and audit records.
- `frontend/src/features/notes/notes-api.generated.ts` contains generated wire
  types. `types.ts` adds only desktop cache/UI fields; `storage/vault.ts` consumes
  the generated request/response shapes.
- `scripts/notes-contract.mjs` generates types and validates review exchanges.
  The sample note lives in the contract, not a second hand-maintained fixture.
- Real HTTP tests use full migrations and disposable SQLite; list discovery is
  disabled in test builds so they never import a personal Obsidian vault.

After editing the schema, run `npm run contract:generate`. `npm run check:contracts`
checks exact generated output, validates examples, and rejects incompatible
response/request fixtures. It runs inside `npm run check` and both native CI jobs.
`npm run test:backend` checks real handler responses; `npm run review:features`
checks the renderer's requests/responses against the same schema. Generated public
wire types are excluded specifically from Knip, without raising debt ceilings.

Generation accepts only local component references. It uses the pinned dependency
lock; it never needs remote schema URLs. The root dev tool audit currently reports
three moderate advisories through openapi-typescript → Redocly → minimatch
(GHSA-g3hv-75wg-m249). This generator receives repository-owned JSON and no supplied
glob configuration; dependencies are development-only. Revisit when upstream
updates its compatible Redocly dependency. Production frontend uses generated
TypeScript only; Rust schema retrieval features are disabled.

## Routes, identity, and authentication

| Operation | Route | Success data |
| --- | --- | --- |
| List | `GET /api/vault/local/documents` | `{ notes: NoteDocument[], attachments: object[] }` |
| Read | `GET /api/vault/local/doc?id=<encoded-id>` | `NoteDocument` |
| Create/update | `PUT /api/vault/local/doc?id=<encoded-id>` | `{ id, rev }` |

Success uses `{ ok: true, data: ... }`. The compatible
`/api/vault/local/documents/:id` read/write alias delegates to the same handlers;
encode the entire ID as one segment. Device credentials use only the query-form
route; aliases remain desktop-only. Query-form IDs are the preferred client path.
IDs are stable, case-sensitive strings, not filesystem paths or rewritten slugs.
New writes require a nonblank ID, at most 4,096 characters, without `..`, NUL, or a
leading `_`. Folders and titles do not change identity. Attachment payloads remain
outside this first contract.

Production desktop middleware requires `X-API-Key` and an authenticated,
MFA-verified server session. A key alone is insufficient. The existing vault is
shared within one local application database; this is **not per-account note
isolation**. R05 adds a separate, expiring Notes-only bearer credential with
per-device revocation; never send the desktop key to a phone. See the linked R05
guide for exact scopes, host residency, issuance, and live-proof limits.
Desktop authentication retains its plain-text 401/403 rejections; device
authentication returns the JSON error envelope. Application
400/404/409/500 errors use `{ ok: false, error, code }`. Axum's malformed query/JSON,
body-limit, and content-type errors can be plain text as described in the schema.

## Conditional writes and retries

Create with a client-chosen stable ID and `content`; omit `_rev`. Updates send the
current `_rev` returned by read/list/write. Treat revisions as opaque strings. PUT
replaces note content and metadata rather than applying a partial patch: editing
clients should send the current document with their changes. Server timestamps
and revisions are authoritative. Omitting an existing note's revision, using a
stale revision, or attempting to recreate a deleted ID returns HTTP 409. Retries without an operation ID therefore fail with 409 after a successful commit
rather than reapplying an uncertain write.

For durable retry acknowledgement, include an `operation_id` (1–128 ASCII letters,
digits, `_`, `.`, `:`, or `-`). Persist the ID and the complete request snapshot
**before sending**. On timeout/reconnect, resend the same note ID and JSON values
with that operation ID. Object key order is ignored; changing timestamps, revision,
metadata, content, or any other request value changes the operation.

A successful operation stores its request checksum and original `{ id, rev }`
acknowledgement in SQLite, keyed by authenticated user and operation ID. An exact
retry returns that acknowledgement without writing again, even after later edits,
delete, or a backend restart. That acknowledgement describes the original save,
not necessarily the current note; read again to obtain current state. Reusing the
operation ID for another body or note returns 409. A rejected/rolled-back operation
has no receipt. After resolving a conflict, persist a new request and operation ID.

SQLite reserves the writer before reading revisions/receipts (`BEGIN IMMEDIATE`).
Note, folders, FTS, coalesced versions, audit, and receipt commit together. Canonical
PUT timestamps strictly advance even within the same millisecond. Simultaneous
updates from the same base have one winner and one explicit conflict. These rules
cover the canonical PUT; imports, restore/trash, suggestions, and collaboration
mutations retain their existing behavior and need separate concurrency slices.

Desktop drafts retain their base revision across refresh/restart. A 409 retains
the draft, rejects the save, and shows the error under Note status / queued edits.
Review/copy the queued text before discarding it and loading the current version;
merge deliberately before saving. Old drafts without a recorded base do not gain
a fresh revision merely by loading newer data. Legacy CouchDB imports reload
canonical SQLite documents before exposing them for editing. This package adds
no automatic merge, remote sync service, or mobile outbox; I03 owns durable mobile
requests and retry scheduling.

## Migration and recovery

Migration `0029_note_write_receipts.sql` adds one table; existing note IDs, content,
versions, and revision format are retained. Receipt rows contain checksums and
acknowledgements, not note bodies or tokens. They intentionally survive note
delete and have no automatic expiry. Do not prune them while a client may retry;
a future retention protocol must define that boundary explicitly.

Take the usual offline database backup before rollout. An older client must reload
a canonical revision before editing. For a source rollback, retain migration 0029
and its ledger entry while reverting handlers/types; do not launch an unmodified
older migration set against the upgraded database or delete receipt history to
make it fit. A pre-upgrade backup restores pre-upgrade state and loses newer
writes. Existing vault export/import does not transfer receipts, so replay safety
is not promised across a backup import or database replacement (Q06). Full release
and backup recovery remain their own delivery packages.
