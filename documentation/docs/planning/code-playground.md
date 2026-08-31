---
sidebar_position: 4
title: Code Playground (Phase 4)
description: MVP scope and rationale for live code preview in the Soroban Cookbook.
---

# Code Playground — Phase 4: Live Code Preview (Basic)

**Issue:** [#164 — Phase 4: Live Code Preview (Basic)](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues/164)
**Dependency:** Builds on [#74 — Playground Planning](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues/74)

## MVP Scope

The Phase 4 MVP delivers **read-only code preview with syntax highlighting** for Rust/Soroban code snippets embedded in documentation pages.

### What was implemented

| Feature | Details |
|---------|---------|
| `CodePreview` component | Reusable React component at `src/components/CodePreview/index.tsx` |
| Syntax highlighting | Prism-based via `prism-react-renderer` (already a project dependency) |
| Copy-to-clipboard | One-click copy with visual feedback (`Copied!` confirmation) |
| Line numbers | Shown by default, toggleable via `showLineNumbers` prop |
| Collapsible long blocks | Optional `collapseAt` prop to collapse code exceeding N lines |
| MDX usage | `<CodePreview language="rust" code={...} title="lib.rs" />` |

### Props API

```typescript
interface CodePreviewProps {
  code: string;              // Required — the code to render
  language?: string;         // Default: 'rust'
  fileName?: string;         // Displayed in the header bar
  title?: string;            // Alternative header label (takes precedence over fileName)
  className?: string;        // Custom CSS class
  showLineNumbers?: boolean; // Default: true
  collapseAt?: number;       // 0 = no collapse; N = collapse after N lines
}
```

### Example usage in MDX

```mdx
import { CodePreview } from '@site/src/components/CodePreview';

<CodePreview
  language="rust"
  title="hello-world/src/lib.rs"
  code={`#![no_std]
use soroban_sdk::{contract, contractimpl, Env, String};

#[contract]
pub struct HelloWorld;

#[contractimpl]
impl HelloWorld {
    pub fn hello(env: Env) -> String {
        env.storage().instance().get(&String::from_str(&env, "msg")).unwrap_or(
            String::from_str(&env, "Hello, Soroban!"),
        )
    }
}`}
/>
```

## Rationale

### Why Prism / `prism-react-renderer`?

- Docusaurus already ships with Prism support and `prism-react-renderer` as a dependency.
- Prism has a comprehensive Rust grammar (`additionalLanguages: ['rust']` is already configured in `docusaurus.config.ts`).
- No new dependencies were added — the component uses only what the project already includes.

### Why a new component instead of extending `CodeSnippet`?

The existing `CodeSnippet` component focuses on **interactive code features** (comment toggling, file download, tabbed multi-snippet views). `CodePreview` is a lighter-weight component purpose-built for the Phase 4 MVP: read-only syntax highlighting with copy-to-clipboard. Keeping them separate avoids bloating `CodePreview` with features it doesn't need, and avoids breaking changes to `CodeSnippet`'s existing API.

### Why not use `react-syntax-highlighter`?

`react-syntax-highlighter` is a heavier dependency that bundles multiple highlighter engines. Since `prism-react-renderer` is already installed and provides the same Prism-based highlighting Docusaurus uses internally, adding another library would be redundant.

## What is deliberately out of scope (future work)

The following features are **not** part of this MVP and are tracked separately:

- **WASM compile pipeline** — Server-side compilation of Rust code to WASM. This requires a backend compilation API and is tracked as a separate Phase 4 item in the roadmap ([#136](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues/136)).
- **Live execution sandbox** — Running compiled WASM in-browser (e.g. via `wasmi` or `wasm-bindgen`). Requires the compilation pipeline first.
- **Interactive editing** — Monaco editor integration, real-time compilation feedback. This is Phase 3 territory.
- **Server-side execution API** — A backend service that compiles and executes Soroban contracts. Separate roadmap item.
- **Testnet deployment from browser** — Deploying compiled contracts to Stellar testnet. Requires wallet integration and backend services.

## Alignment with Issue #74 (Playground Planning)

Issue #74 established the planning foundation for interactive code features. This implementation aligns with its recommendations:

- Uses the same component-based architecture pattern
- Follows the existing CSS module and TypeScript conventions
- Does not contradict any prior planning decisions — it adds a lightweight preview layer that can be extended later with the full playground features

## Files changed

| File | Change |
|------|--------|
| `src/components/CodePreview/index.tsx` | New component — Prism-based syntax highlighting + copy |
| `src/components/CodePreview/types.ts` | TypeScript interface for `CodePreviewProps` |
| `src/components/CodePreview/CodePreview.module.css` | Component styles |
| `src/components/CodePreview/index.ts` | Barrel export |
| `docs/patterns/hello-world.mdx` | Added example usage of `CodePreview` |
| `docs/planning/code-playground.md` | This document |
| `sidebars.ts` | Added `planning/code-playground` to Planning sidebar category |
