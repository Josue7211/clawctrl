# Isolated feature review

The agent runs the following from the repository root. After `npm run setup`, install the review browser once:

```sh
npm run review:install
```

Capture the current scenarios with one command:

```sh
npm run review:features
```

This starts the existing frontend on loopback port **5186**, creates a fresh browser context per scenario, records the interaction, and closes its server/browser afterward. An occupied port fails the run instead of reusing an existing session. It does not start a native backend or need personal credentials. The usual `npm run dev` stays the native desktop development command.

Open the generated responsive HTML report locally with `npm run review:report`. `review-results/` contains screenshots, WebM recordings, and `browser-results.json` per scenario; traces and an error screenshot are retained on failure. `review-report/` contains the browsable report. Both directories are generated and ignored by Git and the architecture checker.

## Scenarios and acceptance

| Scenario | Interaction and assertions |
| --- | --- |
| Notes save failure | Open a fixed sample note, edit it, inject HTTP 503 for its canonical local-vault PUT, verify the fixture backend still has the original and a recovery draft is stored, reload while failure remains active, verify the edit survives, restore availability and edit again, verify the fixture backend receives the new content and the draft clears |
| Chat late workspace response | Assert the cached sample project is selected, hold the workspace response, clear the project through the actual selector before delivery, release the response, verify the project list populates while selection/storage/URL remain unscoped |
| Network isolation | Attempt an unmodeled local API mutation, an external HTTP request, and an external WebSocket; verify all are intercepted and match the exact expected rejection list |

The failure scenario reports the browser's intentional HTTP 503 diagnostic separately. **Unexpected console/page errors must be zero.** Existing editor warnings and the expected local-draft warning are recorded, not hidden. Notes currently handles an unavailable canonical write by retaining a browser-local draft; this scenario verifies that behavior rather than claiming a native SQLite save succeeded.

The date, timezone, locale, viewport, note, and project are fixed. Successful feature scenarios must have no unmodeled requests. The guard scenario declares exactly three expected rejections and fails on any others. Videos can differ in duration and platform fonts can differ; this is stable behavior/data evidence, not a cross-platform pixel baseline.

## Isolation and ownership

- `playwright.config.mjs` owns browser/report settings and server lifecycle.
- `scripts/review/server.mjs` reuses the existing Vite config, disables local environment-file loading and environment-prefix exposure, injects fixture API bases, and removes external font/preconnect links. It refuses Vite proxy configuration.
- `scripts/review/fixtures.mjs` owns sample records and explicit method/path responses. Every API call is fulfilled inside the browser, including the existing client's loopback desktop API paths. Only GET/HEAD frontend assets and HMR may continue to the dedicated loopback Vite server. Unknown origins, API reads/writes, and WebSockets are blocked and fail verification.
- `scripts/review/features.spec.mjs` owns the visible interactions and assertions. Service workers are blocked. Each browser context starts empty; reload keeps only that scenario's disposable browser storage.

Fixture transport is not imported by production frontend code and has no production runtime toggle. It does not call the user's configured services or write real notes/projects. The app's general demo data remains its own existing UI behavior; review fixtures are test-only records. R04 will validate the shared Notes API contract against these fixtures as that contract is introduced.

## Review from a phone

Open the PR's **Checks → Isolated feature review** job. Its summary links a `feature-review` artifact containing PNGs, WebM recordings, JSON diagnostics, the HTML report, and failure traces. Artifacts require GitHub access and expire after 14 days; use the newest run. The HTML report is served locally by the agent for inspection, not deployed as a website.

[Reference screenshots and recordings](reviews/r03-feature-review.md) are committed with the R03 review, so the PNGs are directly viewable in GitHub without downloading an artifact. Future runs refresh CI artifacts automatically; reference media is updated deliberately when review behavior changes.

## Coverage limits

This proves renderer behavior against fixtures. It does not verify native IPC, OS credential stores, a signed desktop installation, real-service behavior, or an iOS app. Keep those checks and the existing full `npm run check:all` gate separate. CI's browser-review job runs the same command on Linux; local macOS review provides the second renderer run. The existing desktop gate still runs on both macOS and Linux.
