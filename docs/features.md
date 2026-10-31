# Feature map

Use this map to find an existing implementation before creating a new path.
macOS and Linux share the React frontend and Rust backend. Feature README files
hold their scope, verification, and remaining organization work.

| Feature | Current frontend entry / owner | Rust routes / backend |
| --- | --- | --- |
| Notes | `features/notes/README.md`; route `pages/notes/Notes.tsx` | `routes/vault_local.rs`, `routes/vault.rs` |
| Personal home and dashboard | `pages/Personal.tsx`, `pages/Dashboard.tsx`, `features/dashboard`, `components/widgets` | `routes/status.rs`, individual widget services |
| Chat and projects | `pages/Chat.tsx`, `pages/chat`, `features/chat`, `chat/t3-adapters` | `routes/chat.rs`, `routes/workspace.rs`, `routes/claude_sessions.rs` |
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

Frontend paths in this table are relative to `frontend/src`; Rust paths are
relative to `src-tauri/src`. The Notes row is consolidated. The other rows are
maps of the current layout, not claims that their cleanup or feature parity is
finished. Existing parity runbooks remain in `docs/`.

## Development agreement

1. Pick one feature and one visible behavior. Write its acceptance check first.
2. Use `npm run dev` from the repository root and keep the app open while editing.
3. Keep new code with the feature; reuse the existing shared API client and Rust routes.
4. Run the feature's tests and try the behavior in the app, including failure or empty states affected by the change.
5. Run `npm run check:all`, update the feature's remaining work, then move on.

Do not add another frontend, backend process, platform target, or competing data
path as part of routine feature work. A new platform or service needs a concrete
feature requirement. Keep the default command the same across macOS and Linux.
