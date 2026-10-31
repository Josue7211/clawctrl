# Clawctrl implementation map

Build a dependable macOS and Linux app, deliver a usable iOS app, and make each
feature easier to change. This is the execution backlog. The [feature map](features.md)
locates existing code; feature guides describe local contracts; parity documents
provide detailed capability evidence.

Current active work: **R02 Execute backend tests in CI**. R01 is implemented and locally
verified in [draft PR 64](https://github.com/Josue7211/clawctrl/pull/64); merge and
current CI status remain visible there. The default first iOS workflow is creating,
reading, and editing a note; quick capture creates a note in the same vault.

## Working agreement

- Work one package, or one explicitly named slice of a package, at a time. Keep one
  visible acceptance check per PR. Finish its evidence and update its status before
  selecting the next package.
- The agent handles implementation, terminal work, tests, and screenshots. The
  user reviews from a phone. User participation is limited to product choices and
  unavoidable account authentication or installing and trying a device build.
- Keep the existing React desktop frontend, Rust backend, canonical Notes storage,
  routes, IDs, and migration history. Consolidate into existing owners and remove
  superseded paths in the same migration.
- iOS is a required product client. It can progress before all desktop features
  are reorganized. Its client stack is selected in I01; each production client has
  one implementation.
- Use shared contracts and existing platform services. Introducing another service,
  store, framework, or dependency needs a concrete benefit in the active package.
- Keep runtime memory/bootstrap changes separate from application changes. Preserve
  unrelated working-tree edits when committing a package.
- All owner paths below are relative to the repository root. A path marked
  **proposed** is created only when its package starts.

## Current foundation

| Delivered in the existing draft PR | Evidence and limits |
| --- | --- |
| Root desktop commands and live development | `npm run dev`; native startup and Rust watcher verified on macOS |
| Notes consolidation and ownership index | One feature folder; the workspace controller remains 5,660 lines at revision `a06ab37` |
| API startup and Chat selection race fixes | 131 Chat tests passed on implementation revision `25ed173` |
| Shared verification on macOS and Linux | 4,145 frontend tests, build, budgets, architecture, TypeScript, dead-code, and Rust compilation passed in [run 41184493660](https://github.com/Josue7211/clawctrl/actions/runs/41184493660) at `25ed173` |
| iOS and Systema adaptation scope | Documented; no viable iOS app, TestFlight delivery, or isolated preview pipeline implemented |

These changes are in [draft PR 63](https://github.com/Josue7211/clawctrl/pull/63).
Verify its current head and merge status before starting work. Rust compilation
does not establish that the backend tests have run.

## Ordered work queue

Dependencies are technical prerequisites. The order below is the default sequence,
with mobile and desktop ownership work eligible to interleave after the foundation.
An external iOS account or toolchain prerequisite can leave an independent desktop
package available; record the exact prerequisite without marking the iOS work done.

| ID | Work package | Depends on | Status |
| --- | --- | --- | --- |
| R01 | Protect development sessions | None | Done |
| R02 | Execute backend tests in CI | None | Active |
| R03 | Produce isolated feature review evidence | None | Planned |
| R04 | Define shared Notes API contracts | R01, R02 | Planned |
| R05 | Define mobile connectivity and platform capabilities | R01, R04 | Planned |
| I01 | Select and prove the native client foundation | R03 | Planned |
| I02 | Implement the online iPhone Notes workflow | I01, R04, R05 | Planned |
| I03 | Preserve mobile edits offline and across retries | I02 | Planned |
| I04 | Deliver and update the app through TestFlight | I02, I03 | Planned |
| N01 | Extract Notes editor preferences | R03 | Planned |
| N02 | Extract Notes navigation and workspace persistence | N01 | Planned |
| N03 | Isolate Notes save and recovery behavior | N02 | Planned |
| C01 | Isolate Chat project and session selection | R03 | Planned |
| C02 | Isolate Chat composer and stream lifecycle | C01 | Planned |
| B01 | Separate infrastructure provider ownership | R02, R03 | Planned |
| B02 | Standardize long operation results | B01 | Planned |
| D01 | Produce installable desktop packages | R01, R02, R03 | Planned |
| D02 | Verify desktop application updates | D01 | Planned |
| Q01 | Consolidate UI primitives and accessibility checks | R03 | Planned |
| Q02 | Make failures diagnosable and recoverable | R01, R03 | Planned |
| Q03 | Measure and improve performance | R03 | Planned |
| Q04 | Reduce repository and generated-file churn | R02 | Planned |
| Q05 | Verify permissions at privileged boundaries | R01, R02 | Planned |
| Q06 | Verify backup and restore behavior | R02, R03 | Planned |
| F01 | Make Home useful for the daily workflow | R03, Q01 | Planned |
| F02 | Finish a tasks and calendar workflow | R03, Q01 | Planned |
| F03 | Finish a communications workflow | R03, Q02 | Planned |
| F04 | Finish a career or growth workflow | R03, Q01 | Planned |
| F05 | Finish a training workflow | R03, Q01 | Planned |
| F06 | Finish a media workflow | R03, Q02 | Planned |
| F07 | Clarify capture and knowledge ownership | R03, R04 | Planned |
| F08 | Simplify setup and settings | R03, R05, Q01 | Planned |
| I05 | Add the next mobile workflow | I04, F02 | Planned |
| I06 | Add selected native phone integrations | I04, Q01 | Planned |

Status values are Next, Planned, Active, Waiting, and Done. While queued work
remains, exactly one package is Next or Active. Done means implemented and verified in the linked PR, with evidence recorded
in the completion ledger below; it does not imply the PR has merged.
Waiting identifies a specific missing input and the independent package selected
next. Requirements discovered during a package become explicit slices or follow-up
work rather than silently broadening its PR.

## Release milestones

| Milestone | Required packages | Acceptance |
| --- | --- | --- |
| Safe and reviewable development | R01, R02, R03 | Protected session handling, executed backend tests, and repeatable review evidence on a phone |
| Viable first iOS release | R04, R05, I01, I02, I03, I04 | A TestFlight-installed app edits the shared vault, handles offline edits and conflicts, and survives an application update |
| Clear desktop feature ownership | N01, N02, N03, C01, C02, B01, B02 | Selected behaviors have one owner, preserved contracts, behavioral tests, and live evidence |
| Reliable desktop distribution | D01, D02 | Clean installation and upgrades preserve data on macOS and Linux |
| Daily workflow expansion | Selected F packages, I05, I06 | Each selected workflow passes its own end-to-end acceptance check |

The iOS release depends on the mobile foundation, not the desktop ownership
milestone. Distant feature milestones are prioritized by daily value when activated.

## Foundation packages

### R01 Protect development sessions

**Owner:** `src-tauri/src/session_persistence.rs`, `server.rs`, `secrets.rs`,
`crypto.rs`, and `routes/auth.rs` under `src-tauri/src`. Lifecycle regressions live
in `src-tauri/src/session_lifecycle_tests.rs`.

**First slice:** remove raw serialization of development session tokens and the
encryption key into SQLite. Reuse protected storage where appropriate and require
re-authentication when protected persistence is unavailable. Clean up legacy rows.

**Done when:** restart and logout follow the documented authentication behavior;
revoked sessions cannot be restored; SQLite persistence and diagnostics contain no
raw tokens or encryption keys. Test with disposable credentials, including the
Linux secret-store-unavailable case, and verify the app login/restart flow.

### R02 Execute backend tests in CI

**Owner:** `package.json`, `.github/workflows/checks.yml`, and existing Rust test
modules under `src-tauri/src`.

**First slice:** inventory deterministic tests and live integration tests. Add a
root command that executes the full deterministic backend suite and run it in both
CI platform jobs. Expand beyond the targeted session-security gate introduced by
R01. Keep service-dependent certification separately identified.

**Done when:** CI reports executed Rust tests, a failing backend regression fails
the job, and the deterministic suite works without personal service credentials.
Include appropriate Rust formatting/lint validation and useful build caching.

### R03 Produce isolated feature review evidence

**Owner:** `frontend/src/lib/demo-data.ts`, existing feature fixtures/tests,
`scripts/`, and `.github/workflows/checks.yml`. A review runner under `scripts/`
and fixture scenarios are **proposed** additions.

**First slice:** launch Notes with fixed sample data and a controlled save failure.
Produce a screenshot, a short interaction recording, and browser-error results
using a repeatable command. Then add Chat's delayed workspace response scenario.

**Done when:** the same scenario produces stable visible data, personal services
receive no requests, mutation attempts stay inside fixtures, and the evidence is
reachable through a GitHub review link from a phone. Production behavior cannot
accidentally enable test transport. Mark renderer-only and native verification
separately. A browser preview remains distinct from the required iOS application.

### R04 Define shared Notes API contracts

**Owner:** `frontend/src/lib/api.ts`, `frontend/src/features/notes/storage/vault.ts`,
`src-tauri/src/routes/vault_local.rs`, and `shared/`. A generated or validated
contract under `shared/contracts/` is **proposed**.

**First slice:** specify the existing note list, create, read, and update shapes,
including authentication, IDs, revisions/conflicts, errors, and retry semantics.
Notes quick capture creates a vault note through that contract. General Capture
inbox behavior remains owned by F07.

**Done when:** frontend fixtures and Rust request/response tests agree, an
incompatible response fails a contract check, and replaying a write cannot silently
duplicate or overwrite a note. Keep one authoritative contract definition with a
drift check. Preserve existing routes and storage ownership during migration.

### R05 Define mobile connectivity and platform capabilities

**Owner:** `frontend/src/lib/api.ts`, `src-tauri/src/server.rs`,
`src-tauri/src/routes/setup.rs`, `src-tauri/src/routes/auth.rs`, and `src-tauri/src/bin/clawcontrol-backend.rs`.

**First slice:** distinguish desktop runtime detection from generic Tauri runtime
detection. Specify secure device connection and revocation for the selected Notes
API, plus an explicit capability response for desktop-only operations.

**Done when:** a mobile client can reach the intended existing Rust backend without
a desktop Vite server, rejects revoked credentials, and shows an honest offline
state when the backend is unavailable. Select and document backend residency:
whether an existing reachable host runs the headless backend, what happens when
that host sleeps, and which operations need a desktop service. Preserve the
desktop's local-first behavior. This package does not authorize new infrastructure.

## iOS packages

### I01 Select and prove the native client foundation

**Owner:** the client foundation selected in this package. A native `ios/` client
or a Tauri-generated Apple target is **proposed**, depending on the decision.

**First slice:** verify full Xcode, SDK/simulator availability, signing prerequisites,
and the user's device compatibility. Evaluate reuse of current feature contracts
and Systema's package responsibilities, then build one strongest candidate with a
fixture-backed Notes screen. Record the client decision and its constraints here.

**Done when:** the selected client builds, launches on a simulator or device,
handles touch/keyboard/safe areas, and uses a typed Notes model with replaceable
transport. I02 connects it to the R04 contract.
Only the selected production client is retained. A dependency or minimum iOS
version from Systema must be checked against the intended device before adoption.

### I02 Implement the online iPhone Notes workflow

**Owner:** the selected iOS feature, API client, and protected credential adapter;
the shared contract and existing Rust Notes routes remain authoritative.

**First slice:** connect/sign in, list notes, create a note through quick capture,
open it, edit it, and show save/error state using the R04 contract.

**Done when:** the created note appears on desktop with the same ID, edits survive
an app restart, unauthorized/revoked access fails clearly, and the app works
without a running desktop development server. Run a real-device workflow; record
which backend must be available and verify the intended remote connection path.

### I03 Preserve mobile edits offline and across retries

**Owner:** the selected mobile local store and sync coordinator, R04 contracts,
and existing Notes revision/conflict handling.

**First slice:** persist a note edit before sending it, terminate the app offline,
reopen it, reconnect, and reconcile the queued operation. Adapt Systema's durable
outbox, stable operation IDs, retry state, and rejection visibility to this flow.

**Done when:** edits survive restart and network loss, repeated delivery does not
duplicate writes, and simultaneous desktop/mobile edits produce an explicit
conflict or a verified merge. Test rejected operations and expired credentials.
Automatic infrastructure command retries are outside this personal-data outbox.

### I04 Deliver and update the app through TestFlight

**Owner:** selected iOS build settings, `scripts/`, and an iOS build/release workflow
under `.github/workflows/`. These mobile release files are **proposed**.

**First slice:** adapt Systema's repeatable archive/upload process to Clawctrl's
own identity, signing configuration, versions, and protected CI credentials.

**Done when:** the user installs a build through TestFlight, completes I02 and I03,
receives the next build, and retains account state and local data after updating.
Record the build number and device result. Use available Apple account access;
account authentication and installing/testing the build can require the user.

### I05 Add the next mobile workflow

**Owner:** selected iOS features and the existing backend owners in the feature map.

**First slice:** complete a reminder through the shared task contract after F02.
Follow with separately scoped chat send/cancel and explicit agent approval slices.

**Done when:** each completed slice has real-device, restart/reconnect, permission,
and cross-device evidence. Each action uses the same data owner as desktop.

### I06 Add selected native phone integrations

**Owner:** selected iOS platform adapters and shared feature actions.

**First slice:** share-sheet text capture into a vault note. Notifications, deep
links, widgets, Calendar/Reminders access, and Live Activities are separate slices
selected for an actual workflow.

**Done when:** the selected integration works with permission denied and granted,
uses the same feature actions as the app, and has a fake adapter for tests. Widgets
and extensions share existing data ownership rather than maintaining another copy.

## Desktop ownership packages

| ID | Owner and first slice | Completion check |
| --- | --- | --- |
| N01 | `frontend/src/features/notes/useNotesWorkspace.tsx` and `frontend/src/features/notes/editorPreferenceSync.ts`: extract editor preference loading, saving, and retry into a focused feature hook | Existing preference tests and the rendered change/restart/retry scenario pass; persisted keys and merge behavior stay compatible |
| N02 | Notes workspace controller, `frontend/src/features/notes/pinnedNotesSync.ts`, `frontend/src/features/notes/savedSearchSync.ts`, and `frontend/src/features/notes/workspaceSync.ts`: extract pinned-note navigation first; saved searches and workspace snapshots follow as separate slices | Navigation, selection, restore, and sync failure cases pass without duplicate subscriptions or competing persistence owners |
| N03 | Notes workspace controller and `frontend/src/features/notes/storage/vault.ts`: isolate flush/save/recovery coordination, then review/dialog orchestration in a separate slice | Edit, navigate away, restart, recover, and conflict cases retain data; the composition hook delegates to clear owners and superseded code is removed |
| C01 | `frontend/src/pages/Chat.tsx`, `frontend/src/features/chat/workspaceSelection.ts`, and `frontend/src/chat/t3-adapters`: extract project/session selection ownership | Existing delayed-load, clear, saved-session, explicit-route, and missing-project regressions pass; one owner applies selection intent |
| C02 | `frontend/src/pages/chat/useChatState.ts`, `frontend/src/pages/chat/ChatInput.tsx`, and `frontend/src/pages/chat/ChatThread.tsx`: isolate stream lifetime from composer draft state | Send, cancel, reconnect, switch sessions, and restore a draft work; old stream callbacks cannot write into a new session |
| B01 | `src-tauri/src/routes/homelab.rs` and `frontend/src/pages/homelab`: extract one provider's read-only inventory and capability logic first | Public routes and capability gates remain compatible; deterministic tests and a disposable/read-only verification cover the extracted provider; repeat for the next provider |
| B02 | Existing infrastructure actions, task records, and `src-tauri/src/audit.rs`: standardize one asynchronous action's returned state | UI distinguishes accepted/running/succeeded/failed/cancelled; changing selection cannot misattribute a result; authorization, confirmation, and audit behavior are preserved |

Add local guides as a feature migrates. Use the Notes and Chat guides as the
starting format. Avoid imposing another application-wide registry or generic
controller framework to perform these extractions.

## Distribution and quality packages

| ID | Owner and first slice | Completion check |
| --- | --- | --- |
| D01 | `.github/workflows`, `src-tauri/tauri.conf.json`, and release scripts: package the desktop app on both platforms | A clean macOS and Linux installation starts without development tooling; package evidence, version, and required runtime dependencies are recorded |
| D02 | Desktop release configuration and existing settings: implement one signed update path | Updating preserves the database, preferences, and credentials; invalid artifacts fail safely; the supported Linux package/update formats and macOS signing/notarization are explicit |
| Q01 | `frontend/src/components/ui`, theme modules, and touched feature components: consolidate one repeated dialog/control pattern | Existing themes work; keyboard/focus, large text, contrast, and reduced-motion scenarios have behavioral and visual evidence |
| Q02 | `frontend/src/main.tsx`, `frontend/src/lib/error-reporter.ts`, error boundaries, Rust logging/redaction: replace broad error suppression with targeted recovery | A fixture failure shows a useful recovery action; diagnostics identify operation/version and exclude sensitive content; development debugging remains accessible |
| Q03 | App shell, query/subscription owners, and build budgets: measure idle work and one slow user journey | Record startup, route latency, memory, CPU, and background requests on a named test setup; improve the measured bottleneck and retain a repeatable regression scenario |
| Q04 | `.memd` generation boundaries, root docs, checks, and inherited debt: isolate one source of generated-file churn | Routine memory/tool use has an understandable diff, managed instructions agree with config, and a focused cleanup lowers an inherited exception or dead-code count without raising another ceiling |
| Q05 | `src-tauri/capabilities/default.json`, `src-tauri/src/server.rs`, `frontend/src/features/notes/vaultPlugins.ts`, and `src-tauri/src/routes/generated_modules.rs`: verify one protected-write boundary, then scope plugin/generated-module permissions separately | Missing, revoked, and insufficient credentials cannot perform the selected action; origin and transport rules are tested; each later privileged boundary has an explicit verification slice |
| Q06 | `frontend/src/features/notes/storage/vaultBackup.ts`, `frontend/src/features/notes/storage/vaultArchive.ts`, `src-tauri/src/db.rs`, and migrations: restore an exported vault into disposable storage | Restored IDs, content, metadata, and attachments match; invalid archives fail without altering the existing vault; full application backup/migration recovery follows as a separate slice |

## Remaining feature milestones

Select one milestone by daily value after R03. Its first slice is executable;
additional functionality becomes separately scoped slices with the same completion
rules. The existing [feature map](features.md) identifies the full frontend and
backend owners. Live service checks use read-only or disposable targets.

| ID | Existing owner and first slice | Completion check |
| --- | --- | --- |
| F01 | `frontend/src/pages/Personal.tsx`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/features/dashboard`, and status routes: select one primary Home and show current tasks plus actionable status | One clear default destination; unavailable integrations do not obscure useful data; widgets/read models reuse the same feature owners |
| F02 | Todos/Calendar/Pomodoro pages and `src-tauri/src/routes/todos.rs`, `src-tauri/src/routes/calendar.rs`, `src-tauri/src/routes/reminders.rs`: create, complete, and reopen a reminder | Dates/timezones, persistence, failed writes, and cross-client contract tests pass; recurrence and notifications follow as individual slices |
| F03 | Messages/Email features and matching Rust routes: choose one configured account and complete a send/reconnect workflow | Drafts and attachments retain state, success reflects the provider result, and expired account access offers recovery; keep external sends under the user's existing authorization |
| F04 | Career/Growth pages, feature modules, and `src-tauri/src/routes/career.rs`, `src-tauri/src/routes/jobs.rs`, `src-tauri/src/routes/growth.rs`: capture and advance one opportunity through its existing workflow | Data persists, state transitions are understandable, and no additional module is required to complete the selected workflow |
| F05 | `frontend/src/pages/Training.tsx` and `src-tauri/src/routes/training.rs`: open one client, record a session, and reopen the result | Validation, restart persistence, accessible input, and a disposable client fixture cover the selected workflow |
| F06 | `frontend/src/pages/MediaRadar.tsx`, media feature modules, and `src-tauri/src/routes/media.rs`: reconnect a configured library and use one selected search/playback flow | Connection errors, empty results, selection changes, and supported controls behave honestly; preserve existing backend ownership |
| F07 | `frontend/src/pages/Capture.tsx`, Memory/Knowledge pages, and `src-tauri/src/routes/captures.rs`, `src-tauri/src/routes/memd.rs`, `src-tauri/src/routes/knowledge.rs`: reconcile the Capture UI's `/api/capture` assumptions with the `/api/quick-capture` implementation | One documented inbox contract routes a captured item to its intended owner once; legacy Shortcut documentation agrees with the actual authenticated API; knowledge provenance and search follow in separate slices |
| F08 | Settings, wizard, module configuration, and auth/setup/preferences routes: complete setup for the selected Notes workflow while optional integrations are unavailable | Required and optional steps are clear, disabled modules stay quiet, saved settings have device/account scope, and platform limitations are visible |

## Decisions recorded before their dependent implementation

| Decision | Package | Required outcome |
| --- | --- | --- |
| iOS client foundation | I01 | One selected stack, compatible minimum iOS version, and one proven native Notes screen |
| Backend availability | R05 | Intended existing backend host/mode, secure reachability, sleep/offline behavior, and desktop-only capabilities |
| Note synchronization | R04 and I03 | Canonical IDs, revisions, retry identity, and explicit conflict handling across desktop and mobile |
| Distribution | D01, D02, I04 | Supported package formats, app identity, credential location, versioning, and verified install/update paths |

The first iOS workflow defaults to Notes as stated above. A product correction can
change that choice; update its affected contracts, dependencies, and acceptance
checks in this map before implementing the replacement slice.

## Verification and completion ledger

The agent runs these existing commands from the repository root while working:

| Command | Purpose |
| --- | --- |
| `npm run check` | Fast architecture, TypeScript, and dead-code validation |
| `npm test -- src/features/notes` | Existing Notes behavior tests |
| `npm test -- src/pages/__tests__/ChatPage.new-chat.test.tsx` | Chat selection and route regressions |
| `npm run test:sessions` | R01 backend persistence and authentication lifecycle regressions |
| `npm run check:all` | Session-security tests plus the frontend/build/budget/Rust compilation gate; R02 expands execution to the full deterministic backend suite |

For each package or named slice, record:

1. The behavior changed, source revision, and PR link.
2. Targeted test commands and actual results. Before handoff, run the current
   complete checks; R02 expands the backend tests in that gate beyond R01 sessions.
3. Live verification, a screenshot or recording link, and browser/native errors.
   Document-only changes use document/link checks without application tests.
4. Real-device installation/update evidence for mobile delivery, and clean-install
   evidence for desktop distribution. Simulated data and native service coverage
   must be distinguishable in the result.
5. Remaining limitations, migration/rollback steps for persisted data, and the next
   package. Source commits make pure extractions reversible; persistent-data
   changes need their own compatibility and recovery check.

| Package or slice | Revision and PR | Validation and review evidence | Remaining work |
| --- | --- | --- | --- |
| R01 | `c18909b`; [draft PR 64](https://github.com/Josue7211/clawctrl/pull/64), stacked on PR 63 | Full local `npm run check:all` passed: 11 backend session regressions, 4,145 frontend tests, architecture/type/dead-code checks, production build, bundle budget, and Rust compilation. Native macOS credential-store smoke and isolated live browser logout/reload passed; zero browser errors. [Screenshots and coverage limits](reviews/r01-session-security.md). macOS/Linux CI passed in [run 41245943921](https://github.com/Josue7211/clawctrl/actions/runs/41245943921) at `c932af1`. | One fresh login after legacy plaintext cleanup; unavailable protected storage requires login after restart. Historical backups are outside cleanup. No signed native cold-restart claim. R02 is next; full backend execution and CI caching remain there. |

| R02 | In progress | Full macOS backend run: 722 passed, two explicit opt-ins ignored. The initial 13 failures returned exit 101 through the new npm command. Formatting and correctness/suspicious Clippy gate passed; full frontend/build checks and CI evidence pending. [Inventory and commands](backend-testing.md). | Final validation and review evidence pending. |

Keep the queue and this ledger current. Feature/parity guides retain detailed
behavior evidence and link back to the corresponding package here.

## Systema reference

Reference revision: `aaparcedo/systema@186545913f11143ee057132fd86535b9e8902c77`.
Adapt its package responsibilities, durable outbox, isolated fixtures, platform
adapters, visual tests, and archive/upload workflow to Clawctrl's existing owners.
Its current instructions disable GitHub Actions; checked-in workflows are examples,
not evidence that its CI runs. Keep Clawctrl's own verification active.

- [Package boundaries](https://github.com/aaparcedo/systema/blob/186545913f11143ee057132fd86535b9e8902c77/ios/Packages/SystemaUI/Package.swift)
- [Sync coordinator](https://github.com/aaparcedo/systema/blob/186545913f11143ee057132fd86535b9e8902c77/ios/Packages/SystemaSync/Sources/SystemaSync/SyncEngine.swift)
- [Isolated fixtures](https://github.com/aaparcedo/systema/blob/186545913f11143ee057132fd86535b9e8902c77/ios/Packages/SystemaUI/Sources/SystemaUI/AppModel.swift)
- [Replay tests](https://github.com/aaparcedo/systema/blob/186545913f11143ee057132fd86535b9e8902c77/server/tests/test_projections.py)
- [TestFlight script](https://github.com/aaparcedo/systema/blob/186545913f11143ee057132fd86535b9e8902c77/scripts/testflight.sh)
