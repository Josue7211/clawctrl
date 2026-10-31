# clawctrl

clawctrl is the local-first desktop control plane for the homelab, Hermes,
memd, agent sessions, notes, reminders, Proxmox, Portainer, and related personal
operations.

The primary desktop targets are macOS and Linux. A viable iOS app is also a
product requirement, currently unimplemented; see the iOS milestones in the
[feature map](docs/features.md#ios-app-required-not-yet-implemented). Use this Git
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
OS. macOS desktop development only needs Xcode Command Line Tools. iOS builds
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
production build. `check:all` also runs the frontend tests, builds the frontend,
checks its bundle budget, and checks the Rust desktop binary. CI runs that same
full command on macOS and Linux. `build` creates the desktop release for the OS
you are using.

`frontend:dev` remains available for browser diagnostics. The normal development
entry point is `dev`, so native APIs and the local backend are present.

## Work on one feature

Start with the [feature map](docs/features.md), then read the feature's README.
Define one visible behavior and its acceptance check. Implement it in the
existing feature, try it in the running app, and run its existing tests before
the full checks. Record unfinished work in that feature's README or existing
roadmap. Finish the current feature before starting another.

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

- [Feature map](docs/features.md)
- [Architecture](docs/architecture.md)
- [Repo baseline](docs/repo-baseline.md)
- [Hermes infrastructure map](docs/hermes-infra-map.md)
- [Hermes Mac services runbook](docs/hermes-mac-services-runbook.md)
- [Notes parity roadmap](docs/notes-parity-roadmap.md)
- [Proxmox parity matrix](docs/proxmox-parity-matrix.md)
- [Portainer parity matrix](docs/portainer-parity-matrix.md)
