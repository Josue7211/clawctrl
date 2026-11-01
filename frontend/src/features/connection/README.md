# Device connections

R05 acceptance: a Notes-only bearer credential reaches the existing Rust Notes API
without Vite or an owner's live desktop session, cannot access desktop operations,
and fails after revocation/expiry. The connection view shows connected, offline,
and rejected states without storing secrets in browser storage.

- `ConnectionPage.tsx`: `/connect`, outside the desktop sign-in flow; connection
  diagnostics and capability display. This is not a native iOS app or Notes editor.
- `DeviceConnectionsPanel.tsx`: desktop Settings → Connections; create credentials,
  show them once, list devices and revoke access.
- `../../lib/api.ts`: canonical transport; HTTPS origin validation, memory-only
  bearer credential, Notes-only routes, no desktop key fallback or redirect.
- `../../lib/runtime.ts`: resolve native OS before desktop key bootstrap. Generic
  Tauri IPC never proves desktop capability.
- Rust `routes/mobile.rs`: credential owner, scope guard, capabilities, and Notes
  principal; `vault_note_write.rs` rechecks revocation inside the write transaction.

Use the existing vault-owning computer. Phone access needs that host awake and its
backend reachable through existing HTTPS ingress. A host choice and real-device
proof must be recorded in the implementation map. This package provisions no
server, proxy, DNS, or tunnel, and copies no vault. A headless backend can run the
same code/database under the owning OS account; do not launch it concurrently on
the desktop backend's port. Native credential storage and the iPhone client are
I01–I04. Desktop's local-first transport remains the default.
