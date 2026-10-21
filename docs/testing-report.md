# Testing Report

**Issue #958 · Soroban Cookbook**
**Last updated:** 2026-10-21
**Repository:** [Soroban-Cookbook/Soroban_Cookbook_online](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online)
**Report generated from:** repository source inspection, CI workflow analysis (`.github/workflows/ci.yml`, `.github/workflows/security.yml`), and static counting of test functions.

---

## 0. Environment and method

| Item | Value |
|---|---|
| Report date | 2026-10-21 (UTC) |
| Inspection host | Linux (Ubuntu 22.04, x86_64) |
| Node.js | v24.21.0 |
| Rust / Cargo | **Not installed** in this environment |
| Bun | **Not installed** in this environment |
| Counting method | Static scan: `#[test]` attributes under `examples/*/src` and `examples/*/tests` |

**Important limitation:** `cargo test`, `cargo tarpaulin`, and `bun run test`
could **not** be executed in the environment where this report was produced
(the Rust toolchain and Bun are absent). All Rust test *totals* below are
**source-derived counts of `#[test]` functions**, not pass/fail run output.
Pass/fail status is owned by the CI `test-examples` job; see §2 and §6.
No coverage percentages, benchmark numbers, or security-audit outcomes are
claimed unless evidence is cited.

---

## 1. Testing inventory

### 1.1 Rust contract tests (`examples/`)

The examples workspace (`examples/Cargo.toml`) has **54 members**, all of which
ship a `src/lib.rs`. Tests live either inline under `#[cfg(test)]` in
`src/lib.rs`, in a dedicated `src/test.rs` / `src/tests.rs`, or (rarely) in a
`tests/` integration directory.

**Shared SDK:** `soroban-sdk = "28.0.0"` (with `testutils`), workspace-level
dependency.

**Counted test functions (static scan, 2026-10-21):**

| Metric | Count |
|---|---|
| Workspace members | 54 |
| Members with ≥ 1 `#[test]` | **53** |
| Members with `src/lib.rs` but 0 tests | **1** (`marketplace`) |
| Total `#[test]` functions in workspace members | **697** |

**Commands:**

```bash
# All examples via CI script (authoritative CI path)
bash scripts/test-examples.sh

# Entire examples workspace
cargo test --manifest-path examples/Cargo.toml --workspace --lib

# A single example
cargo test --manifest-path examples/counter/Cargo.toml --lib
```

`scripts/test-examples.sh` discovers every `examples/*/` directory that has a
`Cargo.toml` **and** a `src/lib.rs` (including orphan crates outside the
workspace), pre-builds WASM artefacts where required (`contract-factory`,
`upgradeable`), and runs `cargo test --lib` per crate.

**Largest test suites (by `#[test]` count):**

| Example | Tests |
|---|---|
| `simple-dao` | 41 |
| `simple-voting` | 36 |
| `governor` | 34 |
| `ttl-bumper` | 32 |
| `lending` | 30 |
| `token-snapshot` | 30 |
| `token-transfer` | 30 |
| `staking` | 25 |
| `crowdfund` | 24 |
| `dutch-auction` | 23 |

**Separate `tests/` directories:** `custom-types/tests/integration_test.rs`,
`token-transfer/tests/integration.rs`.

**Crates outside the examples workspace** (own `[workspace]` or orphan —
still scanned by `test-examples.sh` when they have `src/lib.rs`):
`custom-types`, `multisig-timelock-upgrade` (CosmWasm, not Soroban),
`nft` (no `src/lib.rs`), `pull-payment`, `royalty-splitter` (no
`src/lib.rs`), `storage-kinds`. Of these, `custom-types` and
`multisig-timelock-upgrade` currently contain **zero** `#[test]` functions;
`nft` and `royalty-splitter` cannot be tested as Rust lib crates until they
gain a `src/lib.rs`.

### 1.2 Documentation-site unit tests (`documentation/`)

**Tooling:** Vitest 5.x + @testing-library/react 16.x (see
`documentation/package.json`, `documentation/vitest.config.ts`).

**Command:**

```bash
cd documentation
bun install
bun run test            # single run
bun run test:coverage   # with v8 coverage
```

**Counted test files under `documentation/src/`:** **61** files matching
`*.test.ts` / `*.test.tsx` (utils, components, theme swizzles, pages, CSS
design tokens).

**Coverage thresholds** (enforced in `vitest.config.ts`; CI `coverage` job
fails when breached):

| Metric | Threshold |
|---|---|
| Lines | ≥ 26% |
| Statements | ≥ 26% |
| Functions | ≥ 27% |
| Branches | ≥ 30% |

