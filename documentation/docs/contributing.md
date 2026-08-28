---
sidebar_position: 10
title: Contributing to Soroban Cookbook
description: Learn how to contribute to the Soroban Cookbook project.
---

First off, thank you for considering contributing to the Soroban Cookbook! It's people like you that make this a great resource for the Stellar community.

This guide will help you get started with the contribution process, from setting up your development environment to submitting your first pull request.

---

## 🚀 Getting Started

### Project Overview
Soroban Cookbook is a comprehensive documentation platform for Stellar smart contract development. We aim to provide interactive guides, patterns, and tutorials that are easy to follow and production-ready.



Soroban Cookbook is a comprehensive documentation platform for Stellar smart contract development. We aim to provides interactive guides, patterns, and tutorials that are easy to follow and production-ready.

### Types of Contributions

We welcome several types of contributions:

- **Documentation:** Improving explanations, fixing typos, or adding new guides.
- **Smart Contract Examples:** Adding new reusable patterns or contract examples.
- **UI/UX Improvements:** Enhancing the website's look, feel, and accessibility.
- **Bug Fixes:** Identifying and resolving issues in code or documentation.

---

## 🛠️ Setup Instructions

To contribute code or documentation changes, you'll need to set up the project locally.

### Prerequisites

- **Rust & Soroban CLI:** [Install Rust](https://www.rust-lang.org/tools/install) and the [Soroban CLI](https://developers.stellar.org/docs/smart-contracts/getting-started/setup#install-the-soroban-cli).

- **Rust & Soroban CLI:** [Install Rust](https://www.rust-lang.org/tools/install) and the [Soroban CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli).
- **Bun:** We use [Bun](https://bun.sh/) as our primary JavaScript runtime and package manager.
- **Git:** For version control.

### Local Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/Soroban-Cookbook/Soroban_Cookbook_online.git
   cd Soroban_Cookbook_online
   ```

2. **Install Dependencies**

   ```bash
   cd documentation
   bun install  # (alternative: npm install)
   ```

3. **Run Development Server**
   ```bash
   bun start    # (alternative: npm start)
   ```
   The site will be available at `http://localhost:3000`.

---

## 🌿 Branching & PR Conventions

### Branch Naming

Keep your branches scoped to a single concern. Use the following naming convention:

- `feat/...` for new features or patterns.
- `fix/...` for bug fixes.
- `docs/...` for documentation-only changes.
- `chore/...` for maintenance tasks.

### Commit Messages

We follow a lightweight conventional commit style:

- `feat: add liquidity pool pattern`
- `fix: correct typo in storage docs`
- `docs: update contributing guide`

### Pull Requests

A high-quality PR includes:

- **Clear Title:** Concise summary of the change.
- **Detailed Description:** What changed and why.
- **Issue Link:** Reference any related issues (e.g., `Closes #123`).
- **Media:** Screenshots or recordings for any UI changes.

---

## 📑 Contribution Workflows

### A. Documentation Contributions

Docs are written in **MDX** and located in `documentation/docs/`.

- **Cross-linking:** Always use relative paths for internal links (e.g., `[Setup](./setup.md)`).
- **Formatting:** Follow the existing structure and use standard Markdown.
- **Metadata:** Ensure every page has proper frontmatter (title, description).

### B. Example / Code Contributions

Contract examples should be minimal, focused, and well-documented.

- **Storage:** Use `examples/` for standalone Rust projects (if applicable).
- **Inline Docs:** Explain complex logic within the Rust code snippets using comments.
- **Best Practices:** Follow [Soroban Best Practices](https://developers.stellar.org/docs/build/smart-contracts/example-contracts).

### C. Fixes & Improvements

- **Scope:** Keep PRs small. Avoid unrelated refactors in the same PR.
- **Validation:** Ensure your fix doesn't break existing functionality.

---

## 🧪 Local Validation Steps

Before submitting a PR, you **must** run the following checks in the `documentation/` directory:

```bash
# Using bun (recommended)
bun run typecheck
bun run lint
bun run format:check
bun run build

# Using npm (fallback)
npm run typecheck
npm run lint
npm run format:check
npm run build
```

For Rust code examples, ensure they compile and pass tests:

```bash
cargo check
cargo test
cargo fmt --all -- --check
```

---

## ✅ Pre-PR Checklist

Before you hit "Submit", make sure you've checked these off:

- [ ] My code compiles successfully without warnings.
- [ ] Documentation renders correctly in the local dev server.
- [ ] I have verified all links are functional.
- [ ] My changes are scoped and minimal.
- [ ] I have followed the project's styling and coding conventions.
- [ ] No linting or formatting errors remain.

### ♿ Accessibility (A11y) Checklist

All UI changes must meet **WCAG 2.1 Level AA** standards. Use this checklist for any component, page, or styling changes:

#### Keyboard Navigation
- [ ] All interactive elements (buttons, links, inputs) are reachable via Tab key.
- [ ] Focus order is logical and follows visual left-to-right, top-to-bottom flow.
- [ ] Focus indicators are visible (2px outline with clear contrast).
- [ ] No keyboard traps (user cannot tab away from a component without using Escape).
- [ ] **If adding modals/dropdowns:** Verify focus is trapped inside when open, returns to trigger on close.

#### ARIA Attributes
- [ ] Semantic HTML is used where possible (e.g., `<button>`, `<nav>`, `<main>`, not `<div onclick>`).
- [ ] Interactive components have appropriate `role`, `aria-label`, or `aria-labelledby`.
- [ ] Live regions use `role="alert"` with `aria-live="assertive"` for errors; `aria-live="polite"` for notices.
- [ ] Icon-only buttons have `aria-label` describing the action.
- [ ] Toggle buttons include `aria-pressed="true"` or `aria-pressed="false"`.
- [ ] Disabled elements have `aria-disabled="true"` in addition to `disabled` attribute.

#### Color & Contrast
- [ ] Text meets **4.5:1 contrast ratio** (WCAG AA) for normal text, **3:1 for large text** (18pt+).
- [ ] **Do not rely on color alone** to convey information (e.g., error messages must have icon + text, not just red color).
- [ ] Test with high contrast mode and in browser DevTools' contrast checker.
- [ ] Dark mode variants have the same contrast ratios as light mode.

#### Images & Icons
- [ ] Every `<img>` has descriptive `alt` text (e.g., `alt="Stellar logo"`, not `alt="image"`).
- [ ] Decorative icons have `aria-hidden="true"` and `focusable="false"`.
- [ ] Icon buttons use `<Icon aria-label="..." />` with a descriptive label.
- [ ] SVGs with semantic meaning have `role="img"` and `aria-label`.

#### Motion & Animations
- [ ] Animations respect `prefers-reduced-motion: reduce` media query.
- [ ] Avoid auto-playing videos or animations; provide a pause/play control.
- [ ] No parallax effects or rapidly flashing content (>3 Hz).

#### Forms & Inputs
- [ ] All form inputs have associated `<label>` elements (via `htmlFor` or wrapping).
- [ ] Error messages are linked to inputs via `aria-describedby`.
- [ ] Required fields are marked with `aria-required="true"` or use semantic `required` attribute.
- [ ] Form submission provides clear error summary and focus management.

#### Skip Links & Navigation
- [ ] Skip-to-content link is present and functional (jumps to main content).
- [ ] Main navigation is keyboard accessible and properly labeled (e.g., `<nav aria-label="Main navigation">`).
- [ ] Search component is keyboard accessible and screen-reader friendly.

#### Screen Reader Testing
- [ ] Test with at least one screen reader:
  - **Windows:** NVDA (free, recommended) or JAWS
  - **macOS:** VoiceOver (built-in)
  - **Online:** WAVE or axe DevTools browser extension
- [ ] Page structure is logical when read aloud (headings, landmarks, list items).
- [ ] Form labels and error messages are announced correctly.
- [ ] Interactive states (e.g., selected tabs, expanded dropdowns) are announced.

#### Manual Testing Checklist
- [ ] Tab through the page end-to-end with keyboard only (no mouse).
- [ ] Verify focus indicators are clear at each step.
- [ ] Test skip-link functionality by pressing Tab immediately after page load.
- [ ] Open DevTools → Colors/Contrast tool and verify all text.
- [ ] Enable high contrast mode and ensure layout remains usable.
- [ ] Reduce zoom to 200% and verify no horizontal overflow or text cutoff.

#### Automated Testing
- [ ] Run `bun run lint` (includes ESLint checks for JSX a11y patterns).
- [ ] Use browser extensions to scan:
  - **axe DevTools** (free): https://www.deque.com/axe/devtools/
  - **WAVE** (free): https://wave.webaim.org/extension/
  - **Lighthouse** (Chrome DevTools > Lighthouse tab)
- [ ] Fix any reported violations before submitting PR.

---

## 🔍 Review Expectations

### What Reviewers Look For

- **Correctness:** Does the code/doc work as intended?
- **Clarity:** Is the explanation easy to understand for a beginner?
- **Consistency:** Does it follow the existing patterns and design tokens?
- **Utility:** Does this add value to the cookbook?

### Iteration Process

Expect some feedback! We might ask for clarifications or small adjustments. This is part of maintaining high standards for the community.

---

## 📞 Getting Help

If you're stuck, feel free to:

- Open a [GitHub Discussion](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/discussions).

- Open a [GitHub Issue](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues).
- Join the [Stellar Dev Discord](https://discord.gg/stellardev) and ask in the `#soroban` channel.

---

**Thank you for helping us build the best Soroban resource! 🚀**

---

## Related links

- [Internal Linking Strategy](/docs/contributing/internal-linking) — how we structure cross-links for SEO and navigation
- [Adding a Tested Code Example](/docs/contributing/add-tested-example) — contribute verified examples
- [Pattern Library](/docs/patterns/overview) — where new patterns are catalogued
