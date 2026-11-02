# Sidebar timer lifecycle review

BUG-010 is a separate Q00 follow-up to the sync fixes. Acceptance: a completed
item drag must not leave a delayed state update after Sidebar unmounts, and normal
link clicks must resume after the existing 250 ms suppression window.

## Failure and correction

At `7a41cdc`, [Linux CI](https://github.com/Josue7211/clawctrl/actions/runs/41358964626/job/125005298660)
passed 736 backend tests and all 4,158 frontend assertions, but failed on an
uncaught `window is not defined` exception. The stack points to the post-drag
timeout in `Sidebar.tsx`, which called its React setter after the test's browser
environment had been destroyed. macOS and isolated browser jobs passed that run;
their success did not rule out the lifecycle leak.

A new deterministic fake-clock regression reproduced one timer still pending
after Sidebar unmount. It failed before the production change. A companion test
checks that the link is initially suppressed and works after 250 ms.

The component now owns the reset timeout in a ref, clears a previous reset before
scheduling another, and cancels it during its existing unmount cleanup. Existing
drag detection, move operations, and the click suppression duration are preserved.
There is no new global error suppression, test retry, or relaxed timeout.

## Verification

All nine focused Sidebar tests passed. All eight isolated browser scenarios
passed, including a real pointer drag followed by navigation through the dragged
Notes link. The browser fixture explicitly models the legitimate Todos hover
prefetch; unknown requests remain blocked. The Sidebar scenario recorded no
unexpected browser errors or unmodeled requests, and all forwarded requests went
only to the local review frontend. The screenshot was visually inspected.

- [Sidebar after drag and navigation](r07-sidebar-after-drag.png)
- [Drag recording](r07-sidebar-drag.webm)
- [Browser and network diagnostics](r07-browser-results.json)

The first local full-gate attempt was interrupted by Mac sleep and produced
timeouts in unrelated existing UI scenarios. It is not passing evidence. The
rerun used temporary process-scoped sleep prevention and passed the full local
`npm run check:all`: 736 backend tests (two existing opt-ins ignored), 4,160
frontend tests across 257 files, two Node contract checks, formatting/selected
Clippy/type/architecture/dead-code checks, production build/budget and desktop
compilation. No power configuration was changed. [Structured results](r07-results.json),
source revision and CI status are recorded in the
[implementation ledger](../implementation-map.md#verification-and-completion-ledger).

This is source/fixture verification, not a live provider or native installation
claim. Other Sidebar rename/resize callbacks are outside this specific regression.
No data migration or infrastructure change is required.

## Notes host decision

The user selected an existing Linux host that stays on as the shared Notes owner.
The [residency guide](../mobile-connectivity.md) and implementation map record the
choice. The exact machine/account/data root, reconciliation of existing datasets,
backup restore and secure native connection remain to be verified before migration.
No existing vault has been moved, replaced, merged or redirected by this decision.
