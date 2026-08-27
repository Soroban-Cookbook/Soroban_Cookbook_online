---
title: "🚀 Launching the Soroban Cookbook — Your Practical Path from `soroban init` to Production"
slug: launch-announcement
date: 2026-06-29
authors: [soroban-cookbook-maintainers]
tags: [announcement, launch, soroban, stellar]
description: >-
  The Soroban Cookbook is live. A modern, interactive documentation site and
  pattern library that takes Soroban developers from first contract to
  production-ready dApps on Stellar.
---

# 🚀 Launching the Soroban Cookbook

**TL;DR.** The [Soroban Cookbook](https://soroban-cookbook.dev) is live. A modern documentation site and a tested, copy-pasteable library of Soroban smart contract patterns — so you can stop reading old blog posts and start shipping.

🎉 **Live now:** [https://soroban-cookbook.dev](https://soroban-cookbook.dev)

---

## Why another cookbook?

Soroban is fast, cheap, and Rust-powered — but learning it shouldn't mean hunting through blog posts, half-finished gists, and the SDK source to figure out *why* your contract won't compile. We built the Soroban Cookbook to be the place a new developer can land, follow a path, and deploy a working contract in an afternoon.

The goals are simple:

1. **Fast on-ramp** — zero→contract in under an hour, on Linux, macOS, or Windows.
2. **Production-ready patterns** — every pattern ships with tests, not vibes.
3. **Modern UX** — dark-mode docs, copyable code, local search, mobile-first.

---

## What's in the launch

### 🏠 A homepage that teaches

The new homepage ([src/pages/index.tsx](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online)) greets visitors with a live **Quick Start** code sample (copy-to-clipboard included), a curated **Popular Patterns** carousel, a stats panel, and community testimonials. New developers can go from landing → first contract with one click.

### 🧭 Progressive Getting Started path

Eleven guides cover the full beginner-to-mainnet journey:

- Environment setup for [Linux](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/getting-started/setup-linux.md), [Windows](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/getting-started/setup-windows.md), and macOS
- [Your first contract](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/getting-started/first-contract.md)
- [Building & compilation](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/getting-started/building-and-compilation.md)
- [Local testing & simulation](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/getting-started/local-testing-and-simulation.md)
- [Deploy to testnet](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/getting-started/deploy-testnet.md) / [mainnet](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/getting-started/deploy-mainnet.md)
- [Contract interaction](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/getting-started/contract-interaction.md)
- [Debugging](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/getting-started/debugging.md) and [testing errors](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/getting-started/testing-errors.md)

### 📚 Pattern library

Reusable, battle-tested patterns that solve the problems you actually hit:

- [Hello World Storage](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/patterns/hello-world.mdx) — instance storage, getters & setters
- [Authorization](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/patterns/authorization.mdx) & [Custom Types](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/patterns/custom-types.mdx)
- [Error Handling](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/patterns/error-handling.mdx) & [Error Recovery](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/patterns/error-recovery.mdx)
- [Lifecycle & Upgrades](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/patterns/lifecycle-upgrades.mdx)
- [Optimization Playbook](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/patterns/optimization-playbook.mdx)
- [Proposal Lifecycle](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/patterns/proposal-lifecycle.mdx)

### 🧪 Six working example contracts — all tested

Every example in [`/examples`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples) ships with a full unit-test suite and snapshot tests. Copy, paste, run `cargo test`, ship:

| Contract | What it teaches |
| --- | --- |
| [`hello-world`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/hello-world) | Instance storage, getter/setter defaults |
| [`counter`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/counter) | CRUD on simple state, edge cases for read idempotence |
| [`token-transfer`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/token-transfer) | Mint, transfer, balance checks, self-transfer rejection |
| [`simple-dao`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/simple-dao) | Membership, proposals, voting |
| [`simple-voting`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/simple-voting) | Per-address one-vote-rules, tallies, lifecycle |
| [`upgradeable`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/upgradeable) | Contract migration with state preservation + v2 features |

### ⚙️ Concepts & Best Practices

A [concepts section](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/documentation/docs/concepts) covers what every working Soroban dev needs to know: [storage](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/concepts/storage.md), [authorization](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/concepts/authorization.md), [events](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/concepts/events.md), [gas & resources](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/concepts/gas-and-resources.md), [cross-contract invocation](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/concepts/cross-contract-invocation.md), and the [best-practices guide](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/concepts/best-practices.md).

---

## Zooms in: a copy-pasteable first contract

Here is the entire `hello-world` example. It fits on one screen, compiles on the current `soroban-sdk`, and tests cover both default and custom-greeting paths:

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Env, String};

#[contract]
pub struct HelloWorld;

#[contractimpl]
impl HelloWorld {
    /// Return a greeting stored in instance storage, or a default greeting.
    pub fn hello(env: Env) -> String {
        env.storage()
            .instance()
            .get(&"msg")
            .unwrap_or(String::from_str(&env, "Hello, Soroban!"))
    }

    /// Store a custom greeting message.
    pub fn set_message(env: Env, message: String) {
        env.storage().instance().set(&"msg", &message);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_default_greeting() {
        let env = Env::default();
        let contract_id = env.register(HelloWorld, ());
        let client = HelloWorldClient::new(&env, &contract_id);
        assert_eq!(client.hello(), String::from_str(&env, "Hello, Soroban!"));
    }

    #[test]
    fn test_custom_greeting() {
        let env = Env::default();
        let contract_id = env.register(HelloWorld, ());
        let client = HelloWorldClient::new(&env, &contract_id);
        client.set_message(&String::from_str(&env, "Greetings from Soroban!"));
        assert_eq!(
            client.hello(),
            String::from_str(&env, "Greetings from Soroban!")
        );
    }
}
```

Run from the [`hello-world`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/hello-world) directory:

```bash
cargo test        # 2 tests, both pass
```

That's the cookbook experience end-to-end: minimal, tested, documented.

---

## What's under the hood

- **Framework:** [Docusaurus 3](https://docusaurus.io/) with `future.v4: true`
- **UI:** React 19 + TypeScript, dark-mode-first with `respectPrefersColorScheme`
- **Build:** [Bun](https://bun.sh/) (with an npm fallback), custom design tokens, Inter + JetBrains Mono preloaded
- **Search:** local search via [`@easyops-cn/docusaurus-search-local`](https://github.com/easyops-cn/docusaurus-search-local) — works offline, no Algolia key required
- **CI/CD:** GitHub Actions for lint, typecheck, build, and Pages deploy (see [`CI_CD_PIPELINE.md`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/CI_CD_PIPELINE.md))
- **Deploy:** Vercel-friendly config ([`vercel.json`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/vercel.json)) + GitHub Pages via Actions
- **SEO:** proper OG tags, social card, theme color, and `nojekyll` ([`/documentation/static/.nojekyll`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/static/.nojekyll))

---

## Help us make it better

The cookbook is a community project and there's a lot left on the roadmap:

- 📝 **More patterns.** Have a clever Soroban trick? Open a PR — see [`docs/contributing/add-tested-example.md`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/contributing/add-tested-example.md).
- 🐛 **Fix typos, broken snippets.** Every page has an "Edit this page" link straight to GitHub.
- 🎨 **Polish the UI.** The component library ([`src/components`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/documentation/src/components)) has room for richer cards, syntax variants, and accessibility wins.
- 🧪 **Add tests & E2E coverage.** Playwright is wired up — see [`e2e/`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/documentation/e2e).
- 📣 **Spread the word.** Star the repo, share a pattern you wish existed, and tell us what's missing.

Before opening a PR, please run:

```bash
cd documentation
bun install
bun run format:check && bun run lint && bun run typecheck && bun run build
```

🧭 Full contribution guide: [CONTRIBUTING.md](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/CONTRIBUTING.md).

---

## Join the community

- 💬 **Discord** — the [Soroban Cookbook Discord](https://discord.gg/YNBu3jKEF) (linked from the navbar and footer) is now live for questions, pattern reviews, and pair-design sessions.
- 🐙 **GitHub** — [Soroban-Cookbook/Soroban_Cookbook_online](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online) for issues, PRs, and Discussions
- 🆘 **Stellar Discord** — [`discord.gg/stellardev`](https://discord.gg/stellardev) for broader Soroban/Soroban-dev questions
- ❓ **Stack Overflow** — tag [`soroban`](https://stackoverflow.com/questions/tagged/soroban)

---

## Acknowledgments

Built with ❤️ by the Soroban Cookbook maintainers and contributors. Powered by [Stellar](https://stellar.org), written in [Rust](https://www.rust-lang.org), served by [Docusaurus](https://docusaurus.io), and tested by an amazing open-source community. 🙌

**Ready to build?** Jump to the [homepage](https://soroban-cookbook.dev) 👉 then follow [the Quick Start](https://soroban-cookbook.dev/docs/getting-started/setup).

— *The Soroban Cookbook maintainers*
