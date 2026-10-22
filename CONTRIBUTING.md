# Contributing to Soroban Cookbook

Thank you for your interest in contributing! To ensure a smooth experience for both contributors and maintainers, we have a comprehensive guide available on our documentation site.

## 📖 [Read the Full Contributing Guide](https://soroban-cookbook.github.io/Soroban_Cookbook_online/docs/contributing)

### Quick Links
- **[Getting Started](https://soroban-cookbook.github.io/Soroban_Cookbook_online/docs/contributing#getting-started)** - Project overview and types of contributions.
- **[Local Setup](https://soroban-cookbook.github.io/Soroban_Cookbook_online/docs/contributing#setup-instructions)** - How to clone, install, and run the project locally.
- **[PR Conventions](https://soroban-cookbook.github.io/Soroban_Cookbook_online/docs/contributing#branching--pr-conventions)** - Branch naming and commit message standards.
- **[Validation Checklist](https://soroban-cookbook.github.io/Soroban_Cookbook_online/docs/contributing#pre-pr-checklist)** - What to check before submitting your PR, including accessibility (a11y) standards.
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
If you have questions, please open a [GitHub Issue](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues) or join the [Stellar Dev Discord](https://discord.gg/stellardev). (GitHub Discussions are not currently enabled on this repository.)

For Code of Conduct concerns or how community channels are moderated, see the [Community Moderation Plan](COMMUNITY.md).

---
*By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).*

---

## 📈 Community Growth Plan (Issue #962)

This section documents the practical plan for growing the Soroban Cookbook
community. The **100-star milestone** is an external outcome that requires
ongoing community effort — it is not achieved by documentation changes alone.

### Current status

| Metric | Value | Date checked |
|---|---|---|
| GitHub stars (upstream `Soroban-Cookbook/Soroban_Cookbook_online`) | **1** — verified via GitHub API `stargazers_count` | 2026-10-21 |
| Open issues | See the [Issues tab](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues) | — |
| Contributors | See the [Contributors graph](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/graphs/contributors) | — |

The 100-star milestone has **not** been achieved as of the date above. Star
counts are an external outcome; this plan documents repository work and
ethical outreach only.

### Growth levers

#### 1 — Content quality (highest leverage)

Every high-quality, tested, well-documented pattern is a reason for a developer
to star the repository. Prioritise:

- Completing the 8 scaffolding-only examples (`airdrop-bitmap`, `balance-snapshot`,
  `marketplace`, `multi-token-vault`, `nft`, `royalty-splitter`, `stream-payment`,
  `token-snapshot`).
- Adding missing test coverage (target ≥ 60% line coverage, up from the current
  26% threshold).
- Publishing the React frontend integration example (#956) with a clear README
  so it appears in web searches for "Soroban React example".
- Keeping all external links in the [Ecosystem Map](https://soroban-cookbook.github.io/Soroban_Cookbook_online/docs/ecosystem-map) up to date.

#### 2 — Discoverability

- **README first impression:** The README's opening sentence should answer
  "what is this and why should I care?" within 2–3 lines. Review and tighten
  the value proposition quarterly.
- **Topics:** Ensure the GitHub repository has relevant topics set:
  `soroban`, `stellar`, `smart-contracts`, `rust`, `blockchain`, `defi`.
  Set these in the repository settings → About.
- **SEO:** Each documentation page has a `description` frontmatter field.
  Keep descriptions informative and keyword-rich.

#### 3 — Community engagement (ethical outreach only)

Do **not** spam, purchase stars, send unsolicited DMs, or use any artificial
engagement mechanism.

Permitted and encouraged:

- Share new patterns or major releases in the **#soroban channel** on
  [Stellar Dev Discord](https://discord.gg/stellardev) — follow the channel's
  posting guidelines and only share when there is genuine new value.
- Post updates on the **Stellar Developer Forum** in the Projects or Tools
  category when a significant milestone is reached.
- Reference the Cookbook in relevant Stack Overflow / GitHub Discussions answers
  when it genuinely helps the person asking.
- Submit to the **Stellar Community Fund (SCF)** showcase if eligible.
- Encourage contributors to share their merged patterns through their own networks.

#### 4 — Contributor experience

Lower the barrier to first contribution:

- Keep `good-first-issue` labels on beginner-friendly tasks.
- Respond to PRs within 5 business days.
- Every merged pattern should be celebrated (mention the contributor in
  release notes or an issue comment, with their permission).
- Maintain the `CONTRIBUTING.md` (this file) and the
  [Contributing Guide](https://soroban-cookbook.github.io/Soroban_Cookbook_online/docs/contributing)
  so they stay accurate and easy to follow.

### Content calendar (rolling 90-day window)

Maintainers should update this table each quarter.

| Month | Action | Owner | Status |
|---|---|---|---|
| Month 1 | Complete 4 of the 8 scaffolding-only examples | — | planned |
| Month 1 | Share React frontend example in Stellar Discord | — | planned |
| Month 2 | Complete remaining 4 scaffolding-only examples | — | planned |
| Month 2 | Submit Cookbook to SDF / Stellar blog "project spotlight" | — | planned |
| Month 3 | Publish first testing-coverage improvement PR (target: 40%) | — | planned |
| Month 3 | Review ecosystem map links; add any notable new projects | — | planned |

### Tracking

Create a pinned [GitHub Issue](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues)
titled **"Road to 100 Stars — progress tracker"** to log:

- Starting star count (verify with
  `gh api repos/Soroban-Cookbook/Soroban_Cookbook_online --jq .stargazers_count`).
- Weekly star delta.
- Outreach activities performed and their outcomes.
- Contributors acquired each month.

### Celebration milestone

Channel-specific celebration post drafts (Discord, Developer Forum, short
social form) are maintained in
[`CELEBRATION_100_STARS.md`](CELEBRATION_100_STARS.md). Publish **only after**
the repository reaches 100 verified GitHub stars. Do not publish the post in
advance. The post must attribute the milestone to the contributor community,
not to any individual.

### What we will not do

- Purchase stars, followers, or engagement.
- Mass-DM developers without their consent.
- Artificially inflate metrics through bot accounts or vote brigading.
- Make claims in outreach materials that are not verifiable from the repository.
