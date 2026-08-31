---
sidebar_position: 4
title: Code Playground (Phase 2 Planning)
description: Requirements, architecture, mockups, and timeline for the interactive code playground.
---

# Code Playground — Phase 2: Interactive Code Playground Planning

**Issue:** [#74 — Playground Planning](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues/74)
**Dependent Issues:** [#136](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues/136), [#137](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues/137), [#138](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues/138), [#139](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues/139), [#140](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues/140)

## Objective

Plan the interactive code playground feature for the Soroban Cookbook. This document defines requirements, evaluates technical architectures, proposes UI/UX mockups, identifies integration points, and establishes a timeline and milestones.

## Requirements

- **In-browser code editing**: Allow users to edit Rust/Soroban code snippets directly in the browser.
- **Compilation**: Compile Rust code to WASM either in-browser or via a remote API.
- **Execution**: Execute the compiled WASM in a sandboxed environment and display the result.
- **Integration**: Embed playground components into MDX documentation pages.
- **MVP scope**: Support the `hello-world` example end-to-end (edit, compile, run, output).

## Technical Architecture

### Option A: WASM compile in-browser

- Use `crate` `soroban-sdk` with `wasm-bindgen` and a Rust-to-WASM compiler (e.g. `wasm-unknown-unknown` target).
- Pros: No server cost, offline support, low latency.
- Cons: Large WASM bundle, browser compatibility issues, complex toolchain.

### Option B: Remote compilation API

- Build a backend service that receives Rust source and returns compiled WASM.
- Pros: Simpler frontend, full toolchain control, easier to update.
- Cons: Requires server infrastructure, network latency, potential scalability challenges.

**Decision**: For the MVP, use a remote API (Option B) to avoid browser compilation complexity. Later, if needed, evaluate in-browser compilation as an enhancement.

## UI/UX Mockups

- A playground panel embedded below code snippets.
- Layout: Code editor on the left, output console on the right.
- Buttons: "Run", "Reset", "Copy".
- Editor: Monaco editor for Rust syntax highlighting.
- Output: Scrollable console showing stdout/stderr or compilation errors.

## Integration Points

- Docusaurus MDX: Create a `<Playground>` component to wrap code snippets.
- Reuse existing `CodePreview` component for read-only display.
- Add a "Run in Playground" button to code blocks via Docusaurus theme extension or custom MDX components.
- Build a small HTTP API endpoint for compilation/execution.

## Timeline and Milestones

| Milestone | Description | Estimated Time |
|-----------|-------------|----------------|
| M1 | Requirements and architecture finalized | Week 1 |
| M2 | Backend compilation service prototype | Week 2 |
| M3 | Frontend playground component integration | Week 3 |
| M4 | MVP complete: hello-world compiles and runs | Week 4 |

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

## Alignment with Phase 4 Features

This planning document defines the architecture for the playground. The Phase 4 implementation follows these plans:

- Uses the same component-based architecture pattern
- Follows the existing CSS module and TypeScript conventions
- Adds a lightweight preview layer that can be extended later with the full playground features

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
