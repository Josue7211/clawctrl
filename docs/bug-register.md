# Feature bug register

Stabilization takes priority over adding more client surfaces. This register tracks
confirmed defects and the checks needed to assess the rest of the app. Package
order and completion evidence remain in the [implementation map](implementation-map.md).
Code ownership remains in the [feature map](features.md).

A passing fixture test is source verification. It does not mean a change has been
merged, installed, or verified against a configured service. Do not label a feature
broken solely because its provider is unavailable, or healthy solely because its
tests pass.

## Confirmed defects

P1 means potential loss of unsent data or false completion of a data operation.
P2 means incorrect status or a broken supported path. A source finding establishes
the code behavior; it does not establish that a particular user's data was lost.

| ID | Priority and owner | Reproduction and impact | Acceptance check | Status |
| --- | --- | --- | --- | --- |
| BUG-001 | P2 · `supabase.rs`, setup/status routes | `health_check` accepts any response except 401, including 403, 500 and 530. Setup and sync can treat a failing provider as healthy. | Loopback HTTP fixture: successful REST response is healthy; auth, throttling, and server/tunnel errors are unhealthy. | Fixed in branch · [Q00 source and rendered evidence](reviews/r06-sync-integrity.md); not deployed |
| BUG-002 | P1 · `sync.rs`, Career/Growth routes | Push marks a table outside `SYNC_TABLES` as synced without uploading it. Career/Growth writers enqueue such tables. Invalid IDs also receive a success timestamp without a request. | Unsupported tables and rejected IDs retain their original payload and pending state across backend/SQLite restart; only accepted uploads receive a positive sync timestamp. | False completion fixed in branch · [evidence](reviews/r06-sync-integrity.md); actual uploads remain BUG-006; not deployed |
| BUG-003 | P1 · `sync.rs` | More than 10,000 pending mutations causes the oldest 1,000 to be deleted. A long outage can erase unsent operations. | Persist 10,001 pending entries, append another, reopen SQLite, and verify all 10,002 remain pending and ordered. | Fixed in branch · [evidence](reviews/r06-sync-integrity.md); not deployed |
| BUG-004 | P2 · `sync.rs` | Malformed queued JSON returns early from push, preventing later valid rows from uploading on every cycle. | A malformed entry stays pending while later valid rows upload; transient HTTP failures retry and an accepted row is not uploaded twice. | Fixed in branch · [evidence](reviews/r06-sync-integrity.md); not deployed |
| BUG-005 | P1 · `sync.rs` and local feature writers | Several local writes and outbox inserts are separate commits. A crash between them can leave an edit with no replication operation. | Fail between the writes and prove state plus outbox commit or roll back together for one selected writer; expand writer by writer. | Open · Q00 follow-up |
| BUG-006 | P2 · Career/Growth, `sync.rs`, cloud migrations | Six Career and nine Growth table definitions/writers exist but are absent from the generic sync allowlist. Preserving pending entries alone does not upload them. | Compare local and deployed cloud schemas/RLS; verify create/update/delete, pull, retry and account ownership for each supported table. | Open · Q00 follow-up; deployed schema verification required |
| BUG-007 | P2 · `sync.rs`, cache schema | `cache` is allowlisted, but its local primary key is `(key,user_id)` while generic pull/upsert requires `id`. | Exercise the real cache schema through push/pull, or explicitly remove unsupported replication and document its replacement owner. | Open · Q00 follow-up |
| BUG-008 | P1 · `sync.rs` | A 500-row page uses a timestamp-only `gt` cursor. Rows sharing the boundary timestamp can be skipped permanently. | More than 500 same-timestamp rows all arrive exactly once logically, including restart between pages; use a stable compound cursor. | Open · Q00 follow-up |
| BUG-009 | P2 · `tauri.conf.json`, connection transport | Packaged `connect-src` permits self/selected loopback origins, but the device connection screen uses remote HTTPS fetch. Browser fixtures do not apply the packaged policy. | Approved remote Notes transport works in the packaged native client; unrelated destinations and credentials remain restricted. | Open · R05/I01 |
| BUG-010 | P2 · `components/Sidebar.tsx` | The post-drag click-suppression reset timer outlives Sidebar unmount. Linux CI caught its late React state update after the test window was destroyed. | Unmount after a drag leaves no suppression timer; links work again after the 250 ms suppression window. | Fixed in branch · [Q00 Sidebar lifecycle evidence](reviews/r07-sidebar-lifecycle.md); not deployed |

## Contracts requiring verification

These are architectural limits or compatibility questions, not additional
confirmed feature defects. Define the intended behavior before changing them.

