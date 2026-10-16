# Contributing to Soroban Cookbook

Thank you for your interest in contributing! To ensure a smooth experience for both contributors and maintainers, we have a comprehensive guide available on our documentation site.

## 📖 [Read the Full Contributing Guide](https://soroban-cookbook.com/docs/contributing)

### Quick Links
- **[Getting Started](https://soroban-cookbook.com/docs/contributing#getting-started)** - Project overview and types of contributions.
- **[Local Setup](https://soroban-cookbook.com/docs/contributing#setup-instructions)** - How to clone, install, and run the project locally.
- **[PR Conventions](https://soroban-cookbook.com/docs/contributing#branching--pr-conventions)** - Branch naming and commit message standards.
- **[Validation Checklist](https://soroban-cookbook.com/docs/contributing#pre-pr-checklist)** - What to check before submitting your PR, including accessibility (a11y) standards.
- **[Code of Conduct](CODE_OF_CONDUCT.md)** - Community standards and behavioral expectations.
- **[Community Moderation Plan](COMMUNITY.md)** - Moderator guidelines, reporting, and escalation path.

---

### 📊 For Docs Maintainers
- **[Analytics Dashboard](ANALYTICS_DASHBOARD.md)** - Key metrics, the weekly popular-pages report, and how to turn zero-result searches into documentation issues.
- **[A/B Testing Plan](documentation/docs/planning/ab-testing.md)** - Required process and plan template before enabling any experiment.

---

### Rust Example Contracts: Style & Lint

For every new or updated example, complete the
[example origin checklist](documentation/docs/contributing/add-tested-example.md#example-origin-checklist)
before merge:

- [ ] Declare the crate's license in `examples/<example>/Cargo.toml`.
- [ ] Add accurate SPDX license headers to new or modified Rust source files,
  preserving any required upstream copyright and license notices.
- [ ] Record an **Origin** section in `examples/<example>/README.md`: either
  original work for this project, or adapted from a named public source with a
  citation, revision/version, source license, and a summary of changes.

For adapted material, verify the license permits the contribution and retain
required attribution or NOTICE files. Flag uncertain compatibility for maintainers
before merge. This checklist is a forward-looking requirement for contributions.

The example Soroban contracts in [`examples/`](examples/) share a single style and
lint configuration so local development matches CI exactly:

- **Formatting** — [`examples/rustfmt.toml`](examples/rustfmt.toml) pins `edition = "2021"`
  so formatting is deterministic across toolchains. Format / verify with:
  ```bash
  cargo fmt --manifest-path examples/Cargo.toml --all -- --check
  ```
- **Clippy** — [`examples/clippy.toml`](examples/clippy.toml) tightens the noisy-by-default
  Clippy knobs for `no_std` contract entry points. Lint with:
  ```bash
  cargo clippy --manifest-path examples/Cargo.toml --workspace --lib
  ```
- **No new `unwrap`/`expect` outside `#[cfg(test)]`** — enforced by
  [`scripts/forbid-unwrap.sh`](scripts/forbid-unwrap.sh) (run locally as
  `./scripts/forbid-unwrap.sh`). Existing unwraps are tracked as tech debt and
  not flagged; only newly added ones outside test modules are rejected.

These checks run in the `lint-contracts` CI job. Run them locally before opening a PR.

---

### License Policy for Example Crates

All example crates in [`examples/`](examples/) are licensed under the repository's
[MIT License](LICENSE). Example crates must not declare a different license.

- **Required `license` field** — every example crate's `Cargo.toml` must set an
  explicit `license` field in its `[package]` section so packaging and docs
  tooling can read the license from the manifest:
  ```toml
  license = "MIT"
  ```
- **SPDX headers** — every Rust source file under `examples/**/*.rs` must start
  with an `SPDX-License-Identifier` header matching the crate's license. For MIT
  examples the expected header is:
  ```rust
  // SPDX-License-Identifier: MIT
  ```
  All existing example sources already include this header.

- **Exceptions** — a crate may only use a different license if a maintainer
  approves it in the PR and it is listed below with its rationale. There are
  currently **no approved exceptions**.
- **`multisig-timelock-upgrade`** — previously declared `Apache-2.0`; it now
  declares `MIT` in line with this policy.

New example PRs should confirm the crate's `license` field follows this policy
(see the checklist in the [pull request template](.github/pull_request_template.md)).

Adapted or third-party material must also be recorded in the root
[NOTICE](NOTICE) file and in [examples/ORIGIN.md](examples/ORIGIN.md), following
the instructions in NOTICE. Only record sources maintainers can verify.

---


### Why the Guide?
We want to enable you to submit high-quality PRs with minimal back-and-forth. The guide provides clear expectations, automated check commands, and standardized practices.

### 📞 Getting Help
If you have questions, please use [GitHub Discussions](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/discussions) or join the [Stellar Dev Discord](https://discord.gg/stellardev).

For Code of Conduct concerns or how community channels are moderated, see the [Community Moderation Plan](COMMUNITY.md).

---
*By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).*
