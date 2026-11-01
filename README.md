# clawctrl

clawctrl is the local-first desktop control plane for the homelab, Hermes,
memd, agent sessions, notes, reminders, Proxmox, Portainer, and related personal
operations.

The primary desktop targets are macOS and Linux. A viable iOS app is also a
product requirement, currently unimplemented; see the iOS work packages in the
[implementation map](docs/implementation-map.md#ios-packages). Use this Git
repository as the source of truth and one local checkout on each machine. No
particular drive or mount path is required. `clawctrl` is the product identity.

## Active Surface

- `frontend/`: React desktop UI.
- `src-tauri/`: Tauri backend, local APIs, persistence, secrets, and service
  adapters.
- `shared/`: runtime provider catalogs and shared app data.
- `scripts/`: verification and live certification scripts.
- `docs/`: current architecture, parity, and Hermes runbooks.
- `.memd/`: project memory/bootstrap bundle used by Codex, Hermes, and other
  agent harnesses.

## Develop

Install Node.js 24 LTS and Rust stable, plus the
[Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/) for your
OS. Install the Rust check tools with `rustup component add rustfmt clippy`.
macOS desktop development only needs Xcode Command Line Tools. iOS builds
require full Xcode and a configured mobile app target; the commands below launch
the existing desktop app.

```bash
npm run setup
npm run dev
```

`dev` opens the real desktop app and starts its frontend and local Rust backend.
Keep it running: React changes update through Vite, and Rust changes rebuild and
restart the app. Stop with Ctrl-C. The initial Rust build takes longer because it
compiles native dependencies.

Use the same commands from the repository root on both operating systems:

```bash
npm run check
npm test -- src/features/notes
npm run check:all
npm run build
```

`check` runs architecture, TypeScript, and dead-code checks without requiring a
production build. `test:backend` executes the complete deterministic Rust suite,
including session security. `check:rust` checks Rust formatting and runs Clippy
with correctness and suspicious lints treated as errors. `check:all` runs those
checks, both test suites, the frontend build and bundle budget, and Rust desktop
compilation. CI runs that same
full command on macOS and Linux. `build` creates the desktop release for the OS
you are using. See [backend verification](docs/backend-testing.md) for the test
inventory, environment isolation, opt-in checks, and CI caching.

Use `npm run review:install` once to install Chromium for review, then
`npm run review:features` to capture isolated Notes/Chat interactions, screenshots,
recordings, and browser/network diagnostics. CI runs this renderer review in its
own job and attaches the results to the checks. See [feature review](docs/feature-review.md).

`frontend:dev` remains available for browser diagnostics. The normal development
entry point is `dev`, so native APIs and the local backend are present.

Development sessions resume from an encrypted snapshot whose wrapping key stays
in the OS credential store. Startup verifies restored credentials with the auth
provider. Missing/unavailable protected storage or failed restore verification
requires a fresh login. Logout clears the saved snapshot before reporting success.
The previous plaintext development-session table is discarded during upgrade.

## Work on one feature

Select the next package from the [implementation map](docs/implementation-map.md),
locate its existing owners in the [feature map](docs/features.md), then read the
feature's README. Define one visible behavior and its acceptance check. Implement
it in the existing feature, try it in the running app, and run its existing tests before
the full checks. Record unfinished work in that feature's README or existing
roadmap and record completion in the implementation map. Finish the current
package's acceptance check before selecting another.

Notes is the first consolidated feature: its UI, state, storage, and tests live
in `frontend/src/features/notes/`. The page under `pages/notes/` only connects the
route. Other features retain their existing locations while they are migrated
one at a time; the map identifies those locations.

## Runtime Notes

- memd state must come from the repo `.memd` bundle before transcript recall.
- Hermes uses the clawctrl/memd bootstrap path for project memory and agent
  context.
- Generated runtime memory pages under `.memd/state`, `.memd/wake.md`,
  `.memd/mem.md`, and related compiled outputs are intentionally ignored.

## Docs

- [Implementation map and next work](docs/implementation-map.md)
- [Feature bugs and verification queue](docs/bug-register.md)
- [Feature map](docs/features.md)
- [Architecture](docs/architecture.md)
- [Notes device connections and backend residency](docs/mobile-connectivity.md)
- [Repo baseline](docs/repo-baseline.md)
- [Hermes infrastructure map](docs/hermes-infra-map.md)
- [Hermes Mac services runbook](docs/hermes-mac-services-runbook.md)
- [Notes parity roadmap](docs/notes-parity-roadmap.md)
- [Proxmox parity matrix](docs/proxmox-parity-matrix.md)
- [Portainer parity matrix](docs/portainer-parity-matrix.md)
