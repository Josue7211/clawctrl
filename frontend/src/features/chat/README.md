# Chat

Chat is still partly in the legacy page. Use these existing owners before adding
another project or session selection path:

- `pages/Chat.tsx`: route, session, composer, and workspace orchestration.
- `features/chat/workspaceSelection.ts`: pure project lookup and environment matching.
- `chat/t3-adapters/projectWorkspace.ts`: workspace loading and project records.
- `chat/t3-adapters/projectSidebar.ts`: project tree and path normalization.
- `pages/chat`: extracted page UI and state helpers.

Frontend paths above are relative to `frontend/src`.

## Selection contract

The initial workspace response may populate available projects, but it must not
replace a newer user selection, cleared scope, or navigation. Explicit project
routes win over stale selection state. URL updates may apply an in-progress
project pick only when that pending pick matches the selected project.

## Verification

Run `npm test -- src/pages/__tests__/ChatPage.new-chat.test.tsx` from the root.
The delayed-response regression clears a cached project before workspace loading
finishes and verifies that the resulting chat remains unscoped. Also try project
picking, clearing, and explicit project navigation in the running app.

## Remaining organization work

The page remains large. Move orchestration into focused feature hooks one behavior
at a time, keeping the existing route and selection contract. The directory map
above describes current ownership; Chat has not yet been fully consolidated.
Execute the next extractions through C01 and C02 in the repository
[implementation map](../../../../docs/implementation-map.md#desktop-ownership-packages).
