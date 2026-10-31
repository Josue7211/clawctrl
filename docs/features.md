# Feature map

Use this map to find an existing implementation before creating a new path.
macOS and Linux share the React frontend and Rust backend. iOS is a required
additional client and does not yet have a viable implementation. Feature README
files hold their scope, verification, and remaining organization work.

| Feature | Current frontend entry / owner | Rust routes / backend |
| --- | --- | --- |
| Notes | `features/notes/README.md`; route `pages/notes/Notes.tsx` | `routes/vault_local.rs`, `routes/vault.rs` |
| Personal home and dashboard | `pages/Personal.tsx`, `pages/Dashboard.tsx`, `features/dashboard`, `components/widgets` | `routes/status.rs`, individual widget services |
| Chat and projects | `features/chat/README.md`; `pages/Chat.tsx`, `pages/chat`, `chat/t3-adapters` | `routes/chat.rs`, `routes/workspace.rs`, `routes/claude_sessions.rs` |
| Agent sessions and harness | `pages/sessions`, `pages/Harness.tsx`, `pages/harness`, `features/sessions`, `features/harness` | `routes/harness_data.rs`, `routes/hermes_control.rs`, `routes/agent_shell.rs` |
| HomeLab and remote access | `pages/homelab`, `pages/remote` | `routes/homelab.rs`, `routes/vnc.rs`, `routes/terminal.rs` |
| Messages | `pages/Messages.tsx`, `pages/messages`, `features/messages`, `hooks/messages` | `routes/messages.rs` |
| Email | `pages/Email.tsx`, `pages/email` | `routes/email.rs`, `routes/mail_accounts.rs`, `routes/mail_policy.rs` |
| Career and growth | `pages/JobHunter.tsx`, `pages/GrowthOps.tsx`, `features/career-ops`, `features/growth-ops` | `routes/career.rs`, `routes/jobs.rs`, `routes/growth.rs` |
| Training | `pages/Training.tsx`, `pages/TrainingPublicIntake.tsx` | `routes/training.rs` |
| Media and music | `pages/MediaRadar.tsx`, `features/media-radar` | `routes/media.rs`, `routes/koel.rs` |
| Tasks, calendar, timer | `pages/Todos.tsx`, `pages/Calendar.tsx`, `pages/Pomodoro.tsx`, `features/pomodoro` | `routes/todos.rs`, `routes/calendar.rs`, `routes/reminders.rs` |
| Missions, approvals, pipeline | `pages/Missions.tsx`, `pages/approvals`, `pages/Pipeline.tsx`, matching `features` folders | `routes/missions.rs`, `routes/approvals.rs`, `routes/pipeline` |
| Memory and knowledge | `pages/Memory.tsx`, `pages/KnowledgeBase.tsx`, `features/knowledge` | `routes/memd.rs`, `routes/memory.rs`, `routes/knowledge.rs`, `routes/rag.rs` |
| Settings and setup | `pages/Settings.tsx`, `pages/settings`, `components/wizard` | `routes/preferences.rs`, `routes/setup.rs`, `routes/wizard.rs` |
| iOS app | No configured app target or usable mobile release; milestones below | Shared API contracts and mobile authentication/connectivity still need definition |

Frontend paths in this table are relative to `frontend/src`; Rust paths are
relative to `src-tauri/src`. The Notes row is consolidated. The other rows are
maps of the current layout, not claims that their cleanup or feature parity is
finished. Existing parity runbooks remain in `docs/`.

## iOS app: required, not yet implemented

A usable iPhone app is a high-priority product gap. A browser preview helps review
changes but does not fulfill this requirement. Keep macOS and Linux as the primary
desktop targets while making iOS a supported client of shared feature contracts.

Current evidence:

- The repository has no configured iOS app target or iOS CI/release workflow.
- The existing iOS Shortcut guide is historical integration material, not an app.
- The desktop frontend assumes a local backend for core feature routes, and the
  Rust startup includes desktop-specific behavior. These boundaries need an
  explicit mobile design before reuse.
- The active local toolchain provides Command Line Tools but cannot currently
  resolve the iOS SDK or simulator tooling. Verify full Xcode before native work.

Milestones, in dependency order:

