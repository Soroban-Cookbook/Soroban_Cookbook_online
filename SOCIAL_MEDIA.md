# Social Media Strategy — Soroban Cookbook

Phase 7 plan for Twitter/X and [dev.to](https://dev.to) presence, including a **launch-week content calendar** and ready-to-post threads that link key docs. Companion to [`LAUNCH_ANNOUNCEMENT.md`](./LAUNCH_ANNOUNCEMENT.md) (issue #278).

**Live site:** [https://soroban-cookbook.dev](https://soroban-cookbook.dev)  
**Social card asset:** [`documentation/static/img/soroban-social-card.png`](./documentation/static/img/soroban-social-card.png)  
**Repo:** [Soroban-Cookbook/Soroban_Cookbook_online](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online)

---

## Goals

1. **Awareness** — developers discover the Cookbook within the Stellar/Soroban ecosystem.
2. **Activation** — first-time visitors reach a getting-started path and ship a contract.
3. **Retention** — recurring pattern tips and example callouts keep the community engaged.

### Success signals (first 30 days)

| Signal | Target |
| --- | --- |
| Profile follows (X) | Steady weekly growth; prioritize Soroban/Stellar builders |
| Thread → site clicks | Measurable via UTM (`?utm_source=twitter&utm_campaign=launch-week`) |
| dev.to reactions / comments | Conversation on the launch article and follow-ups |
| GitHub stars / Discussions | Uptick tied to announcement + Day 1–7 posts |

---

## Channels & roles

| Channel | Role | Cadence |
| --- | --- | --- |
| **Twitter/X** | Launch threads, daily tips, pattern highlights, RT ecosystem news | 1–2 posts/day during launch week; 3–5/week after |
| **dev.to** | Long-form announcement + deep-dive articles | 1 launch post + 1–2 follow-ups in week 1 |
| **Discord** | Support, AMA teases, link back to threads | Align with [Soroban Cookbook Discord](https://discord.gg/YNBu3jKEF) |
| **GitHub Discussions** | Canonical announcement paste from `LAUNCH_ANNOUNCEMENT.md` | Once at launch; pin if maintainers agree |

### Brand & creative

- Always attach **`soroban-social-card.png`** (or a cropped variant) on launch and major posts.
- Tone: practical, builder-first, no hype without a link to a tested example.
- Hashtags (use sparingly): `#Soroban` `#Stellar` `#Rust` `#Web3` `#SmartContracts`
- Prefer deep links into docs over the bare homepage when teaching a single idea.

---

## Launch-week content calendar

Assumes **Launch Day = Day 0** (same window as posting `LAUNCH_ANNOUNCEMENT.md`). Times are suggestions in UTC; adjust to audience peak hours.

| Day | Channel | Theme | Asset / link focus |
| --- | --- | --- | --- |
| **Day 0 — Launch** | X thread + pin | “Cookbook is live” announcement | Social card + [soroban-cookbook.dev](https://soroban-cookbook.dev) |
| **Day 0** | GitHub Discussions | Paste launch announcement | [`LAUNCH_ANNOUNCEMENT.md`](./LAUNCH_ANNOUNCEMENT.md) |
| **Day 0** | dev.to | Publish long-form launch article | Same narrative as announcement; link Getting Started |
| **Day 1** | X thread | Zero → first contract path | [Getting Started](https://soroban-cookbook.dev/docs/getting-started/setup) + setup guides |
| **Day 2** | X single + reply chain | Hello World pattern + `cargo test` | [`hello-world`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/hello-world) |
| **Day 3** | X thread | Authorization & custom types | [authorization](https://soroban-cookbook.dev/docs/patterns/authorization) · [custom types](https://soroban-cookbook.dev/docs/patterns/custom-types) |
| **Day 3** | Discord | “Pattern of the day” + office hours invite | Link Day 3 thread |
| **Day 4** | X carousel / thread | Six tested examples table | [`/examples`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples) |
| **Day 5** | dev.to | “Debugging Soroban contracts” deep dive | [debugging](https://soroban-cookbook.dev/docs/getting-started/debugging) · [testing errors](https://soroban-cookbook.dev/docs/getting-started/testing-errors) |
| **Day 5** | X | Tease the dev.to article | Quote + link |
| **Day 6** | X thread | Deploy path: local → testnet → mainnet | [local testing](https://soroban-cookbook.dev/docs/getting-started/local-testing-and-simulation) · [testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) · [mainnet](https://soroban-cookbook.dev/docs/getting-started/deploy-mainnet) |
| **Day 7** | X + Discord | Contribute CTA + wrap-up | [`CONTRIBUTING.md`](./CONTRIBUTING.md) · Discord invite |

### Post-launch (weeks 2–4)

- **Monday:** Pattern spotlight (one MDX from `documentation/docs/patterns/`).
- **Wednesday:** Snippet tip from concepts (storage, events, gas, cross-contract).
- **Friday:** Community RT / contributor shout-out / open good-first-issue.

---

## Draft threads (Twitter/X)

Copy is sized for X; trim if character limits change. Replace `@SorobanCookbook` with the real handle when created.

### Thread A — Day 0 launch (pin this)

1/ The **Soroban Cookbook** is live.  
Practical docs + tested Rust patterns so you can go from `soroban init` to a deployed contract without hunting half-finished gists.

https://soroban-cookbook.dev

🖼 *Attach `soroban-social-card.png`*

2/ What’s inside:  
• Progressive Getting Started (Linux / Windows / macOS)  
• Pattern library with authorization, errors, upgrades, and more  
• Six working examples under `/examples` — each with unit + snapshot tests  

3/ Start here if you’re new:  
Quick Start on the homepage → then the Getting Started path  
https://soroban-cookbook.dev/docs/getting-started/setup

4/ Prefer long-form? We wrote the full launch story (also ready for GitHub Discussions):  
https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/LAUNCH_ANNOUNCEMENT.md

5/ Star the repo, join Discord, and tell us which pattern you want next.  
Repo: https://github.com/Soroban-Cookbook/Soroban_Cookbook_online  
Discord: https://discord.gg/YNBu3jKEF

---

### Thread B — Day 1 getting started

1/ Day 1 with the Soroban Cookbook: **zero → first contract**.  
Pick your OS, install the toolchain, and follow one path — no tab archaeology.

2/ Setup guides:  
• Linux · Windows · macOS (under Getting Started)  
Entry: https://soroban-cookbook.dev/docs/getting-started/setup

3/ Next steps in order:  
first contract → build → local testing → testnet deploy  
All linked from the same docs section so you never lose the trail.

4/ Stuck? Discord is for questions and pattern reviews:  
https://discord.gg/YNBu3jKEF

---

### Thread C — Day 2 hello-world + tests

1/ The Cookbook’s `hello-world` example is intentionally tiny: instance storage, getter/setter, and **two unit tests** you can run with `cargo test`.

2/ Code + tests live here:  
https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/hello-world

3/ Pattern write-up:  
https://soroban-cookbook.dev/docs/patterns/hello-world

4/ That’s the bar for every example we publish: documented, tested, copy-pasteable.

---

### Thread D — Day 3 authorization & types

1/ Production Soroban code lives or dies on **auth** and **types**.  
Two patterns worth bookmarking today:

2/ Authorization  
https://soroban-cookbook.dev/docs/patterns/authorization

3/ Custom types  
https://soroban-cookbook.dev/docs/patterns/custom-types

4/ Pair them with the concepts pages when you need the “why,” not just the “how.”  
https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/documentation/docs/concepts

---

### Thread E — Day 4 examples tour

1/ Six contracts. All tested. All in `/examples`:

2/ `hello-world` — storage defaults  
`counter` — simple CRUD  
`token-transfer` — mint / transfer / balances  
`simple-dao` — membership + proposals  
`simple-voting` — one-address-one-vote  
`upgradeable` — migrate state + v2 features  

3/ Browse them:  
https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples

4/ Clone one, run `cargo test`, then adapt. That’s the Cookbook loop.

---

### Thread F — Day 6 deploy path

1/ Local green tests feel great — **deploy** is the real milestone.  
Cookbook path: simulate locally → testnet → mainnet.

2/ Local testing & simulation  
https://soroban-cookbook.dev/docs/getting-started/local-testing-and-simulation

3/ Deploy to testnet  
https://soroban-cookbook.dev/docs/getting-started/deploy-testnet

4/ Deploy to mainnet (when you’re ready)  
https://soroban-cookbook.dev/docs/getting-started/deploy-mainnet

5/ Debugging & testing errors guides sit beside those pages when something blows up. Ship with a checklist, not vibes.

---

### Thread G — Day 7 contribute

1/ Launch week wrap: the Cookbook is a community project.  
Typos, patterns, tests, and UI polish all welcome.

2/ Read the guide first:  
https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/CONTRIBUTING.md

3/ Add a tested example:  
https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/contributing/add-tested-example.md

4/ Before you PR (from `documentation/`):  
`bun install && bun run format:check && bun run lint && bun run typecheck && bun run build`

5/ See you in Discord: https://discord.gg/YNBu3jKEF

---

## Draft posts — dev.to

### Article 1 — Launch (Day 0)

**Title:** Launching the Soroban Cookbook: From First Contract to Production Patterns  
**Tags:** `soroban`, `stellar`, `rust`, `web3`  
**Canonical / cross-post:** Align with `LAUNCH_ANNOUNCEMENT.md` (TL;DR, getting-started path, pattern library, examples table, contribution CTA).  
**Cover image:** export/attach `documentation/static/img/soroban-social-card.png`  
**CTA:** Link homepage + Discord; invite comments on which pattern readers want next.

### Article 2 — Debugging deep dive (Day 5)

**Title:** Debugging Soroban Smart Contracts Without Losing Your Afternoon  
**Outline:**
1. Reproduce locally with the Cookbook testing guides  
2. Read failures with the debugging + testing-errors docs  
3. Map errors to patterns (`error-handling`, `error-recovery`)  
4. Checklist before testnet redeploy  
**Links:** debugging, testing-errors, error-handling, error-recovery pattern pages.

---

## UTM & tracking conventions

Use consistent query params on marketing links:

```text
https://soroban-cookbook.dev/?utm_source=twitter&utm_medium=social&utm_campaign=launch-week&utm_content=day-0-thread
https://soroban-cookbook.dev/docs/getting-started/setup?utm_source=devto&utm_medium=article&utm_campaign=launch-week&utm_content=day-0-article
```

---

## Verification checklist (issue #366)

- [x] `SOCIAL_MEDIA.md` defines Twitter/X + dev.to strategy  
- [x] Post calendar covers **full launch week** (Day 0–7)  
- [x] Draft threads link key docs, examples, contributing, and Discord  
- [x] Social card path referenced: `documentation/static/img/soroban-social-card.png`  
- [x] Aligned with launch announcement from issue #278  

---

## Out of scope (follow-ups)

- Creating the official X/dev.to accounts (ops / maintainers)  
- Scheduling via Buffer/Typefully (choose a tool when accounts exist)  
- Enabling the Docusaurus blog plugin to auto-publish `LAUNCH_ANNOUNCEMENT.md`  
- Paid promotion or influencer seeding  

---

*Phase 7 · Social Media Strategy · Closes the gap called out in issue #366 / original roadmap #279*