| Area | Evidence and uncertainty | Required check | Package |
| --- | --- | --- | --- |
| Notes ownership | The user selected an existing always-on Linux host as the shared Notes owner; its exact machine/account/data root remain unverified. Vault tables and attachments are local, outside generic Supabase sync. | Preserve and reconcile existing datasets; prove backup restore, revision conflicts, attachment behavior and the secure client path before migration. | R05, Q06, I03 |
| Workflow notes | Local migration uses `content`; direct remote routes use `note`/`applied`. Deployed schema is not fully represented in checked-in migrations. | Compare actual Postgres schema/RLS and test the intended local/remote contract without dropping or overwriting data. | Q00, F07 |
| Offline authentication | Validated live sessions tolerate transient provider failure; cold debug restore requires online credential verification. | Test the intended offline-start and expired/revoked-session behavior explicitly; preserve the R01 protection boundary. | R01, Q05 |
| Knowledge fallback | No configured Supabase client permits local fallback; a configured but unreachable client can instead fail. | Decide whether offline reads/writes are supported; test unavailable provider, pending writes and reconnect against that contract. | F07 |
| Remote routing | Some API paths remain desktop-local; Training has separate remote selection and setup has direct fetches. | Selected backend routes each supported operation consistently; unavailable local-only features explain the dependency. | R05, F08 |
| Provider health | A successful network response is not table/schema/RLS health or a verified integration capability. | Separate configuration, transport, authorization, schema and feature-action checks; never show fabricated completion. | Q02, F08 |
| Deployment and recovery | CI does not deploy services or migrate real databases. Runbooks and service paths can drift. | Stable checkout/data roots, explicit versions, read-only health checks, clean install/update and isolated restore evidence. | D01, D02, Q06 |

## Feature verification queue

Every row is a workflow to exercise, not a claim that a new defect has already
been found. Use existing tests and owners first. For each failure, add a confirmed
entry above with a minimal reproduction before fixing it.

| Feature | First behavior to verify | Failure and recovery cases | Existing owner or evidence |
| --- | --- | --- | --- |
| Home/dashboard | Load useful daily data and navigate into its feature. | One unavailable widget must not hide independent data or display stale data as current. | `Personal.tsx`, `Dashboard.tsx`, dashboard/widgets; F01 |
| Notes | Edit, navigate away, restart and recover the note. | Save failure, revision conflict, import, trash/restore and attachment recovery; distinguish drafts from persisted data. | Notes README, R03/R04 review, Notes parity roadmap; N01–N03 |
| Chat/projects | Select a project/session, send, cancel, then switch. | Late stream/load callbacks, disconnected provider, reload and draft preservation. Selection races already have regressions; streaming is not yet certified by those checks. | Chat README, R03 review; C01/C02 |
| Agent sessions/harness | Open the selected session and follow its actual state. | Remote service unavailable, process exit, cancellation and reconnect; no false running/success state. | Sessions/harness owners; B02 |
| HomeLab/remote | Read inventory and track one permitted task. | Permission denial, provider outage, task failure/cancellation and selection changes. Use disposable fixtures before real writes. | Proxmox/Portainer parity matrices; B01/B02 |
| Messages | Load an opted-in conversation without side effects. | Unavailable bridge, account mismatch and disconnected transport. Sending/read receipts/typing require explicit live authorization. | Messages routes/hooks; F03 |
| Email | Load accounts and messages, preserve a draft. | IMAP/SMTP outage, auth failure, account switch and restart. No live send during diagnostics. | Email/mail account/policy routes; F03 |
| Career/Growth | Save a record locally and verify intended cloud persistence. | Unsupported table, schema mismatch, retry, delete and cross-account isolation. | BUG-002/006; F04 |
| Training | Complete a disposable intake and show its saved state. | Wrong backend, failed submission, duplicate retry and refresh. | Training/intake routes; F05 |
| Media/music | Search and show a provider result honestly. | Provider unavailable, missing credentials, empty result and failed action. | Media/Koel owners; F06 |
| Tasks/calendar/reminders | Create and complete one task using its designated owner. | Offline edit/retry, permission denial, timezone and provider reconnect; never send test items into personal calendars implicitly. | Todos/calendar/reminders routes; F02 |
| Missions/approvals/pipeline | Follow one item from accepted to terminal result. | Duplicate action, stale selection, permission failure and cancellation. | Mission/approval/pipeline owners; B02 |
| Memory/knowledge/capture | Save and retrieve an item from its designated store. | Configured-but-offline provider, retry, ownership mismatch and duplicate capture. | Knowledge/memory/memd/capture owners; F07 |
| Settings/setup | Save configuration and report actual readiness. | Unavailable optional provider, invalid credential, offline startup and failed save; preserve account/device scope. | BUG-001, setup/preferences owners; F08 |
| Device connection/iOS | Reach the selected Notes owner with a scoped grant. | Revoked/expired grant, unavailable host, native policy denial and reconnect. Native installation/update remains a separate acceptance check. | Connection README, R05 review; I01–I04 |

## Fix and closure rules

1. Work one named behavior at a time. Reproduce it with a failing regression or a
   recorded live check before changing the canonical implementation.
2. Exercise success, failure and retry/restart paths appropriate to that behavior.
   Keep test services, data roots and credentials disposable.
3. Run the feature checks and `npm run check:all`; record evidence and limitations
   in the implementation ledger. Real infrastructure and personal-data actions
   remain separate from fixture verification.
4. Mark source verification separately from merge, deployment and live acceptance.
   Retain unresolved dependencies explicitly. Do not rename a missing capability
   into a completed bug fix.