1. Compare a Tauri mobile client with a native SwiftUI client, using Systema's iOS
   project as a reference. Validate one real workflow before choosing the client
   stack; code reuse alone is not the acceptance criterion.
2. Define shared API and data contracts, secure device authentication, backend
   discovery/configuration, and what remains available when the desktop is asleep
   or the network is unavailable. Desktop process and filesystem integrations stay
   behind desktop services.
3. Build an installable first slice with connection/sign-in, phone navigation, and
   one agreed core workflow such as quick capture and reading/editing a note.
   Verify restart persistence, network failure, retry, and device revocation.
4. Add the next selected workflows, such as reminders, chat, and agent approvals,
   through the same contracts. Design touch interaction, safe areas, the software
   keyboard, accessibility, and background/foreground recovery for iPhone.
5. Add automated mobile checks, signed builds, and TestFlight delivery so changes
   can be installed and reviewed from the user's phone. Verify a real-device
   update preserves account state and local data.
6. Add notifications, deep links, and share-sheet capture after the core workflows
   and delivery path are reliable. Define each platform capability explicitly.

Initial acceptance: a TestFlight-installed app completes its selected workflow
against the intended backend, survives restart and connection loss without losing
local edits, and can receive the next verified build. A simulator screenshot or
successful compilation alone does not establish viability.

## Systema patterns to adapt

Systema is a reference for simplifying feature ownership, cross-device behavior,
and delivery. Evaluate these patterns in the existing React/Rust architecture;
framework comparison alone does not address the complexity problem.

- **Explicit responsibilities:** Systema separates `SystemaCore`, `SystemaSync`,
  `SystemaSources`, `SystemaUI`, and `DecoKit`. In Clawctrl, keep pure feature rules,
  persistence/sync, platform adapters, and UI distinct within their existing owners.
  Small features do not need a separate package for every responsibility.
- **Durable offline writes:** use stable operation IDs, local persistence, retry,
  and visible rejection states for eligible personal-data operations. Build on the
  existing Notes drafts and sync ledger. Infrastructure commands need their own
  execution and authorization guarantees before any automatic retry is allowed.
- **Shared contracts:** version the API shapes used by desktop and iOS and check
  contract drift. Systema's committed OpenAPI document and reference drift check
  illustrate the approach; retain the existing Rust backend.
- **Isolated previews:** Systema uses an in-memory store and sample fixtures with
  an unreachable preview backend. Strengthen Clawctrl's existing demo mode into
  deterministic feature scenarios that cannot change personal services.
- **Repeatable verification:** adapt golden event/replay tests for retry and
  ordering-sensitive behavior, plus UI snapshots at large text sizes and reduced
  motion. Preserve the existing behavioral tests.
- **Mobile device lifecycle:** use enrollment, revocation, protected token storage,
  foreground reconnect, and change notifications through the existing auth and
  transport owners. Native source adapters should be replaceable with test fakes.
- **Consistent UI and delivery:** consolidate existing UI/theme primitives, reuse
  shared feature contracts across device-specific layouts, and adapt the explicit
  archive/upload workflow in `scripts/testflight.sh` when the iOS target exists.
- **Bounded milestones:** use one feature contract, one data owner, and one visible
  acceptance check per slice. Systema's spec and lineage document the value of a
  daily workflow and the cost of expanding infrastructure before use.

Reference inspected: `aaparcedo/systema` revision
`186545913f11143ee057132fd86535b9e8902c77`. Its current `CLAUDE.md` says GitHub
Actions is disabled; the checked-in workflow files are reference implementations,
not evidence that those checks currently run. This comparison records adaptation
targets, not completed Clawctrl functionality or a new mobile framework decision.

## Development agreement

1. Pick one feature and one visible behavior. Write its acceptance check first.
2. Use `npm run dev` from the repository root and keep the app open while editing.
3. Keep new code with the feature; reuse the existing shared API client and Rust routes.
4. Run the feature's tests and try the behavior in the app, including failure or empty states affected by the change.
5. Run `npm run check:all`, update the feature's remaining work, then move on.

Do not add another frontend, backend process, platform target, or competing data
path as part of routine feature work. A new platform or service needs a concrete
feature requirement. iOS is explicitly required above; implement it through the
shared contracts and its own verified client milestones. Keep the default desktop
command the same across macOS and Linux.
