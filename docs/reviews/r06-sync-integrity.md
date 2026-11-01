# Sync integrity and feature bug review

Q00 first slice addresses BUG-001 through BUG-004 in the
[bug register](../bug-register.md). Acceptance: failed health probes and unuploaded
mutations never report success; pending operations survive queue pressure and
restart, and one malformed payload does not block unrelated valid uploads.

## Reproductions before the fix

New tests ran against the unchanged production implementation first:

- HTTP 403 incorrectly returned healthy. The health regression exited 101.
- An unsupported table and rejected row ID gained success timestamps without an
  upload; the persisted state comparison failed after reopening SQLite.
- Appending to 10,001 queued entries left 9,002 instead of 10,002.
- Malformed JSON returned `bad sync payload` before later valid uploads.

The three queue regressions failed together; Cargo exited 101. This establishes
the defects in source, not a measurement of historical user data loss.

## Changes and verification

- Health accepts only successful HTTP responses. It remains a REST-root transport
  and credential check, not a table, schema, RLS or feature-readiness certificate.
- Unsupported tables and rejected IDs stay pending with their payloads retained.
  They are never sent outside the existing table/ID guards.
- Pending entries are no longer deleted above the old 10,000-operation threshold.
- Malformed JSON stays pending and does not abort uploads of later valid entries.
  Transient HTTP failures remain retryable; accepted uploads are acknowledged.

Focused verification passed: 11 sync tests and eight Supabase client tests.
The new health test serves real loopback HTTP responses for 200, 401, 403, 404,
429, 500, 502, 503 and 530 using fake credentials. Queue tests use the checked-in
queue schema in temporary SQLite files, reopen the database for persistence
checks, and exercise successful and failed uploads against a loopback HTTP server.

The full local `npm run check:all` gate passed: 736 backend tests (two existing
opt-in tests ignored), 4,158 frontend tests across 257 files, two Node contract
checks, formatting/selected Clippy gates, architecture/type/dead-code checks,
production build, bundle budget, and desktop compilation. Structured results are
in [the verification summary](r06-results.json). The source revision is recorded in the
[implementation ledger](../implementation-map.md#verification-and-completion-ledger).

## Rendered review

All seven `npm run review:features` scenarios passed. The added Settings scenario
uses the real React UI and isolated fixture responses: configured-but-offline →
ready after recheck → offline after another failed provider state. No unexpected
browser errors or unmodeled requests occurred; forwarded requests reached only
the local review frontend. Both screenshots were visually inspected.

- [Configured provider offline](r06-supabase-offline.png)
- [Recovered provider](r06-supabase-recovered.png)
- [Recording](r06-provider-health.webm)
- [Browser and network diagnostics](r06-browser-results.json)

These UI responses are fixtures. Production health classification is covered by
the Rust HTTP regressions; the renderer review does not contact the configured
Supabase origin, validate its schema, start a native desktop app, or install iOS.

## Remaining work and compatibility

No database migration or route/authentication change is required. Deploy through
the existing application update process after review; this branch has not changed
running infrastructure or real databases. Reverting the code reintroduces the
old destructive queue limit, so preserve pending operations before rollback.

This fix cannot recover queue entries previously deleted or falsely acknowledged.
It does not enable Career/Growth uploads: their schema/allowlist compatibility is
BUG-006. Cache compatibility, atomic feature writes, pagination and native
transport remain open. Unsupported/malformed entries remain pending for repair.
Queue size can grow during extended outages; future monitoring, bounded draining,
and capacity controls must preserve unsent changes rather than deleting them.

The next Q00 slice is table/schema compatibility, starting with Career/Growth and
cache, followed by transactional outbox writes and stable pagination. Other
features retain their own workflow and failure/recovery checks in the register.