Actual percentages are produced only when `bun run test:coverage` (or the CI
job) runs; they are **not** restated here because they were not measured in
this environment.

### 1.3 Frontend integration example tests (`examples/frontend-integration-react/`)

Added with issue #956. Uses Vitest 2.x + @testing-library/react; all
Freighter and RPC calls are mocked.

```bash
cd examples/frontend-integration-react
npm install
npm test
```

| Test file | Coverage focus |
|---|---|
| `src/services/freighterService.test.ts` | Install detection, `requestAccess` success/denial/error, network passphrase → TESTNET/MAINNET/UNKNOWN |
| `src/components/WalletConnector.test.tsx` | Not-installed prompt, connect button, loading state, connected state, disconnect |
| `src/components/ContractInteraction.test.tsx` | Counter display, missing `VITE_CONTRACT_ID` warning, disabled action buttons |

### 1.4 End-to-end tests (`documentation/e2e/`)

**Tooling:** Playwright. Counted spec files: **14**.

| Spec | Scope |
|---|---|
| `smoke.spec.ts` | Core pages load |
| `accessibility.spec.ts` | Axe accessibility |
| `navigation.spec.ts` | Sidebar / internal links |
| `dark-mode.spec.ts` | Dark mode toggle |
| `search.spec.ts` / `search.a11y.spec.ts` | Search UX + a11y |
| `offline.spec.ts` | PWA offline behaviour |
| `reduced-motion.spec.ts` | `prefers-reduced-motion` |
| `error-states.spec.ts` | 404 page |
| `loading-states.spec.ts` | Loading indicators |
| `code-block-copy.spec.ts` | Copy-to-clipboard |
| `redirects.spec.ts` | Client-side redirects |
| `visual-regression.spec.ts` | Screenshot regression (Chromium/Linux) |
| `smoke-console.spec.ts` | Browser console error audit |

```bash
cd documentation
bun run e2e:chromium   # CI default
bun run e2e            # all configured browsers
```

---

## 2. Test results

### 2.1 Rust contracts

| Item | Status |
|---|---|
| Local `cargo test` in this environment | **Not run** — `cargo`/`rustc` not installed |
| Authoritative pass/fail source | CI job `test-examples` in `.github/workflows/ci.yml` |
| Static test-function total (workspace members) | 697 across 53 crates |
| Known untested member | `marketplace` (0 `#[test]`) |

To reproduce locally once the Rust toolchain is available:

```bash
rustup target add wasm32-unknown-unknown   # or wasm32v1-none per current SDK
bash scripts/test-examples.sh
```

> **Baseline note:** A pre-existing `WORK_SUMMARY.md` entry records historical
> Rust-toolchain gaps in some environments. Any local failure observed after
> installing the toolchain should be classified against a fresh CI
> `test-examples` run on `main` before being attributed to a change.

### 2.2 Documentation-site unit tests

| Item | Status |
|---|---|
| Local `bun run test` in this environment | **Not run** — Bun not installed; `documentation/node_modules` not present |
| Authoritative pass/fail source | CI jobs `coverage` (Vitest) in `ci.yml` |

### 2.3 Frontend integration example tests

| Item | Status |
|---|---|
| Local `npm test` in this environment | **Not run** — intentionally deferred; example ships self-contained scripts and mocks |
| How to verify | `cd examples/frontend-integration-react && npm install && npm test` |

### 2.4 End-to-end tests

Run in CI (`e2e-console`, `e2e-smoke`) against the production documentation
build. Not executed in this environment.

---

## 3. Coverage statistics

### 3.1 Rust contract coverage

| Item | Finding |
|---|---|
| `tarpaulin.toml` in repository | **Not present** (searched `**/tarpaulin*`) |
| Rust coverage CI job | **None** — `ci.yml` has no tarpaulin/llvm-cov step |
| Measured Rust line/branch coverage | **Unavailable** — requires `cargo tarpaulin` (or equivalent) on a host with the Rust toolchain |

**To generate once the toolchain is available:**

```bash
cargo install cargo-tarpaulin
cd examples
cargo tarpaulin --workspace --out Xml --output-dir ../coverage-rust
```

**Recommendation:** Add a root `tarpaulin.toml` and a `coverage-rust` CI job
that uploads a Cobertura report; track a target (e.g. 60% lines on example
contracts) as a follow-up issue rather than asserting it here.

### 3.2 Frontend (documentation site) coverage

| Item | Finding |
|---|---|
| Tool | `@vitest/coverage-v8` via `bun run test:coverage` |
| Thresholds | lines 26%, statements 26%, functions 27%, branches 30% (`vitest.config.ts`) |
| Measured percentages in this report | **Not measured** (Bun unavailable) |

