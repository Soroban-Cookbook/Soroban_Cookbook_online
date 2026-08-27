# Press Kit — Soroban Cookbook

Everything a journalist, conference organizer, ecosystem partner, or community
newsletter needs to write about the Soroban Cookbook. All assets on this page
are MIT-licensed and free to reuse without asking first — attribution is
appreciated.

**Live site:** [https://soroban-cookbook.dev](https://soroban-cookbook.dev)
**Repository:** [Soroban-Cookbook/Soroban_Cookbook_online](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online)
**Companion docs:** [`LAUNCH_ANNOUNCEMENT.md`](./LAUNCH_ANNOUNCEMENT.md) · [`SOCIAL_MEDIA.md`](./SOCIAL_MEDIA.md)

---

## Boilerplate

Copy one of these verbatim. Pick the length that fits your format.

### One-liner (≤ 100 characters)

> The Soroban Cookbook is a free, open-source pattern library for Stellar smart contract developers.

### Short (≈ 50 words)

> The Soroban Cookbook is a free, open-source documentation site and pattern
> library for developers building smart contracts on Stellar with Soroban. It
> pairs a progressive getting-started path with tested, copy-pasteable contract
> patterns, so developers can go from an empty project to a deployed contract in
> an afternoon.

### Long (≈ 120 words)

> The Soroban Cookbook is a community-built, open-source documentation site for
> developers writing smart contracts on Stellar with Soroban. Rather than
> scattering knowledge across blog posts and half-finished gists, it offers a
> single progressive path: environment setup for Linux, macOS, and Windows;
> a first contract; local testing; and deployment to testnet and mainnet. Its
> pattern library covers authorization, custom types, error handling and
> recovery, lifecycle upgrades, token standards, staking, timelock vaults,
> oracle consumers, and an optimization playbook — every pattern backed by a
> compiling, tested Rust example in the repository. The site is MIT-licensed,
> accepts community contributions, and is maintained in the open on GitHub.

---

## Fast facts

| | |
| --- | --- |
| **Name** | Soroban Cookbook (always two words, both capitalized — never "SorobanCookbook" or "soroban cookbook") |
| **What it is** | Open-source documentation site and smart contract pattern library |
| **Ecosystem** | [Stellar](https://stellar.org) · [Soroban](https://developers.stellar.org/docs/build/smart-contracts) smart contracts |
| **Primary language** | Rust (contract examples); TypeScript/React (the site itself) |
| **Built with** | [Docusaurus](https://docusaurus.io) |
| **License** | [MIT](./LICENSE) — code, docs, and the assets on this page |
| **Cost to users** | Free, no account required, no paywall |
| **Governance** | Community-maintained, open contribution via GitHub pull requests |
| **Website** | [soroban-cookbook.dev](https://soroban-cookbook.dev) |
| **Source** | [github.com/Soroban-Cookbook/Soroban_Cookbook_online](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online) |
| **Community** | [Soroban Cookbook Discord](https://discord.gg/YNBu3jKEF) |
| **Contact** | Open a [GitHub issue](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues) or ask in Discord |

### Content at a glance

These counts are checked in the repository and change as the project grows.
Re-derive them before publishing if accuracy matters to your piece:

```bash
ls documentation/docs/patterns/*.mdx | wc -l          # contract patterns
ls documentation/docs/getting-started/*.md | wc -l    # getting-started guides
ls -d examples/*/ | wc -l                             # runnable Rust examples
find documentation/docs -name '*.md' -o -name '*.mdx' | wc -l   # total pages
```

| Metric | Count (as of July 2026) |
| --- | --- |
| Contract patterns | 14 |
| Getting-started guides | 15 |
| Runnable Rust example crates | 18 |
| Total documentation pages | 66 |

> ⚠️ The follower/star/contributor figures shown in the site's homepage "Trusted
> by the Community" panel are illustrative placeholders, not audited metrics.
> Do not quote them. Use the table above, or pull live counts from the GitHub
> API.

---

## What makes it notable

Three angles that tend to matter to an editor:

1. **Every pattern is a compiling crate, not a snippet.** The Rust in the docs is
   extracted from [`examples/`](./examples), which builds and tests in CI. Code
   in the docs cannot silently rot away from code that works.
2. **A path, not a pile.** The getting-started track is ordered — setup, first
   contract, build, test, deploy testnet, deploy mainnet — so a newcomer never
   has to guess what to read next.
3. **Built in public, by the community.** No vendor gate, no signup wall, MIT
   licensed end to end, and contributions arrive as ordinary pull requests.

---

## Logo & brand assets

| Asset | File | Use for |
| --- | --- | --- |
| Primary logo (SVG) | [`documentation/static/img/logo.svg`](./documentation/static/img/logo.svg) | Any size — scales cleanly. Preferred format. |
| Social card (PNG, 1200×630) | [`documentation/static/img/soroban-social-card.png`](./documentation/static/img/soroban-social-card.png) | Open Graph / Twitter cards, article headers |
| Social card (WebP) | [`documentation/static/img/soroban-social-card.webp`](./documentation/static/img/soroban-social-card.webp) | Web use where WebP is supported |
| Favicon | [`documentation/static/img/favicon.ico`](./documentation/static/img/favicon.ico) | Browser chrome, link previews |

### Brand colors

| Token | Hex | Use |
| --- | --- | --- |
| Primary | `#3b82f6` | Links, primary buttons, accents |
| Secondary | `#a855f7` | Gradient partner to primary, highlights |
| Dark surface | `#1e1e2e` | Site background in dark mode (the site's `theme-color`) |

Defined in [`documentation/src/css/design-tokens.css`](./documentation/src/css/design-tokens.css).

### Usage guidelines

**Please do:**

- Use the logo as-is, at any size, on light or dark backgrounds.
- Keep clear space around the logo equal to at least the height of its own mark.
- Link the logo to [soroban-cookbook.dev](https://soroban-cookbook.dev) when used online.

**Please don't:**

- Stretch, rotate, recolor, or add effects to the logo.
- Imply that the Soroban Cookbook endorses your product, or that it is an
  official Stellar Development Foundation publication — it is a community
  project.
- Use the name or logo as part of your own product name or logo.

---

## Screenshots

Full-resolution PNGs (2× device scale) live in
[`documentation/static/img/press/`](./documentation/static/img/press/):

| Screenshot | File | Shows |
| --- | --- | --- |
| Homepage | [`homepage.png`](./documentation/static/img/press/homepage.png) | Landing page — the best single hero image |
| Getting started | [`docs-getting-started.png`](./documentation/static/img/press/docs-getting-started.png) | Docs reading experience with sidebar navigation |
| Pattern page | [`pattern-hello-world.png`](./documentation/static/img/press/pattern-hello-world.png) | A contract pattern with syntax-highlighted Rust |
| Mobile homepage | [`homepage-mobile.png`](./documentation/static/img/press/homepage-mobile.png) | Responsive layout at 390×844 |

All shots are 2× device scale, captured in the site's light theme. Dark-theme
variants are deliberately absent: the dark theme currently renders the homepage
headline in a near-black on the dark hero, so it does not photograph well. Once
that is fixed, add dark entries to the `shots` array in the capture script.

### Regenerating them

Screenshots are captured from a real browser against a real build, so they never
drift from the live site:

```bash
cd documentation
bun install
bun run build
bun run serve -- --port 3000 --host 127.0.0.1 &   # in a second terminal
bun run press:screenshots
```

Capture against production instead by setting the target URL:

```bash
BASE_URL=https://soroban-cookbook.dev bun run press:screenshots
```

The script and its shot list live in
[`documentation/scripts/capture-press-screenshots.mjs`](./documentation/scripts/capture-press-screenshots.mjs).
Add an entry to the `shots` array to capture a new page.

---

## Suggested links

When writing about the project, these are the highest-value destinations:

- **Start here:** [Getting started — setup](https://soroban-cookbook.dev/docs/getting-started/setup)
- **First win:** [Your first contract](https://soroban-cookbook.dev/docs/getting-started/first-contract)
- **The library:** [Patterns overview](https://soroban-cookbook.dev/docs/patterns/overview)
- **Depth, for advanced readers:** [Optimization playbook](https://soroban-cookbook.dev/docs/patterns/optimization-playbook)
- **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## For maintainers

Keep this file current when the project changes:

- **Counts drift.** Re-run the commands under [Content at a glance](#content-at-a-glance) before any launch push and update the table.
- **Screenshots drift.** Re-run `bun run press:screenshots` after any homepage or theme redesign.
- **Links drift.** `bun run check:external-links` and `bun run audit:links` cover the links in this file's targets.
