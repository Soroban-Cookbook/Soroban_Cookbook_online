# Celebration Post — 100 GitHub Stars

**Status:** Draft only. **Do not publish until the 100-star milestone is
verified** (see “How to verify” below).

**Issue:** #962 · Reach 100 GitHub Stars  
**Last updated:** 2026-10-21

---

## How to verify the milestone before publishing

GitHub stars cannot be inferred from planning documents. Check the live count
from an authorized source:

```bash
gh api repos/Soroban-Cookbook/Soroban_Cookbook_online --jq .stargazers_count
```

…or open
[github.com/Soroban-Cookbook/Soroban_Cookbook_online](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online)
and read the star counter in the repository header.

Record the date and the number in the release notes / discussion that
accompanies publication. **If the count is below 100, do not publish.**

### Snapshot at time of writing

| Source | Stars | Date checked |
|---|---|---|
| GitHub API (`stargazers_count`) on `Soroban-Cookbook/Soroban_Cookbook_online` | **1** | 2026-10-21 |

The 100-star milestone has **not** been reached as of the date above.

---

## Channel-specific drafts

Keep each post short, accurate, and non-promotional. Attribute the milestone
to the community. Link only to verified URLs.

### A — Stellar Dev Discord (`#soroban`)

> **里程碑达成：Soroban Cookbook 突破 100 GitHub Stars**
>
> 感谢所有贡献模式、提交 PR、反馈文档的开发者。Cookbook 现在收录了 50+ 个带测试的
> Soroban 合约模式，以及一个 React + Freighter 前端集成示例。
>
> 仓库：https://github.com/Soroban-Cookbook/Soroban_Cookbook_online  
> 文档：https://soroban-cookbook.github.io/Soroban_Cookbook_online/  
> 生态地图：https://soroban-cookbook.github.io/Soroban_Cookbook_online/docs/ecosystem-map
>
> （English summary: Thank you to everyone who contributed patterns, PRs, and
> docs feedback — the Soroban Cookbook just passed 100 GitHub stars. 50+
> tested contract patterns, a React + Freighter integration example, and an
> ecosystem map. Contributions welcome.）

*Adjust language mix to match channel norms before posting; English-only
variant below if preferred.*

### B — English short form (Discord / X / Mastodon)

> The Soroban Cookbook just passed **100 GitHub stars**. Thank you to every
> contributor who added a tested pattern, fixed a doc, or filed an issue.
>
> What's inside: 50+ annotated Soroban contract patterns with unit tests, a
> React + Freighter frontend integration example, and a maintained ecosystem
> map.
>
> https://github.com/Soroban-Cookbook/Soroban_Cookbook_online

### C — Stellar Developer Forum (Projects / Tools)

> **Title:** Soroban Cookbook reaches 100 GitHub stars
>
> Hi all — the Soroban Cookbook community repository has just crossed 100
> GitHub stars. The project collects **working, unit-tested Soroban contract
> patterns** (access control, escrow, AMM/lending primitives, governance,
> upgrade/migration, and more) plus a React example showing Freighter wallet
> connection and contract invocation end-to-end.
>
> - Repository: https://github.com/Soroban-Cookbook/Soroban_Cookbook_online
> - Pattern docs: https://soroban-cookbook.github.io/Soroban_Cookbook_online/
> - Ecosystem map: https://soroban-cookbook.github.io/Soroban_Cookbook_online/docs/ecosystem-map
>
> This milestone belongs to the contributors who wrote patterns, reviewed
> PRs, and reported doc bugs. Issues and PRs are welcome — see CONTRIBUTING.md.
>
> Happy building on Soroban.

### D — Press / blog blurb (50 words)

> The Soroban Cookbook, a community-maintained library of tested Soroban
> smart-contract patterns and frontend integration examples, has reached 100
> GitHub stars. The repository ships annotated Rust examples with unit tests,
> a React + Freighter dapp example, and a curated ecosystem map for Stellar
> developers.

---

## Rules for any published version

1. **Only publish after** the live star count is verified ≥ 100.
2. Attribute the milestone to contributors, not any individual maintainer.
3. Do not claim audits, production-readiness, or partnership status that the
   repository does not evidence.
4. Do not buy, bot, or otherwise inflate stars to reach the goal.
5. Prefer channels the community already uses (Stellar Dev Discord, Stellar
   Developer Forum, repo Discussions/Issues). No unsolicited DMs.
