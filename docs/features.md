# Feature map

Use this map to find an existing implementation before creating a new path.
Use the [implementation map](implementation-map.md) for work order, dependencies,
acceptance checks, and completion status.
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
| iOS app | No configured target or usable release; implementation packages I01 through I06 | Shared Notes contracts and mobile connectivity are owned by R04 and R05 |

Frontend paths in this table are relative to `frontend/src`; Rust paths are
relative to `src-tauri/src`. The Notes row is consolidated. The other rows are
maps of the current layout, not claims that their cleanup or feature parity is
finished. Existing parity runbooks remain in `docs/`.

## iOS app: required, not yet implemented

A usable iPhone app is a high-priority product requirement alongside the primary
macOS and Linux desktop targets. The repository has no configured iOS target or
usable mobile release. The historical Shortcut guide is integration material.

The first mobile workflow is creating, reading, and editing a note, with offline
recovery and TestFlight updates. Execute it through R04, R05, and I01 through I04
in the [implementation map](implementation-map.md#ios-packages). The client-stack,
backend-availability, and device-verification decisions live there. A browser
preview helps phone review; it does not fulfill the iOS release acceptance check.

## Systema patterns to adapt

Use Systema's separation of core logic, sync, platform sources, UI, and design
components to simplify existing Clawctrl owners. Its durable outbox, isolated
fixtures, replay/visual tests, and TestFlight workflow inform concrete packages in
the [implementation map](implementation-map.md#systema-reference).

The implementation map records the inspected Systema revision, source references,
and adaptation constraints. Keep this file as the ownership index and maintain
execution status in that one backlog.

## Development agreement

1. Select the next implementation package and one visible behavior. Write its acceptance check first.
2. Use `npm run dev` from the repository root and keep the app open while editing.
3. Keep new code with the feature; reuse the existing shared API client and Rust routes.
4. Run the feature's tests and try the behavior in the app, including failure or empty states affected by the change.
5. Run `npm run check:all`, record evidence in the implementation map, and update the feature's remaining work before selecting another package.

Do not add another frontend, backend process, platform target, or competing data
path as part of routine feature work. A new platform or service needs a concrete
feature requirement. iOS is explicitly required above; implement it through the
shared contracts and its own verified client milestones. Keep the default desktop
command the same across macOS and Linux.