CI `coverage` job writes `coverage-summary.json` and posts a summary table on
each run; that artifact is the authoritative percentage source.

### 3.3 Frontend integration example coverage

Vitest coverage is configured in
`examples/frontend-integration-react/vitest.config.ts` (text + lcov). No
threshold is currently enforced. Measured percentages were not collected in
this environment.

---

## 4. Performance

### 4.1 Rust contract benchmarks

| Item | Finding |
|---|---|
| `benches/` directories | **None** in any example crate |
| criterion / divan configs | **None** |
| Soroban resource-budget assertions in tests | **None** found (`env.budget()` unused in test modules) |

Soroban performance is normally governed by host resource metering
(instructions, memory, events) rather than wall-clock time. The SDK test
`Env` exposes `budget()` for deterministic cost capture; no example currently
asserts on it.

**Recommendation (not implemented here):** add `env.budget()` assertions to
the highest-cost paths in `constant-product-amm`, `lending`, and `simple-dao`
so resource regressions fail tests.

### 4.2 WASM size budgets (implemented)

| Item | Finding |
|---|---|
| Budget file | `examples/wasm-budgets.toml` |
| Enforcement script | `scripts/check-wasm-budgets.sh` |
| CI job | `check-wasm-budgets` (release build → size compare) |

This is the repository's primary automated performance-regression gate for
contracts.

### 4.3 Documentation site performance budgets (implemented)

| Item | Finding |
|---|---|
| Bundle budget | `documentation/bundle-budgets.json` + `bun run check:bundle-budget` |
| Lighthouse config | `documentation/lighthouserc.json` / `lighthouserc.js` (scheduled `mobile-seo-audit.yml`, not PR-gating) |

---

## 5. Security assessment (evidence-based)

### 5.1 Automated dependency audit — `cargo audit`

| Item | Finding |
|---|---|
| Workflow | `.github/workflows/security.yml` → job `cargo-audit` |
| Command | `cargo audit --deny warnings` against `examples/Cargo.lock` |
| Triggers | PRs touching Rust paths; weekly schedule |
| Policy | `docs/security/cargo-audit.md` — blanket ignores require documented maintainer approval |
| Result in this environment | **Not executed** (no Cargo). CI run history is the authoritative result. |

### 5.2 Static analysis — `cargo clippy`

Run in CI job `lint-contracts`:

```bash
cargo clippy --manifest-path examples/Cargo.toml --workspace --lib
```

Configured by `examples/clippy.toml`.

### 5.3 `unwrap`/`expect` guard

`scripts/forbid-unwrap.sh` (CI `lint-contracts`) fails when new
`unwrap()`/`expect()` calls appear outside `#[cfg(test)]` blocks.

### 5.4 Secret scanning and JS analysis

| Check | Workflow / config |
|---|---|
| Gitleaks secret scan | `security.yml` → `gitleaks` |
| CodeQL (JavaScript/TypeScript only; not Rust) | `security.yml` → `codeql` |
| Dependabot (npm + Cargo) | `.github/dependabot.yml` |

### 5.5 Explicit non-claims

- **No manual application-security review** of this codebase is recorded.
- **No independent third-party smart-contract audit** has been performed or
  is claimed. Documentation pattern pages that reference unaudited examples
  carry unaudited-example notices (see
  `documentation/docs/contributing/unaudited-example-notice.md`).
- `cargo audit` covers **dependency advisories only**; it does not review
  contract business logic.
- This report does **not** assert that any security audit “passed.”

---

## 6. CI status (workflow structure)

From `.github/workflows/ci.yml` (required quality gate on PRs/pushes to
`main`):

| Job | Purpose |
|---|---|
| `lint-format` | Prettier + ESLint (docs) |
| `spellcheck` | cspell |
| `typecheck` | `tsc` (docs + e2e) |
| `build-docs` | Docusaurus build + bundle budget |
| `validate-deployment` | Lockfile / workflow sanity |
| `test-examples` | **Rust unit tests** via `scripts/test-examples.sh` |
| `wasm-build-examples` | `wasm32v1-none` release builds |
| `rustfmt` | `cargo fmt --all -- --check` |
| `check-wasm-budgets` | WASM size vs `wasm-budgets.toml` |
| `lint-contracts` | rustfmt + clippy + forbid-unwrap + license headers |
| `e2e-console` / `e2e-smoke` | Playwright |
| `check-snippet-drift` | Snippet drift script |
| `coverage` | Vitest coverage thresholds |
| `summary` | Aggregate gate |

