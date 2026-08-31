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


### Why the Guide?
We want to enable you to submit high-quality PRs with minimal back-and-forth. The guide provides clear expectations, automated check commands, and standardized practices.

### 📞 Getting Help
If you have questions, please use [GitHub Discussions](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/discussions) or join the [Stellar Dev Discord](https://discord.gg/stellardev).

For Code of Conduct concerns or how community channels are moderated, see the [Community Moderation Plan](COMMUNITY.md).

---
*By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).*
