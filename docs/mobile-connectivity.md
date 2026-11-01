# Notes device connections (R05)

R05 implements a Notes-only connection to the existing Rust backend. It adds no
backend process, vault, proxy, or mobile app. The native iPhone client, protected
phone storage, durable mobile outbox, and TestFlight delivery remain I01–I04.

## Ownership and host decision

Use the computer that already owns the canonical SQLite vault. The provisional
choice is the existing Mac, with its current desktop backend running. Phone access
goes offline when that computer sleeps, exits the app, or loses its network. No
second copy of the vault is created and there is no automatic failover to another
backend. The user's host choice and existing HTTPS origin still need confirmation;
no real host has been exposed or reconfigured by this package.

The existing `clawcontrol-backend` binary is the alternative for unattended use:
it runs the same `server::start(None, ...)`, Notes routes, and database. It must run
under the vault-owning OS account and the same data-root configuration
(`CLAWCTRL_DATA_DIR`, if set). `app_paths::resolve_app_data_dir()` retains the
existing current/legacy directory migration. It does not start a new phone vault.
Do not run desktop and headless listeners concurrently on the same port or point
them at different databases while calling them one shared vault. On Linux, the
owning user's credential-store/session dependencies must also be available.
Headless mode advertises itself honestly and provides no desktop UI/IPC services.
An existing always-on Linux host is an option only after explicitly selecting its
vault ownership and verifying migration/backup recovery; it is not provisioned here.

Keep the Rust listener's current loopback default. Use **existing HTTPS ingress**
that reaches the owning backend, with valid certificates and the canonical `/api`
paths. A proxy on another machine also needs a protected upstream connection;
do not send device credentials over a clear-text LAN hop. This follows the bearer
transport requirements in [RFC 6750](https://www.rfc-editor.org/rfc/rfc6750.html#section-5.2).
Browser-origin access needs an explicit `CORS_ALLOWED_ORIGINS` entry if it is not
already an accepted local/native origin. This change adds no wildcard origin,
DNS, tunnel, port-forward, deployment, or infrastructure purchase.

## Protocol and lifecycle

The authoritative wire models live in
[the shared OpenAPI contract](../shared/contracts/notes.openapi.json). The existing
[Notes revision/retry rules](../shared/contracts/README.md) apply unchanged.

| Operation | Method and route | Authorization |
| --- | --- | --- |
| Create device | `POST /api/mobile/devices`, `{ name }` | Desktop API key plus MFA-verified owner session |
| List devices | `GET /api/mobile/devices` | Same owner session/key |
| Revoke device | `DELETE /api/mobile/devices/:id` | Same owner; another owner's ID returns 404 |
| Inspect connection | `GET /api/mobile/capabilities` | Notes device bearer credential, or desktop owner |
| List/read/write Notes | R04 canonical query-form routes | Notes device bearer credential, or desktop owner |

Settings → Connections owns credential creation and revocation. Each issuance
returns a random 256-bit `ccm_v1.` credential exactly once. SQLite stores its SHA-256
hash, device ID, owner ID, display name, creation/expiry times, and revocation time.
Credentials expire after 90 days and can be revoked independently. Lists never
return a token or its hash. Copy the credential privately to the intended client;
never put it in a URL, log, screenshot, browser storage, or a shared desktop key.

Clients send `Authorization: Bearer <credential>` over HTTPS. This is an opaque
app-issued credential, not a Supabase JWT or a new OAuth authorization flow. The
mobile guard runs before existing API-key/session exemptions and permits exactly:

- GET `/api/mobile/capabilities`
- GET `/api/vault/local/documents`
- GET or PUT `/api/vault/local/doc?id=<encoded-id>`

Aliases, delete/trash/import, attachment access, device management, arbitrary files,
shells, services, auth/setup endpoints, and every other operation are denied to a
mobile credential with 403. A simultaneous desktop key or global desktop session
does not widen it. Unrelated integrations' Authorization formats retain their
existing behavior. Legacy `/api/setup/pair` credentials remain desktop compatibility
material; they are not the revocable Notes-only phone protocol.

The guard checks the database on every mobile request. Invalid, expired, or revoked
credentials return 401, with no fallback to desktop credentials or the owner's
session. Device responses are not cached; 401/403 responses carry a Bearer
challenge. Note writes recheck device status **inside** the R04 writer transaction,
before revision/receipt handling. A write already reserved before revocation can
finish first; after revocation commits, a previously authenticated principal cannot
write or replay a receipt. Previously authorized reads can finish. Desktop logout
does **not** revoke these independently issued credentials; use Revoke.

This remains one device-local vault, not per-account note isolation. A device grant
provides access to that vault's Notes, not an account-separated copy. A different
backend/database means a different vault; do not silently switch hosts.

## Runtime and connection UI

`runtime_platform` reports the native OS before desktop key bootstrap. Generic
Tauri IPC alone never establishes desktop capability. Native mobile clients do
not load, expose, refresh, or send desktop keys, and unconfigured native mobile
requests fail before any loopback fetch.

`/connect` is a connection diagnostic outside the desktop sign-in flow. Enter the
HTTPS origin and a Notes device credential. It shows backend mode/OS, supported
Notes operations, desktop-only operations, and credential expiry. It distinguishes
connected, unreachable/offline, rejected credentials, and incompatible capability
responses. Closing or reloading this diagnostic clears its in-memory credential.
It is not a shipped iOS app or a mobile Notes editor.

The canonical `lib/api.ts` transport retains desktop local-first routing. An
explicit device connection uses its selected origin, a bearer header, a narrow
method/path list, normal certificate verification, and no HTTP redirects. It does
not automatically retry mutations or persist phone credentials in Web Storage.
Only disposable loopback HTTP is accepted for local verification. I01/I02 must
supply protected native storage; I03 must persist the entire write snapshot and
operation ID before delivery. It must show the backend offline without replacing
the selected vault or claiming that queued work reached the server.

## Verification and remaining live proof

Disposable HTTP tests exercise the production authentication stack and real Notes
handlers without Vite, the owner's live session, personal data, or real credentials.
They verify owner/MFA issuance, token hashing/redaction, Notes CRUD and capabilities,
scope denial on exempt/desktop routes even with a desktop key/session, revocation,
expiry, owner isolation for device management, and revocation inside writes.
Frontend tests cover native platform distinction, stale-key protection, HTTPS and
redirect policy, offline/rejected/incompatible responses, and token non-persistence.
Browser review covers phone-width connection states and desktop create/revoke,
alongside the existing Notes/Chat/isolation cases.

The remaining R05 acceptance check requires the selected existing host's HTTPS
origin and a real intended connection path. Verify a disposable note through that
origin, revoke that device, retry and receive 401, stop/sleep the host and see
offline, then reconnect to the same vault. Record host/mode and the device result.
This has not been performed against a personal deployment. I01's fixture-backed
native foundation is independent and can proceed while this input is pending.

Migration 0030 adds only device records. Keep it and revoked/expired records when
reverting code; unmodified older migration sets may reject the upgraded database.
Backups contain credential hashes, never plaintext tokens; treat them as sensitive.
Restoring an older database can restore pre-revocation state, so revoke/reissue
connections after a restore until Q06 defines a full recovery protocol. Migration
0029 receipt-retention and vault export/import limits continue to apply. No live
vault or system credential store was changed during disposable verification.