Additional workflows: `security.yml` (CodeQL, cargo-audit, gitleaks),
`deploy.yml`, `deploy-preview.yml`, `cross-browser.yml`,
`mobile-seo-audit.yml`, `uptime-monitor.yml`, `alerts.yml`,
`log-aggregation.yml`, `validate-setup.yml`.

**Note:** There is **no** workflow file named `test.yml`; Rust testing is the
`test-examples` job inside `ci.yml`. Live pass/fail results require the
[Actions tab](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/actions).

---

## 7. Known gaps and recommendations

### High priority

| Gap | Evidence | Recommendation |
|---|---|---|
| No Rust coverage measurement | No `tarpaulin.toml`; no coverage job | Add `tarpaulin.toml` + `coverage-rust` CI job |
| `marketplace` has zero tests | Static scan | Add unit tests before documenting the pattern |
| `nft` / `royalty-splitter` lack `src/lib.rs` | Filesystem | Add contract source + tests |
| No resource-budget assertions | No `env.budget()` in tests | Assert budgets on AMM / lending / DAO hot paths |

### Medium priority

| Gap | Evidence | Recommendation |
|---|---|---|
| FE coverage thresholds low (26–30%) | `vitest.config.ts` | Raise thresholds as coverage improves |
| Frontend example not in CI | No job references `examples/frontend-integration-react` | Add an npm-test job for the example |
| Playwright PR matrix is Chromium-only for smoke | `ci.yml` `e2e-smoke` | Rely on scheduled `cross-browser.yml` or widen PR matrix |

### Low priority

| Gap | Recommendation |
|---|---|
| No mutation testing | Consider `cargo mutants` after line coverage exists |
| No property-based tests | `proptest` for AMM / lending arithmetic |
| Security workflow CodeQL is JS-only | Evaluate Rust analysis options separately |

---

## Appendix A — Workspace manifest summary

**`examples/Cargo.toml` members (54):**
`access-control`, `airdrop-bitmap`, `authorization`, `balance-snapshot`,
`batch-ops`, `constant-product-amm`, `constructor-init`, `contract-factory`,
`counter`, `cross-contract`, `crowdfund`, `custom-account`, `dutch-auction`,
`emergency-stop`, `error-handling`, `escrow-basic`, `escrow-multiparty`,
`events-catalog`, `faucet`, `flash-loan`, `governor`, `hello-world`,
`htlc-swap`, `lending`, `marketplace`, `merkle-proof`, `multi-token-vault`,
`multisig-wallet`, `oracle-consumer`, `pagination`, `pausable-token`,
`payment-splitter`, `price-oracle`, `rate-limit`, `reentrancy-guard`,
`refundable-deposit`, `registry`, `sac-client`, `simple-dao`, `simple-voting`,
`single-range-clmm`, `soulbound-token`, `staking`, `storage-ttl`,
`stream-payment`, `timelock-vault`, `tiny-contract`, `token-snapshot`,
`token-transfer`, `token-vesting`, `token-wrapper`, `ttl-bumper`,
`twap-helper`, `upgradeable`

**Root workspace (`Cargo.toml`):** `multisig-timelock-upgrade`,
`storage-kinds`

## Appendix B — Files inspected

- `.github/workflows/ci.yml`, `.github/workflows/security.yml`
- `docs/security/cargo-audit.md`, `SECURITY.md`
- `examples/Cargo.toml`, root `Cargo.toml`, `examples/wasm-budgets.toml`
- `examples/*/src/lib.rs`, `examples/*/src/test.rs`, `examples/*/tests/*`
- `scripts/test-examples.sh`, `scripts/check-wasm-budgets.sh`,
  `scripts/forbid-unwrap.sh`, `scripts/check-example-licenses.sh`
- `documentation/package.json`, `documentation/vitest.config.ts`
- `documentation/src/**/*.test.*`, `documentation/e2e/*.spec.ts`
- `examples/frontend-integration-react/` (new in #956)

## Appendix C — Reproducing this report's static counts

```bash
# Rust test functions in workspace members
python3 - <<'PY'
import os, re, tomllib
with open('examples/Cargo.toml','rb') as f:
    members = tomllib.load(f)['workspace']['members']
total = 0
for m in members:
    for sub in ('src', 'tests'):
        root_dir = f'examples/{m}/{sub}'
        if not os.path.isdir(root_dir):
            continue
        for r, _, files in os.walk(root_dir):
            for fn in files:
                if fn.endswith('.rs'):
                    with open(os.path.join(r, fn)) as fh:
                        total += len(re.findall(r'^\s*#\[test\]', fh.read(), re.M))
print('test_fns', total)
PY

# Documentation unit-test files
find documentation/src -name '*.test.*' | wc -l

# Playwright specs
ls documentation/e2e/*.spec.ts | wc -l
```
