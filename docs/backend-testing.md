# Backend verification

Run from the repository root on macOS or Linux, using Rust stable with `rustfmt` and `clippy`, Node 24, Git, and the existing Tauri system prerequisites:

```sh
rustup component add rustfmt clippy
npm run test:backend
npm run check:rust
npm run check:all
```

`test:backend` runs Cargo with `--locked --all-targets -- --test-threads=1`. It includes all non-ignored library tests and both binary test targets. A test failure returns Cargo's nonzero exit status through npm and fails `check:all` and CI. `test:sessions` remains the targeted R01 command; the full gate runs those tests once through `test:backend`.

One test thread is intentional: existing Commands and Chat fixtures temporarily change process environment variables using separate module-local locks. Those locks do not isolate different modules. The full suite runs serially until those fixtures stop relying on process-global state. Tokio tasks inside a test still run normally. The terminal sanitizer uses an injected fixture lookup and does not change `HOME` or other process variables.

## Inventory and dependencies

The R02 starting inventory discovers 724 library tests on macOS: 722 deterministic tests and two opt-in tests. Both binary targets currently contain zero tests. Counts may change with platform-specific coverage and new tests; the Cargo summary in each CI job is authoritative. No hardcoded test-name allowlist can silently omit new ordinary tests.

| Coverage | Dependencies and isolation |
| --- | --- |
| Parsing, serialization, validation, permission decisions, redaction, cryptography, service catalogs | Pure fixtures; no configured services |
| Session persistence/lifecycle, audit/cache behavior, local Notes and workspace data | In-memory or disposable SQLite and temporary files |
| Proxmox retries/actions, VNC handshake/proxy, auth-provider behavior | Ephemeral loopback HTTP/TCP servers and fake credentials |
| Workspace Git metadata and project mutations | Temporary local Git repositories with fixture author identity; no remote fetch/push |
| Local provider execution, runtime bridges, command cancellation/output limits | Temporary shell executables, the installed Node runtime, disposable working directories |
| Commands/Chat environment overrides | Scoped restoration plus serial test execution; no personal credentials required |

The suite does not start the desktop app, read its configured service credentials, or require a developer credential-store unlock. API-looking URLs and credentials in ordinary tests are fixtures, request-building inputs, or loopback service addresses. Real-service certification remains separate below.

## Explicit opt-in checks

Two Rust tests stay ignored in ordinary CI, with reasons on the tests:

- `session_persistence::tests::os_credential_store_roundtrip`: requires an available native credential store; creates and deletes one random disposable entry. Run this exact test with `--ignored --exact` only on the intended development machine.
- `server::session_lifecycle_tests::browser_review_fixture`: requires an external browser driver and `R01_BROWSER_REVIEW_FILE`. It exposes only a disposable loopback test server and fails unless the browser completes logout before its deadline. [R01 review evidence](reviews/r01-session-security.md) records the exercised flow.

Do not use blanket `--ignored` in CI. Portainer and Proxmox `*:certify-live` commands target configured real services and remain explicit opt-in operations. Their existing `*:test-certify-*` commands exercise certification logic with fixtures; they are distinct from Cargo tests and live certification. See the existing [Portainer](portainer-parity-matrix.md) and [Proxmox](proxmox-parity-matrix.md) guides for those workflows.

## Formatting, lint, and caching

`check:rustfmt` runs the full Cargo formatting check. `check:clippy` checks all targets with `clippy::correctness` and `clippy::suspicious` denied. Existing style/performance suggestions remain reported warnings; this package does not claim a warning-free codebase or disable those warnings.

The macOS/Linux workflow installs both components and executes the same `npm run check:all` command as local development. Rust registry/index/git downloads and `src-tauri/target` are cached. Cache keys include OS, architecture, the installed compiler hash, and Cargo manifests/lockfile, vendored dependency sources, and build-script hashes. A partial restore stays within the same OS/architecture/compiler; Cargo still checks fingerprints and recompiles changed sources. Cache hits never skip checks or tests. Runtime data and credential files are outside the cached paths.

The npm download cache remains handled by `setup-node`. The Rust cache is a build optimization; it is not verification evidence. Initial runs and dependency/compiler changes can still require a full compilation. GitHub [branch/ref cache scoping](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching#restrictions-for-accessing-a-cache) applies: a cache saved for one PR is not automatically available to another PR. New branches may therefore start cold until a usable base/default-branch cache exists. Cache behavior uses the existing Rust action's [compiler hash output](https://github.com/dtolnay/rust-toolchain#outputs) and GitHub's [cache action](https://github.com/actions/cache).

## R02 acceptance evidence

[R02 review evidence](reviews/r02-backend-ci.md) and the [implementation ledger](implementation-map.md#verification-and-completion-ledger) record the source revision, failure propagation, 722 passing backend tests and 4,145 frontend tests on both CI platforms, cache saves, and live smoke coverage. A successful Rust compilation alone does not count as executed tests.
