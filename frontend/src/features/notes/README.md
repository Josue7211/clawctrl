# Notes

Canonical implementation for the Notes feature on macOS and Linux. The public
route remains `/notes`; `pages/notes/Notes.tsx` only forwards to this feature.

## Find the right file

| Concern | Location |
| --- | --- |
| Workspace layout and composition | `NotesWorkspace.tsx` |
| Workspace state, actions, sync orchestration | `useNotesWorkspace.tsx` |
| Workspace types and pure helpers | `workspaceTypes.ts`, `workspaceHelpers.tsx` |
| Editor, tree, graph, canvas, toolbar | `components/` |
| History, properties, export, review, navigation, prompts, preferences, sync dialogs | `dialogs/` |
| Local vault access and subscription | `storage/vault.ts`, `storage/useVault.ts` |
| Archive and backup verification | `storage/vaultArchive.ts`, `storage/vaultBackup.ts` |
| Search, tags, links, templates, collaboration, plugins | Named domain modules in this folder |
| Existing behavioral coverage | `__tests__/` |
| Shared transport | `../../lib/api.ts` |
| Rust vault API | `src-tauri/src/routes/vault_local.rs`, `vault.rs` from repository root |

## Contract

Notes remain local-first. `/api/vault/local/*` is the canonical storage API.
Legacy vault routes exist for explicit import and compatibility reads; failed
local writes must not silently switch to another owner. Preserve note IDs,
storage keys, sync formats, routes, and keyboard behavior during extraction.

The [shared Notes contract](../../../../shared/contracts/README.md) defines list,
read, create/update, conditional revisions, and durable retry acknowledgements.
Wire types are generated; conflicts retain the local draft and its original base
revision across restart. [R05 connections](../../../../docs/mobile-connectivity.md)
add scoped, revocable device credentials; the native iOS client remains separate.

## Verify

From repository root:

```bash
npm run dev
npm test -- src/features/notes
npm run check:all
```

In the running app, open Notes, create and edit a note, navigate the tree, open
the graph and canvas, and inspect the dialogs touched by a change. Verify trash
and restore on disposable notes. Existing test fixtures cover these behaviors
without connecting to personal services.

## Organization status

- Consolidated the page helpers, UI, storage, hook, and existing tests here.
- Split the former 16,962-line page into workspace logic, view composition, and
  focused dialog groups. Removed obsolete Notes re-export paths.
- Kept the public page entry point and existing runtime contracts.
- The workspace hook still needs smaller hooks for sync, review, and workspace
  persistence; do those as separate behavior-preserving changes.
- Execute those changes through packages N01, N02, and N03 in the repository
  [implementation map](../../../../docs/implementation-map.md#desktop-ownership-packages).
- Continue the existing feature acceptance work in `docs/notes-parity-roadmap.md`.
  This organization change does not declare all Notes parity complete.

## Isolated renderer review

Run `npm run review:features` from the root after the one-time
`npm run review:install`. The [review guide](../../../../docs/feature-review.md)
records fixture ownership, network isolation, screenshots, and recordings.
This is renderer evidence; native platform verification stays separate.
