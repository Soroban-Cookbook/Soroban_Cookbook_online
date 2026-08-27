#!/usr/bin/env python3
"""Agent 3: Replace generic enrichment in PHASE_*_ISSUES.md with codebase-specific context."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ENRICHMENT_RE = re.compile(
    r"\n\*\*Current state:\*\*[\s\S]*?\*\*Related code links:\*\*[^\n]*\n?",
    re.MULTILINE,
)
ISSUE_PATTERN = re.compile(r"^### Issue #(\d+):\s*(.+)$", re.MULTILINE)

# Hand-tuned + generated enrichments keyed by global issue number.
ENRICHMENT: dict[int, dict[str, str]] = {
    36: {
        "current": "Skip-link styles in `custom.css`; ARIA roles on Alert, Callout, and ThemeToggle; focus-visible tokens in `design-tokens.css`. No automated audit tooling.",
        "gap": "No axe/pa11y CI job, no WCAG 2.1 AA checklist, and keyboard/screen-reader testing not documented.",
        "deps": "Issue #206 (Accessibility testing automation) for CI enforcement.",
        "approach": "- Run axe-core on `/`, `/docs/patterns/hello-world`, and `/404`\n- Fix contrast/focus gaps in `custom.css` and component CSS modules\n- Document manual a11y checklist in `CONTRIBUTING.md`",
        "verify": "axe DevTools or `@axe-core/cli` reports zero critical violations; tab through navbar, search, and doc TOC.",
        "links": "`documentation/src/css/custom.css`, `documentation/src/components/Alert/Alert.tsx`, `documentation/src/components/ThemeToggle/ThemeToggle.tsx`",
    },
    38: {
        "current": "`docusaurus.config.ts` references `img/favicon.ico` and OG image paths; `scripts/generate-icons.sh` and `generate-icons.js` exist. `static/img/` only has logo SVGs and Docusaurus placeholders — no favicon or touch icons.",
        "gap": "Missing favicon.ico, apple-touch-icon, android-chrome sizes, webmanifest, and Windows tile images referenced by acceptance criteria.",
        "deps": "None",
        "approach": "- Run `bash scripts/generate-icons.sh` from `static/img/logo.svg`\n- Commit generated assets under `documentation/static/img/`\n- Add `<link rel=\"apple-touch-icon\">` and manifest entries via `headTags` in config",
        "verify": "Browser tab shows favicon; DevTools → Application → Manifest lists icons; `bun run build` succeeds.",
        "links": "`scripts/generate-icons.sh`, `documentation/docusaurus.config.ts`, `documentation/static/img/`",
    },
    42: {
        "current": "Platform guides exist for Linux (`setup-linux.md`) and Windows (`setup-windows.md`); generic `setup.md` covers Rust/CLI install. No macOS-specific guide; sidebar lists setup paths in `sidebars.ts` without a macOS entry.",
        "gap": "Missing Homebrew/Xcode steps, macOS-specific troubleshooting, screenshots, and sidebar link for macOS setup.",
        "deps": "Issue #45 (First Contract) for verification flow cross-links.",
        "approach": "- Create `documentation/docs/getting-started/setup-macos.md` mirroring Linux/Windows structure\n- Add Homebrew Rust install, Xcode CLI tools, and Soroban CLI paths\n- Register in `sidebars.ts` under Getting Started",
        "verify": "Follow guide on macOS (or review with macOS contributor); `bun run build` passes with new doc linked.",
        "links": "`documentation/docs/getting-started/setup-linux.md`, `documentation/docs/getting-started/setup-windows.md`, `documentation/sidebars.ts`",
    },
    46: {
        "current": "Three Rust examples (`hello-world`, `counter`, `token-transfer`) include unit tests and snapshot tests; `scripts/test-examples.sh` runs them in CI. No dedicated testing guide doc in `getting-started/`.",
        "gap": "Missing documentation on test structure, helpers, mocking, coverage, and best practices with multiple tested examples.",
        "deps": "Issue #71 (example CI) — already done; builds on existing `examples/*/src/test.rs` patterns.",
        "approach": "- Add `documentation/docs/getting-started/contract-testing.md`\n- Walk through `examples/counter/src/test.rs` and token-transfer error tests\n- Link from `first-contract.md` and add to sidebar",
        "verify": "Doc code blocks match example APIs; `bash scripts/test-examples.sh` passes; `bun run build` passes.",
        "links": "`examples/counter/src/test.rs`, `examples/token-transfer/src/test.rs`, `scripts/test-examples.sh`",
    },
    48: {
        "current": "`getting-started/debugging.md` covers common errors; `testing-errors.md` exists. Soroban CLI simulation commands not documented as a cohesive local-testing guide.",
        "gap": "No single doc for local env setup, CLI invoke/simulate workflows, test data management, or performance testing locally.",
        "deps": "Issue #46 (Contract Testing Guide) for test-focused content.",
        "approach": "- Create `documentation/docs/getting-started/local-testing.md`\n- Document `soroban contract invoke`, `--simulate`, and ledger snapshot usage\n- Cross-link debugging.md troubleshooting sections",
        "verify": "CLI commands copy-paste cleanly; build passes; optional manual run against testnet.",
        "links": "`documentation/docs/getting-started/debugging.md`, `documentation/docs/getting-started/testing-errors.md`, `examples/`",
    },
    52: {
        "current": "Soroban CLI and Rust toolchain referenced across setup docs; VS Code mentioned in `setup.md`. No consolidated tools overview page.",
        "gap": "Missing inventory of IDE extensions, debugging tools, deployment utilities, and monitoring resources with usage examples.",
        "deps": "Issues #42–#51 (getting started) for cross-links.",
        "approach": "- Add `documentation/docs/getting-started/development-tools.md`\n- Group Soroban CLI, Stellar Lab, explorer, and editor extensions\n- Add recommendation table and external links",
        "verify": "All linked resources resolve; page in sidebar; `bun run build` passes.",
        "links": "`documentation/docs/getting-started/setup.md`, `documentation/docs/getting-started/debugging.md`",
    },
    55: {
        "current": "No video scripts, storyboards, or planning docs in repo. Text guides (`first-contract.md`, pattern pages) could serve as source material.",
        "gap": "Missing written scripts, recording plan, visual aid list, and production timeline.",
        "deps": "Issues #45, #46 (content to adapt into scripts).",
        "approach": "- Create `documentation/docs/planning/video-tutorials.md` (or `docs/internal/` if preferred)\n- Draft scripts from existing getting-started flow\n- List screen regions, CLI commands, and B-roll needs",
        "verify": "Scripts cover Getting Started + First Contract end-to-end; timeline with milestones documented.",
        "links": "`documentation/docs/getting-started/first-contract.md`, `documentation/docs/patterns/hello-world.mdx`",
    },
    66: {
        "current": "No `concepts/time.md` or pattern doc. Ledger time APIs not covered in existing concept pages.",
        "gap": "Missing explanation of Soroban time/timestamp handling, scheduling patterns, and worked examples.",
        "deps": "Issue #96 (Timelock Vault) for advanced time-based pattern cross-link.",
        "approach": "- Add `documentation/docs/concepts/time-and-scheduling.md`\n- Cover `env.ledger().timestamp()`, time-locked logic, and timezone off-chain notes\n- Add minimal Rust snippet in `examples/` or inline MDX",
        "verify": "Concept page in sidebar; code examples compile if extracted to example crate.",
        "links": "`documentation/docs/concepts/storage.md`, `documentation/sidebars.ts`",
    },
    67: {
        "current": "No randomness/entropy documentation. Security fundamentals touch authorization but not RNG.",
        "gap": "Missing doc on Soroban randomness sources, predictability risks, and secure patterns.",
        "deps": "Issue #64 (Security fundamentals) for security cross-links.",
        "approach": "- Add `documentation/docs/concepts/randomness.md`\n- Explain on-chain entropy limitations and recommended patterns\n- Link to Stellar/Soroban official RNG guidance",
        "verify": "Page builds; security implications section present; internal links valid.",
        "links": "`documentation/docs/security/fundamentals.md`, `documentation/docs/concepts/best-practices.md`",
    },
    68: {
        "current": "`examples/token-transfer/` implements a minimal custom token (mint/transfer/balance). No SAC overview or standards comparison doc.",
        "gap": "Missing Stellar Asset Contract (SAC) documentation, interface comparison, and best-practice guidance.",
        "deps": "Issue #81 (Basic Token) — extend from existing token-transfer example.",
        "approach": "- Add `documentation/docs/concepts/token-standards.md`\n- Contrast SAC vs custom token in `examples/token-transfer/`\n- Document when to use each approach",
        "verify": "`bash scripts/test-examples.sh` still passes; new doc linked from patterns overview.",
        "links": "`examples/token-transfer/src/lib.rs`, `documentation/docs/patterns/overview.md`",
    },
    69: {
        "current": "Example crates use unit + snapshot tests; CI runs `test-examples.sh`. No advanced testing strategy doc (integration, fuzzing, CI).",
        "gap": "Missing documentation on integration tests, property testing, test organization, mocks, and CI integration patterns.",
        "deps": "Issue #46 (Contract Testing Guide).",
        "approach": "- Add `documentation/docs/concepts/testing-strategies.md`\n- Reference workspace layout in `examples/Cargo.toml`\n- Document CI job in `.github/workflows/ci.yml` test-examples",
        "verify": "Strategies doc references real example paths; CI section matches actual workflow.",
        "links": "`examples/Cargo.toml`, `.github/workflows/ci.yml`, `scripts/test-examples.sh`",
    },
    72: {
        "current": "Docusaurus default `CodeBlock` with Prism (rust/toml/bash); `QuickStartSection` has custom copy-to-clipboard. No shared enhanced CodeSnippet component with line numbers, tabs, or filename display.",
        "gap": "Missing reusable component with line highlighting, file names, multi-tab support, and a11y-compliant copy feedback site-wide.",
        "deps": "Issue #124 (Tabs) — pattern pages already use `@theme/Tabs`.",
        "approach": "- Create `documentation/src/components/CodeSnippet/`\n- Swizzle or wrap `@theme/CodeBlock` with title/line props\n- Register in `MDXComponents.tsx` and migrate one pattern page as reference",
        "verify": "Component on `components-demo` page; `bun run build` and `bun run lint` pass.",
        "links": "`documentation/src/components/QuickStartSection/index.tsx`, `documentation/src/theme/MDXComponents.tsx`, `documentation/docs/patterns/hello-world.mdx`",
    },
    73: {
        "current": "No `@docusaurus/theme-mermaid` or mermaid dependency in `package.json`. Diagrams are ASCII/code only in docs.",
        "gap": "Mermaid not configured; no flowchart/sequence examples; dark-mode diagram styling absent.",
        "deps": "None",
        "approach": "- Add `@docusaurus/theme-mermaid` to `documentation/package.json`\n- Enable in `docusaurus.config.ts` markdown.mermaid\n- Add sample diagram to `concepts/cross-contract-invocation.md`",
        "verify": "Mermaid renders in dev and production build; dark theme readable.",
        "links": "`documentation/package.json`, `documentation/docusaurus.config.ts`, `documentation/docs/concepts/cross-contract-invocation.md`",
    },
    74: {
        "current": "No playground architecture doc or UI mockups. Rust examples compile locally only via CLI.",
        "gap": "Missing requirements, technical architecture, integration points, and milestone timeline for an in-browser playground.",
        "deps": "Issues #136–#140 (Code Playground implementation) depend on this plan.",
        "approach": "- Create planning doc under `documentation/docs/planning/code-playground.md`\n- Evaluate WASM compile-in-browser vs remote API options\n- Define MVP scope tied to hello-world example",
        "verify": "Architecture doc reviewed; dependencies for Phase 4 playground issues listed.",
        "links": "`examples/hello-world/`, `documentation/docs/patterns/hello-world.mdx`",
    },
    75: {
        "current": "Global OG/Twitter meta in `docusaurus.config.ts` headTags; sitemap auto-generated on build. Per-page `description` frontmatter sparse; no systematic internal linking or schema markup.",
        "gap": "Missing per-doc meta descriptions, keyword strategy, heading audit, alt-text pass, and structured data.",
        "deps": "Issues #176, #184 (Phase 5 SEO) overlap — coordinate to avoid duplicate work.",
        "approach": "- Add `description` frontmatter to all docs in `documentation/docs/`\n- Audit H1/H2 hierarchy per page\n- Add internal cross-links between getting-started and concepts",
        "verify": "Lighthouse SEO score ≥ 90 on sample pages; no duplicate H1s; build passes.",
        "links": "`documentation/docusaurus.config.ts`, `documentation/docs/`, `documentation/sidebars.ts`",
    },
    77: {
        "current": "Single-version docs site; no `@docusaurus/plugin-content-docs` versioning configured. All content under `documentation/docs/`.",
        "gap": "No version dropdown, archived versions, version-specific content, or migration guides.",
        "deps": "Stable Soroban SDK release cadence documentation from Stellar.",
        "approach": "- Enable docs versioning in `docusaurus.config.ts`\n- Create `versioned_docs/` when first SDK freeze point chosen\n- Add migration guide template under `docs/migrations/`",
        "verify": "Version dropdown appears; old version builds; migration doc linked.",
        "links": "`documentation/docusaurus.config.ts`, `documentation/docs/index.md`",
    },
    79: {
        "current": "No feedback widget component. `NewsletterSignup` collects emails via optional endpoint in `customFields.newsletterEndpoint`.",
        "gap": "Missing per-page helpfulness widget, error report flow, analytics hook, and privacy notice.",
        "deps": "Issue #80 or #259 for analytics backend (optional).",
        "approach": "- Create `documentation/src/components/DocFeedback/`\n- Add thumbs up/down + GitHub issue link fallback\n- Mount via swizzled DocItem footer or MDX wrapper",
        "verify": "Widget renders on doc pages; feedback action opens issue or POST endpoint; build passes.",
        "links": "`documentation/src/components/NewsletterSignup/`, `documentation/docusaurus.config.ts`",
    },
    80: {
        "current": "`@docusaurus/plugin-google-analytics` available transitively but not configured in `docusaurus.config.ts`. No GA/GTM tracking ID or custom events.",
        "gap": "Analytics not enabled; no page-view tracking, popular-pages dashboard, or GDPR consent flow.",
        "deps": "Issue #259 (Google Analytics Setup in Phase 7) — align implementation.",
        "approach": "- Add `gtag` or `googleAnalytics` block to `docusaurus.config.ts` with env-based tracking ID\n- Document opt-out and privacy policy requirements\n- Track doc page views and search usage",
        "verify": "GA real-time shows page views on staging; cookie consent if required.",
        "links": "`documentation/docusaurus.config.ts`, `documentation/package.json`",
    },
}

# Phase 3: pattern library (#81-119)
for n, title, current, gap, deps, approach, verify, links in [
    (81, "Basic Token", "`examples/token-transfer/` has mint/transfer/balance with tests and snapshots; no pattern MDX page or deployment guide.", "Missing full pattern doc, SAC comparison, and step-by-step deploy guide beyond raw example.", "Issue #68 (Token Standards Overview).", "- Extend `examples/token-transfer/` if gaps found\n- Add `documentation/docs/patterns/basic-token.mdx` with PatternMeta\n- Wire into sidebar and `patterns/overview.md`", "`bash scripts/test-examples.sh`; pattern page builds.", "`examples/token-transfer/`, `documentation/docs/patterns/overview.md`"),
    (82, "Token Metadata", "token-transfer has no name/symbol/decimals/total_supply fields or events.", "Metadata extension functions and docs absent.", "Issue #81.", "- Add metadata storage keys to token example\n- Emit events on mint; document in pattern page", "Tests cover metadata getters; example compiles.", "`examples/token-transfer/src/lib.rs`"),
    (83, "Token Burn", "No burn function in token-transfer.", "Burn with authorization and supply tracking not implemented.", "Issue #81.", "- Add `burn` with `require_auth`\n- Update tests for supply decrease", "New burn tests pass in CI.", "`examples/token-transfer/`"),
    (84, "Token Allowance", "No approve/transfer_from in token-transfer.", "Allowance mapping and transferFrom pattern missing.", "Issue #81.", "- Add allowance storage and approval flow\n- Test delegated transfers", "Allowance tests in test-examples CI.", "`examples/token-transfer/`"),
    (85, "Token Wrapper", "No wrapper example crate.", "Wrapper contract pattern not implemented.", "Issues #81, #68.", "- Create `examples/token-wrapper/`\n- Wrap existing token interface with fee or logging", "New crate added to workspace + test script.", "`examples/Cargo.toml`, `scripts/test-examples.sh`"),
    (86, "Multi-Token Vault", "No vault example.", "Multi-asset vault pattern absent.", "Issue #81.", "- Create `examples/multi-token-vault/`\n- Document deposit/withdraw for multiple token types", "Vault tests pass.", "`examples/`"),
    (87, "Token Vesting", "No vesting contract.", "Vesting schedule logic not implemented.", "Issue #66 (Time concepts).", "- Create `examples/token-vesting/`\n- Use ledger timestamp for cliff/unlock", "Vesting tests with time simulation.", "`examples/`"),
    (88, "Token Snapshot", "No snapshot feature.", "Historical balance snapshot pattern missing.", "Issue #81.", "- Add snapshot key pattern or event indexing approach\n- Document off-chain indexer integration", "Snapshot tests pass.", "`examples/token-transfer/`"),
    (89, "Pausable Token", "No pause guard in examples.", "Emergency pause pattern not demonstrated.", "Issue #118 (Emergency Stop).", "- Add admin pause flag to token example\n- Test paused transfer rejection", "Pause tests pass.", "`examples/token-transfer/`"),
    (90, "Token Security Audit Doc", "`security/fundamentals.md` exists; no token-specific audit checklist.", "Token security audit documentation missing.", "Issues #81–#89.", "- Add `documentation/docs/security/token-audit.md`\n- Checklist: overflow, auth, pause, centralization", "Doc in Security sidebar; links to token patterns.", "`documentation/docs/security/fundamentals.md`"),
    (91, "Escrow Basic", "No escrow example.", "Basic escrow contract absent.", "Issue #81.", "- Create `examples/escrow-basic/`\n- Two-party release on condition", "Escrow tests in CI.", "`examples/`"),
    (92, "Escrow Multi-Party", "No multi-party escrow.", "N-party escrow pattern missing.", "Issue #91.", "- Extend escrow with arbitrator role\n- Multi-sig release flow", "Tests cover dispute paths.", "`examples/escrow-basic/`"),
    (93, "Atomic Swap", "No swap example.", "Atomic swap pattern not implemented.", "Issues #81, #91.", "- Create `examples/atomic-swap/`\n- Hash-lock or HTLC-style swap", "Swap tests pass.", "`examples/`"),
    (94, "Simple AMM", "No liquidity pool example.", "Constant-product AMM missing.", "Issue #81.", "- Create `examples/simple-amm/`\n- Pool add/remove liquidity + swap", "AMM invariant tests.", "`examples/`"),
    (95, "AMM with Fees", "No fee logic in AMM.", "Trading fee collection not implemented.", "Issue #94.", "- Add fee basis points to pool\n- Test fee accrual to LPs", "Fee math tests pass.", "`examples/simple-amm/`"),
    (96, "Timelock Vault Basic", "No timelock example.", "Basic timelock vault absent.", "Issue #66.", "- Create `examples/timelock-vault/`\n- Lock until timestamp", "Time-based unlock tests.", "`examples/`"),
    (97, "Timelock Advanced", "No advanced timelock.", "Gradual unlock / vesting vault missing.", "Issue #96.", "- Extend vault with tranches\n- Document admin recovery limits", "Tranche release tests.", "`examples/timelock-vault/`"),
    (98, "Staking Contract", "No staking example.", "Stake/unstake/reward pattern absent.", "Issue #81.", "- Create `examples/staking/`\n- Reward distribution over epochs", "Staking tests pass.", "`examples/`"),
    (99, "Flash Loan", "No flash loan pattern.", "Borrow-repay-same-tx pattern missing.", "Issues #94, #98.", "- Create `examples/flash-loan/`\n- Enforce repayment in single invocation", "Flash loan revert tests.", "`examples/`"),
    (100, "DeFi Security Guide", "Partial coverage in `security/fundamentals.md`.", "DeFi-specific risks (reentrancy, oracle, AMM) not consolidated.", "Issues #91–#99.", "- Add `documentation/docs/security/defi-best-practices.md`\n- Link each DeFi example's risk section", "Doc in sidebar; cross-links valid.", "`documentation/docs/security/fundamentals.md`"),
    (101, "Simple Voting", "No voting contract.", "Basic yes/no voting absent.", "Issue #57 (Authorization).", "- Create `examples/simple-voting/`\n- One vote per address", "Vote tally tests.", "`examples/`"),
    (102, "Weighted Voting", "No token-weighted voting.", "Weight-by-balance voting missing.", "Issues #81, #101.", "- Extend voting with token balance weights", "Weighted tally tests.", "`examples/simple-voting/`"),
    (103, "Multi-Sig Wallet", "Authorization docs exist; no multisig example.", "Multi-signature wallet pattern not implemented.", "Issue #57.", "- Create `examples/multisig-wallet/`\n- M-of-N authorization", "Multisig tests pass.", "`documentation/docs/concepts/authorization.md`"),
    (104, "Simple DAO", "No DAO example.", "Proposal + vote + execute flow missing.", "Issues #101, #103.", "- Create `examples/simple-dao/`\n- Proposal lifecycle states", "DAO integration tests.", "`examples/`"),
    (105, "Timelock Governance", "No governance timelock.", "Delayed execution for passed proposals missing.", "Issues #96, #104.", "- Add timelock queue to DAO example", "Timelock delay tests.", "`examples/simple-dao/`"),
    (106, "Quadratic Voting", "No quadratic voting.", "Quadratic cost voting not implemented.", "Issue #101.", "- Add sqrt-weight voting math\n- Document griefing mitigations", "Quadratic tally tests.", "`examples/simple-voting/`"),
    (107, "Delegation", "No vote delegation.", "Delegate/revoke pattern missing.", "Issue #101.", "- Add delegation mapping to voting contract", "Delegation chain tests.", "`examples/simple-voting/`"),
    (108, "Proposal States", "No state machine doc/example.", "Draft→Active→Succeeded→Executed states not shown.", "Issue #104.", "- Implement explicit proposal enum states\n- Document transitions in pattern MDX", "State transition tests.", "`examples/simple-dao/`"),
    (109, "Governor Pattern", "No governor contract.", "Governor + timelock + executor split missing.", "Issues #104, #105.", "- Create `examples/governor/` composing DAO + timelock", "End-to-end governance tests.", "`examples/`"),
    (110, "Governance Security Guide", "Authorization + security fundamentals exist.", "Governance-specific attack vectors not documented.", "Issues #101–#109.", "- Add `documentation/docs/security/governance.md`\n- Cover flash-loan votes, quorum, timelock bypass", "Doc linked from governance examples.", "`documentation/docs/security/fundamentals.md`"),
    (111, "Cross-Contract Calls", "`concepts/cross-contract-invocation.md` documents theory; no dedicated minimal example crate.", "Working cross-contract example may be missing from `examples/`.", "Issue #61 (concept doc).", "- Create `examples/cross-contract/` caller + callee\n- Link from concept doc", "Cross-call tests in CI.", "`documentation/docs/concepts/cross-contract-invocation.md`"),
    (112, "Upgradeable Contract", "`patterns/lifecycle-upgrades.mdx` exists.", "Upgradeable pattern example crate may be missing.", "Issue #63.", "- Add `examples/upgradeable/` with admin upgrade flow\n- Align with lifecycle doc", "Upgrade tests pass.", "`documentation/docs/patterns/lifecycle-upgrades.mdx`"),
    (113, "Oracle Integration", "No oracle example.", "Oracle consumer pattern not implemented.", "None.", "- Create `examples/oracle-consumer/`\n- Document trust assumptions in security doc", "Oracle read tests with mock.", "`examples/`"),
    (114, "Factory Pattern", "No factory example.", "Contract factory/deploy pattern missing.", "Issue #111.", "- Create `examples/contract-factory/`\n- Deploy child contracts via deployer", "Factory deploy tests.", "`examples/`"),
    (115, "Access Control Lists", "`patterns/authorization.mdx` + concepts doc exist.", "ACL role-based example crate may be missing.", "Issue #57.", "- Create `examples/access-control/`\n- Role enum + only_role modifier pattern", "ACL denial tests.", "`documentation/docs/patterns/authorization.mdx`"),
    (116, "Merkle Proof", "No merkle example.", "Merkle proof verification pattern absent.", "None.", "- Create `examples/merkle-proof/`\n- Airdrop claim with proof verification", "Valid/invalid proof tests.", "`examples/`"),
    (117, "Batch Operations", "No batch example.", "Batch execute pattern for gas efficiency missing.", "None.", "- Create `examples/batch-ops/`\n- Loop authorized actions with limit guards", "Batch partial failure tests.", "`examples/`"),
    (118, "Emergency Stop", "No pause pattern example beyond token scope.", "Global emergency stop pattern not isolated.", "Issue #89.", "- Create `examples/emergency-stop/`\n- Admin circuit breaker wrapper", "Stop/resume tests.", "`examples/`"),
    (119, "Reentrancy Guard", "No reentrancy example.", "Reentrancy guard pattern not demonstrated.", "Issue #100.", "- Create `examples/reentrancy-guard/`\n- Mutex flag on external calls", "Reentrancy attack simulation test.", "`examples/`"),
]:
    ENRICHMENT[n] = {
        "current": current,
        "gap": gap,
        "deps": deps,
        "approach": approach,
        "verify": verify,
        "links": links,
    }

# Phase 4: UI/UX (#121-160 except completed 124,127,131,150,151)
PHASE4 = {
    121: ("`@easyops-cn/docusaurus-search-local` provides basic full-text search with navbar autocomplete; `search-experience.css` styles results.", "No custom filters by category/difficulty/tags or advanced search UI component.", "Issues #165–#169 (Phase 5 search enhancements).", "- Extend search plugin config or swizzle SearchBar\n- Add filter chips component on `/search` page\n- Index pattern metadata tags", "Search returns filtered results; keyboard nav works.", "`documentation/docusaurus.config.ts`, `documentation/src/css/search-experience.css`"),
    122: ("`PatternPreview` on homepage filters patterns by category client-side.", "No site-wide pattern filter on `/docs/patterns/*`; difficulty/tags not filterable.", "Issue #127 (Difficulty Badge) — done.", "- Extract filter logic from PatternPreview to shared hook\n- Add filter bar to patterns overview page", "Filters update pattern grid without full reload.", "`documentation/src/components/PatternPreview/PatternPreview.tsx`, `documentation/docs/patterns/overview.md`"),
    123: ("Copy-to-clipboard in `QuickStartSection` with visual feedback; Docusaurus default code blocks lack enhanced copy UX.", "No site-wide copy button with analytics, multi-block support, or consistent a11y labels.", "Issue #72 (Code Snippet Component).", "- Swizzle `@theme/CodeBlock` copy button\n- Reuse QuickStartSection feedback pattern\n- Optional analytics event on copy", "Copy works on doc pages; screen reader announces success.", "`documentation/src/components/QuickStartSection/index.tsx`"),
    125: ("Docusaurus `<details>` supported in MDX; no styled Collapsible component.", "No reusable Collapsible with design-system styling and keyboard support.", "None.", "- Create `documentation/src/components/Collapsible/`\n- Register in MDXComponents\n- Document in design-system docs", "Expand/collapse via keyboard; build passes.", "`documentation/src/theme/MDXComponents.tsx`"),
    126: ("No tutorial progress UI.", "Multi-step tutorials lack progress indicator.", "Issue #148 (Progress Tracking).", "- Create `TutorialProgress` bar component\n- Drive from frontmatter `steps` array on getting-started pages", "Progress updates as user scrolls or clicks steps.", "`documentation/docs/getting-started/first-contract.md`"),
    128: ("`PatternMeta` may show metadata; no generic EstimatedTime component.", "Estimated read/time not shown on all tutorial pages.", "Issue #127 (PatternMeta).", "- Add `EstimatedTime` to PatternDoc exports\n- Parse `time` frontmatter field on docs", "Time badge visible on pattern + getting-started pages.", "`documentation/src/components/PatternDoc/PatternDoc.tsx`"),
    129: ("Setup docs list prerequisites inline; no interactive checker.", "No UI to verify Rust/CLI installed before starting tutorial.", "Issues #42–#44 (platform setup).", "- Create client-side checklist component (manual confirm or CLI detection docs)\n- Embed on `getting-started/setup.md`", "Checklist renders; links to platform guides.", "`documentation/docs/getting-started/setup.md`"),
    130: ("Pattern pages siloed; overview lists patterns without related links.", "No RelatedPatterns component suggesting similar patterns.", "Issue #122 (Pattern Filter).", "- Create `RelatedPatterns` using tag/category metadata\n- Add to pattern MDX template via PatternSection", "Related links appear at bottom of hello-world page.", "`documentation/docs/patterns/hello-world.mdx`"),
    132: ("Docusaurus default breadcrumbs on doc pages.", "No custom styling or extra context (e.g. pattern difficulty in crumb).", "None.", "- Swizzle Breadcrumbs theme component\n- Apply design tokens from custom.css", "Breadcrumbs match design system in light/dark.", "`documentation/src/css/custom.css`"),
    133: ("Doc sidebar scrolls independently; no scroll-spy highlighting.", "Active section not synced with scroll position in long docs.", "None.", "- Add IntersectionObserver hook on doc headings\n- Highlight active item in sidebar via CSS class", "Scrolling updates active sidebar entry.", "`documentation/src/css/custom.css`"),
    134: ("Navbar + sidebar only; no in-page quick nav.", "Long pattern pages lack jump menu for sections.", "Issue #133.", "- Add `QuickNav` floating menu from heading extraction\n- Use on optimization-playbook.mdx", "Jump links scroll to sections.", "`documentation/docs/patterns/optimization-playbook.mdx`"),
    135: ("No keyboard shortcut handler.", "Power-user shortcuts (search, toggle theme) not documented or bound.", "Issue #23 (search).", "- Add `useKeyboardShortcuts` hook in Root layout\n- Document shortcuts in footer or help modal", "`/` focuses search; `?` shows shortcut help.", "`documentation/src/pages/index.tsx`"),
    136: ("No live code preview.", "Rust code not rendered/previewed in browser.", "Issue #74 (Playground planning).", "- MVP: static output preview after copy-paste instructions\n- Future: WASM compile pipeline", "Planning doc defines MVP scope.", "`documentation/docs/planning/code-playground.md`"),
    137: ("No in-browser editor.", "Monaco/CodeMirror not integrated.", "Issue #136.", "- Spike Monaco in iframe page under `src/pages/playground.tsx`\n- Load hello-world template", "Editor loads Rust syntax highlighting.", "`examples/hello-world/src/lib.rs`"),
    138: ("No browser compilation.", "Soroban build runs CLI-only.", "Issues #137, #74.", "- Evaluate soroban-build WASM in browser or remote build API\n- Document constraints", "Spike documents feasibility.", "`examples/hello-world/`"),
    139: ("No playground test runner.", "Tests run via cargo only.", "Issue #138.", "- Wire test button to CLI backend or mocked results\n- Show pass/fail UI", "Test runner shows example test output.", "`scripts/test-examples.sh`"),
    140: ("No share URLs for playground state.", "Cannot share code snippets via URL.", "Issue #137.", "- Encode state in URL hash or gist link\n- Add Share button component", "Shared URL restores editor content.", "`documentation/src/pages/playground.tsx`"),
    141: ("Static diagrams only; Mermaid not enabled (see #73).", "No interactive pan/zoom diagrams.", "Issue #73 (Mermaid).", "- After Mermaid, add zoom CSS or react-flow for architecture\n- Start with cross-contract diagram", "Interactive diagram on one concept page.", "`documentation/docs/concepts/cross-contract-invocation.md`"),
    142: ("No diff/comparison UI.", "Before/after code comparisons manual in prose.", "Issue #72.", "- Create `CodeComparison` side-by-side component\n- Use in lifecycle-upgrades pattern", "Two-pane diff renders in MDX.", "`documentation/docs/patterns/lifecycle-upgrades.mdx`"),
    143: ("Comments only in source blocks.", "No toggle to show/hide inline annotations.", "Issue #72.", "- Extend CodeSnippet with `showComments` prop\n- Strip // lines when collapsed", "Toggle hides comment lines.", "`documentation/src/components/CodeSnippet/`"),
    144: ("No pattern customizer.", "Users cannot parametrize pattern templates.", "Issues #136–#140.", "- Build form UI that substitutes template variables into code string\n- Start with hello-world greeting param", "Customizer updates code block live.", "`documentation/docs/patterns/hello-world.mdx`"),
    145: ("No export/download button for code blocks.", "Copy only; no .rs file download.", "Issue #72.", "- Add Download button using Blob + anchor download\n- Name file from frontmatter", "Downloads valid .rs file.", "`documentation/src/components/CodeSnippet/`"),
    146: ("No video embed component.", "No `@theme/` or custom VideoPlayer.", "Issue #55 (video planning).", "- Create `VideoPlayer` wrapper for YouTube/Vimeo embed\n- Responsive 16:9 CSS module", "Embed renders on planning doc.", "`documentation/src/components/`"),
    147: ("No quiz component.", "Knowledge checks absent from tutorials.", "None.", "- Create `Quiz` MDX component with radio + check answers\n- Add sample to first-contract doc", "Quiz interactive in dev server.", "`documentation/docs/getting-started/first-contract.md`"),
    148: ("No progress persistence.", "Tutorial completion not tracked.", "Issue #126.", "- Store progress in localStorage keyed by doc path\n- Show completion checkmarks in sidebar", "Refresh preserves progress state.", "`documentation/docs/getting-started/`"),
    149: ("No bookmark feature.", "Users cannot save pages locally.", "None.", "- Add bookmark toggle storing paths in localStorage\n- Optional export list", "Bookmark icon toggles state.", "`documentation/src/theme/`"),
    152: ("Search autocomplete in navbar; `search-experience.css` styles desktop results.", "Mobile search UX may be cramped; full-screen mobile search not implemented.", "Issue #121.", "- Add mobile-specific search overlay CSS in search-experience.css\n- Test at 375px width", "Mobile search usable without horizontal scroll.", "`documentation/src/css/search-experience.css`"),
    153: ("Code blocks use default overflow-x scroll.", "Long lines on mobile may lack scroll hints or padding.", "None.", "- Add `.theme-code-block` mobile padding in custom.css\n- Optional scroll fade indicator", "Code readable on 320px viewport.", "`documentation/src/css/custom.css`"),
    154: ("Table styles in custom.css via `--ifm-table-*` tokens.", "Wide tables may overflow on mobile without card layout.", "None.", "- Add `@media` rules for stacked table cells\n- Test on gas-and-resources doc tables", "Tables scroll or stack on mobile.", "`documentation/src/css/custom.css`, `documentation/docs/concepts/gas-and-resources.md`"),
    155: ("No touch gesture handlers.", "Swipe navigation not implemented.", "None.", "- Optional swipe-to-open mobile sidebar via touch events\n- Keep progressive enhancement", "Swipe opens menu on touch devices.", "`documentation/src/css/mobile-menu.css`"),
    156: ("Font preload + OptimizedImage exist.", "No mobile-specific bundle or lazy-load audit.", "Issues #188, #157.", "- Run Lighthouse mobile audit\n- Defer non-critical homepage sections", "Lighthouse mobile performance ≥ 90.", "`documentation/src/pages/index.tsx`"),
    157: ("No service worker or web manifest.", "Site is not installable as PWA.", "Issue #38 (icons).", "- Add `@docusaurus/plugin-pwa` or manual SW\n- Create manifest.json with icons from #38", "Lighthouse PWA checks pass.", "`documentation/docusaurus.config.ts`"),
    158: ("Responsive typography tokens in design-tokens.css.", "Mobile font scaling may need clamp() tuning.", "Issue #9 (breakpoints).", "- Audit `--font-size-*` with clamp on small viewports\n- Test readability on pattern pages", "Body text ≥ 16px on mobile.", "`documentation/src/css/design-tokens.css`"),
    159: ("OptimizedImage component exists; most assets are SVG.", "PNG/JPG images may lack WebP srcset.", "Issue #31 (image optimization).", "- Run optimize-images on any raster assets\n- Use OptimizedImage in MDX where needed", "Images serve WebP where supported.", "`documentation/src/components/OptimizedImage/OptimizedImage.tsx`"),
    160: ("No mobile testing doc for contributors.", "QA mobile checklist absent.", "Issue #218 (Mobile audit).", "- Add mobile testing section to CONTRIBUTING.md\n- List viewport sizes and browsers", "Contributors can follow checklist.", "`CONTRIBUTING.md`"),
}
for n, data in PHASE4.items():
    ENRICHMENT[n] = {
        "current": data[0],
        "gap": data[1],
        "deps": data[2],
        "approach": data[3],
        "verify": data[4],
        "links": data[5],
    }

# Phase 5: Search & SEO (#165-200 except completed)
PHASE5 = {
    165: ("Local search plugin indexes docs/pages; no filter UI on search results.", "Category/tag/difficulty filters not available on `/search`.", "Issue #121.", "- Add filter sidebar component on search results page\n- Tag docs via frontmatter for index facets", "Filtered search returns subset.", "`documentation/src/css/search-experience.css`"),
    166: ("No search analytics events.", "Popular queries and zero-result searches not tracked.", "Issues #80, #259.", "- Hook search onResult/onQuery events to analytics\n- Log anonymized query terms", "GA custom event fires on search.", "`documentation/docusaurus.config.ts`"),
    167: ("Search plugin supports keyboard nav partially.", "Arrow-key navigation through results may need polish.", "Issue #121.", "- Test and patch search-experience.css focus states\n- Ensure Escape closes modal", "Keyboard-only search flow works.", "`documentation/src/css/search-experience.css`"),
    168: ("No search history.", "Recent queries not stored locally.", "None.", "- Save last N queries in localStorage\n- Show history dropdown in SearchBar", "History persists across sessions.", "`documentation/src/theme/`"),
    169: ("Default search ranking from plugin.", "No custom boost for getting-started vs patterns.", "None.", "- Configure plugin `searchResultLimits` and doc tags\n- Boost P0 pages in index config if supported", "Getting-started ranks above tangential matches.", "`documentation/docusaurus.config.ts`"),
    171: ("Search indexes prose only.", "Code token search (function names) may be weak.", "None.", "- Ensure code blocks indexed (plugin default)\n- Add keywords frontmatter for API names", "Searching `require_auth` finds relevant doc.", "`documentation/docs/patterns/authorization.mdx`"),
    174: ("No dedicated search user doc.", "Contributors lack guide on how search indexing works.", "Issue #162 — plugin done.", "- Add `documentation/docs/contributing/search-indexing.md`\n- Explain rebuild on deploy", "Doc explains index hashed paths.", "`documentation/docusaurus.config.ts`"),
    175: ("No A/B test infrastructure.", "Search UI variants cannot be measured.", "Issues #80, #264.", "- Document future A/B approach (feature flags)\n- Optional split via env at build time", "Plan doc defines metrics.", "`documentation/docs/contributing/`"),
    176: ("Global OG tags in headTags; not all pages have unique descriptions.", "Per-page meta descriptions missing on most docs.", "Issue #75.", "- Add `description` to every doc frontmatter\n- Use `@docusaurus/plugin-content-docs` defaults", "View-source shows unique descriptions.", "`documentation/docusaurus.config.ts`, `documentation/docs/`"),
    179: ("`soroban-social-card.png` referenced in config but may be missing from static/img.", "Social preview image may 404; no per-page OG images.", "Issue #38.", "- Add 1200×630 PNG to static/img\n- Verify og:image resolves in production", "Facebook/Twitter debugger shows image.", "`documentation/docusaurus.config.ts`, `documentation/static/img/`"),
    180: ("Static OG image only.", "No dynamic OG image generation per doc.", "Issue #179.", "- Evaluate `@docusaurus/plugin-ideal-image` or external OG API\n- Start with title+category template", "Shared doc URL renders unique OG (if implemented).", "`documentation/docusaurus.config.ts`"),
    184: ("No JSON-LD schema.", "Schema.org Article/FAQ markup absent.", "Issues #193, #194.", "- Add `<script type=\"application/ld+json\">` via DocItem head\n- Start with WebSite + Organization schema", "Google Rich Results test passes.", "`documentation/src/theme/`"),
    185: ("Most docs start with single H1.", "Heading hierarchy not audited site-wide.", "Issue #75.", "- Script to lint MDX for skipped levels\n- Fix pages with H1→H3 jumps", "No accessibility heading warnings.", "`documentation/docs/`"),
    186: ("Some cross-links exist ad hoc.", "No systematic internal linking strategy.", "Issue #75.", "- Add Related docs section to concept pages\n- Link getting-started → concepts → patterns", "Each concept links ≥2 related pages.", "`documentation/sidebars.ts`"),
    187: ("SVG logos lack alt text concerns; few raster images.", "Alt text audit not performed on all images.", "Issue #31.", "- Grep for `<img` without alt in MDX\n- Fix OptimizedImage usages", "All images have non-empty alt.", "`documentation/src/components/OptimizedImage/`"),
    188: ("Font preload configured; CSS bundled by Docusaurus.", "No explicit performance budget or lazy-loading audit.", "Issue #252.", "- Run Lighthouse CI locally\n- Defer testimonials/newsletter below fold", "LCP < 2.5s on homepage.", "`documentation/src/pages/index.tsx`"),
    189: ("Responsive layout via breakpoints.css.", "Mobile-first indexing not verified.", "Issue #218.", "- Confirm viewport meta (Docusaurus default)\n- Mobile Lighthouse SEO check", "Google mobile-friendly test passes.", "`documentation/src/css/breakpoints.css`"),
    190: ("No rich snippet validation.", "FAQ/Article schema not tested.", "Issues #184, #194.", "- Submit sample URLs to Rich Results Test\n- Fix structured data errors", "Rich Results shows valid items.", "`documentation/docs/`"),
    191: ("Custom `404.tsx` exists.", "404 page may lack SEO noindex and helpful links.", "Issue #24 — page exists.", "- Add `noindex` meta to 404\n- Link popular docs from 404 page", "404 returns helpful navigation.", "`documentation/src/pages/404.tsx`"),
    192: ("No redirects config.", "Renamed docs may break bookmarks.", "None.", "- Add `clientRedirects` or hosting-level redirects in deploy\n- Document in DEPLOYMENT.md", "Old paths redirect with 301.", "`documentation/docusaurus.config.ts`, `DEPLOYMENT.md`"),
    193: ("Default breadcrumbs without schema.", "BreadcrumbList JSON-LD missing.", "Issue #184.", "- Inject BreadcrumbList schema on doc pages\n- Match visible breadcrumb trail", "Rich Results shows breadcrumbs.", "`documentation/src/theme/`"),
    194: ("No FAQ pages with schema.", "FAQ structured data not used.", "Issue #184.", "- Add FAQ section to common getting-started questions\n- Wrap in FAQPage schema", "FAQ rich snippet eligible.", "`documentation/docs/getting-started/setup.md`"),
    195: ("No SEO audit report.", "Baseline metrics not captured.", "Issues #175–#194.", "- Run Lighthouse + ahrefs/screaming frog on build output\n- Write findings to docs/seo-audit.md", "Audit doc lists prioritized fixes.", "`documentation/build/`"),
    197: ("Homepage sections only; patterns under /docs/patterns.", "No dedicated category landing pages (Tokens, DeFi, etc.).", "Phase 3 patterns.", "- Create `src/pages/patterns/tokens.tsx` landing\n- Grid linking to future pattern docs", "Landing page builds and links work.", "`documentation/src/pages/index.tsx`"),
    200: ("PatternPreview shows patterns on homepage.", "No personalized recommendations based on history.", "Issue #148, #149.", "- Recommend related patterns from localStorage history\n- Simple tag matching algorithm", "Homepage shows Related for returning users.", "`documentation/src/components/PatternPreview/PatternPreview.tsx`"),
}
for n, data in PHASE5.items():
    ENRICHMENT[n] = dict(zip(["current", "gap", "deps", "approach", "verify", "links"], data))

# Phase 6: QA & Security (#201-240 except completed 212,215,236)
PHASE6 = {
    201: ("No Jest/Vitest in package.json; no unit test script.", "Frontend unit testing framework not configured.", "Issue #202.", "- Add Vitest + React Testing Library to documentation/\n- Sample test for Badge component", "`bun run test` passes in CI.", "`documentation/package.json`"),
    202: ("React components untested.", "No component test suite for Alert, Badge, cards, etc.", "Issue #201.", "- Write tests for Alert, Callout, Badge, Button\n- Add CI job or extend lint-format", "≥5 component tests green.", "`documentation/src/components/`"),
    203: ("No integration tests.", "Doc pages not tested as React tree.", "Issue #201.", "- Add tests rendering MDX pages with @docusaurus/core test utils\n- Cover homepage + one doc", "Integration test job in CI.", "`documentation/src/pages/index.tsx`"),
    204: ("No Playwright dependency.", "E2E tests absent.", "Issue #201.", "- Add `@playwright/test` per webapp-testing skill\n- Smoke test: home, docs, search, 404", "Playwright CI job on PR.", "`documentation/`"),
    205: ("No visual regression tooling.", "UI drift not caught automatically.", "Issue #204.", "- Add Percy or Playwright screenshot compare\n- Baseline homepage + doc page", "VR test catches CSS regressions.", "`.github/workflows/ci.yml`"),
    206: ("No axe/pa11y in CI.", "Accessibility not automated.", "Issue #36.", "- Add `@axe-core/playwright` to E2E suite\n- Fail on critical violations", "CI fails if a11y regression introduced.", "`documentation/src/pages/404.tsx`"),
    207: ("`onBrokenLinks: 'throw'` catches internal links at build.", "External link checking not automated.", "None.", "- Add lychee or link-check action to CI\n- Schedule weekly external link scan", "CI reports broken external URLs.", "`.github/workflows/ci.yml`"),
    208: ("No coverage thresholds.", "Code coverage not measured.", "Issues #201–#204.", "- Enable Vitest coverage report\n- Set initial threshold 50% components", "Coverage artifact uploaded in CI.", "`documentation/package.json`"),
    209: ("CONTRIBUTING.md exists; test section minimal.", "Testing guide for contributors incomplete.", "Issues #201–#208.", "- Expand CONTRIBUTING with test commands\n- Document when to add example vs component tests", "New contributors can run test suite.", "`CONTRIBUTING.md`, `documentation/docs/contributing.md`"),
    210: ("PatternPreview uses hardcoded pattern data.", "No shared mock/fixture module for tests/storybook.", "Issue #202.", "- Extract pattern fixtures to `src/fixtures/patterns.ts`\n- Reuse in tests and PatternPreview", "Fixtures imported by tests.", "`documentation/src/components/PatternPreview/PatternPreview.tsx`"),
    211: ("No performance tests.", "Load/lighthouse not in CI.", "Issue #252.", "- Add Lighthouse CI GitHub Action\n- Budget: LCP, TTI on homepage", "Performance job fails on regression.", "`.github/workflows/ci.yml`"),
    213: ("Browserslist in package.json covers modern browsers.", "No cross-browser E2E matrix.", "Issue #204.", "- Run Playwright against chromium, firefox, webkit\n- Matrix in CI", "All three browsers pass smoke tests.", "`documentation/package.json`"),
    214: ("Responsive CSS exists; no device lab doc.", "Real device testing not documented.", "Issue #160.", "- Add device matrix to manual test protocol\n- BrowserStack optional", "QA doc lists min devices.", "`CONTRIBUTING.md`"),
    216: ("No formal manual test checklist.", "Release QA ad hoc.", "Issue #209.", "- Create `docs/qa/manual-test-protocol.md`\n- Cover nav, search, theme, docs, 404", "Checklist usable before release.", "`documentation/docs/`"),
    217: ("No UAT process.", "Stakeholder sign-off not defined.", "Issue #216.", "- Define UAT scenarios in planning doc\n- Track sign-off in release template", "UAT template in repo.", "`.github/pull_request_template.md`"),
    218: ("breakpoints.css + mobile-menu.css exist.", "Full mobile responsiveness audit not recorded.", "Issues #152–#156.", "- Test all template pages at 375/768/1280\n- File issues for overflow bugs", "Audit checklist completed.", "`documentation/src/css/breakpoints.css`"),
    219: ("Dark mode via ThemeToggle + design tokens.", "Inconsistent dark styles possible on edge components.", "Issue #10.", "- Visual pass all components in dark mode\n- Fix contrast in Callout/Alert modules", "No illegible text in dark mode.", "`documentation/src/components/ThemeToggle/`"),
    220: ("NewsletterSignup has form validation.", "Not all forms audited.", "Issue #202.", "- Test NewsletterSignup empty/invalid email\n- Add aria-invalid states", "Form shows accessible errors.", "`documentation/src/components/NewsletterSignup/NewsletterSignup.tsx`"),
    221: ("Navbar + sidebar navigation wired.", "Full nav flow not E2E tested.", "Issue #204.", "- Playwright: home → docs → pattern → GitHub link\n- Mobile menu path", "E2E nav test passes.", "`documentation/docusaurus.config.ts`"),
    222: ("45 doc files in documentation/docs/.", "Technical accuracy vs latest Soroban not verified.", "Issue #224.", "- SME review checklist per section\n- Cross-check CLI commands with current soroban-cli", "Review log for each category.", "`documentation/docs/`"),
    223: ("No cspell/typos CI.", "Spelling not automated.", "None.", "- Add cspell or typos-cli to CI\n- Custom dictionary for Soroban terms", "CI catches typos in docs.", "`.github/workflows/ci.yml`"),
    224: ("`scripts/test-examples.sh` validates Rust examples.", "Doc code snippets not all extracted/tested.", "Issue #71.", "- Grep MDX for rust blocks; match to examples/\n- Add contributing guide for tested snippets", "All rust blocks either tested or marked illustrative.", "`scripts/test-examples.sh`, `documentation/docs/contributing/add-tested-example.md`"),
    225: ("Setup guides reference screenshots optionally; mostly text.", "Screenshots may be missing or stale.", "Issue #42.", "- Capture CLI screenshots for setup guides\n- Store under static/img/docs/", "Screenshots match current CLI output.", "`documentation/docs/getting-started/`"),
    226: ("No video content in repo.", "N/A until videos produced.", "Issue #55.", "- When videos exist, embed via VideoPlayer (#146)\n- Review transcripts for accuracy", "Videos play and match docs.", "`documentation/docs/planning/`"),
    227: ("Custom 404 + Alert components.", "Error states not fully tested.", "Issue #204.", "- Test 404 page, broken newsletter endpoint, search no-results", "Graceful error UI everywhere.", "`documentation/src/pages/404.tsx`"),
    228: ("DocSkeleton + Spinner in Loading/.", "Loading states rarely used beyond PatternPreview.", "Issue #25.", "- Verify skeleton on slow routes\n- Add loading to search if debounced", "No layout shift on load.", "`documentation/src/components/Loading/`"),
    229: ("Static site; no offline SW.", "Offline behavior undefined.", "Issue #157.", "- After PWA, test offline 404 fallback\n- Document expected behavior", "Offline shows cached pages or message.", "`documentation/docusaurus.config.ts`"),
    230: ("No console.error audit.", "Dev/prod console noise unknown.", "Issue #204.", "- Playwright assert no console errors on key pages\n- Fix React warnings", "Zero console errors on smoke paths.", "`documentation/src/pages/index.tsx`"),
    231: ("Static Docusaurus site; minimal server attack surface.", "No formal code security audit doc.", "Issues #232–#235.", "- Review deps for known vulns\n- Document static site threat model", "Security audit checklist completed.", "`documentation/package.json`"),
    232: ("No npm audit / dependabot in CI.", "Dependency vulnerabilities not scanned automatically.", "Issue #250.", "- Add `bun audit` or dependabot.yml\n- Fail CI on critical CVEs", "Dependabot PRs or audit step green.", "`.github/workflows/ci.yml`"),
    233: ("MDX content static; user HTML input limited.", "XSS via MDX or newsletter form not audited.", "Issue #202.", "- Review dangerouslySetInnerHTML usage (should be none)\n- Sanitize newsletter input", "No XSS vectors in components.", "`documentation/src/components/NewsletterSignup/`"),
    234: ("Static site — CSRF N/A for docs; newsletter POST only.", "CSRF on newsletter endpoint if added.", "Issue #17.", "- Use same-site cookies or token if backend added\n- Document API security", "Newsletter endpoint rejects forged requests.", "`documentation/docusaurus.config.ts`"),
    235: ("No Content-Security-Policy headers.", "CSP not configured for GitHub Pages.", "Issue #237.", "- Define CSP meta tag or Pages headers\n- Allow inline styles Docusaurus needs", "SecurityHeaders.com grade improved.", "`DEPLOYMENT.md`"),
    237: ("GitHub Pages default headers only.", "Missing HSTS, X-Frame-Options, etc.", "Issue #235.", "- Configure headers via `_headers` or Cloudflare\n- Document in DEPLOYMENT.md", "securityheaders.com scan passes.", "`DEPLOYMENT.md`"),
    238: ("Static site; no rate limiting.", "Newsletter/backend endpoints need limits if added.", "Issue #17.", "- Rate limit at API gateway if endpoint live\n- Client-side debounce on submit", "Abuse scenario documented.", "`documentation/src/components/NewsletterSignup/`"),
    239: ("No auth on site.", "N/A for public docs; review if admin added.", "None.", "- Confirm no secrets in repo\n- Document safe env var usage for newsletter", "No credentials in git history.", "`.github/workflows/`"),
    240: ("No privacy policy page.", "GDPR/analytics consent not addressed.", "Issues #80, #259.", "- Add privacy policy doc/page\n- Cookie banner if GA enabled", "Privacy page linked from footer.", "`documentation/docusaurus.config.ts`"),
}
for n, data in PHASE6.items():
    ENRICHMENT[n] = dict(zip(["current", "gap", "deps", "approach", "verify", "links"], data))

# Phase 7: CI/CD & Launch (#245-280 except completed)
PHASE7 = {
    245: ("`deploy.yml` deploys on push to main only.", "No preview deployments for pull requests.", "Issue #247.", "- Add `deploy-preview` workflow with PR comment URL\n- Use GitHub Pages preview or Cloudflare", "PR gets preview link comment.", "`.github/workflows/deploy.yml`"),
    246: ("Production deploy to GitHub Pages on main.", "No separate staging environment.", "Issue #245.", "- Add staging branch deploy or environment\n- Point staging.soroban-cookbook.dev to preview", "Staging receives main merges before prod.", "`.github/workflows/deploy.yml`"),
    248: ("Deploy is forward-only.", "No documented rollback procedure.", "Issue #247.", "- Document rollback via GitHub Pages previous deployment\n- Add workflow_dispatch rollback job", "Rollback tested on staging.", "`DEPLOYMENT.md`"),
    249: ("Deploy summary echo in deploy.yml.", "No Slack/email notifications on deploy fail/success.", "None.", "- Add workflow step with Slack webhook or GitHub notification\n- Alert on failure", "Team notified on deploy result.", "`.github/workflows/deploy.yml`"),
    250: ("No dependabot.yml or renovate.", "Dependency updates manual.", "Issue #232.", "- Add `.github/dependabot.yml` for npm + actions\n- Weekly bun.lock updates", "Dependabot opens PRs.", "`.github/`"),
    251: ("No SAST/secret scanning beyond GitHub defaults.", "Security scanning not in CI.", "Issue #232.", "- Enable codeql-analysis workflow\n- Add gitleaks or trufflehog step", "Security workflow green on main.", "`.github/workflows/`"),
    252: ("Build size echoed in CI; no budgets.", "Performance budgets not enforced.", "Issue #211.", "- Add bundlesize or Lighthouse CI budget step\n- Fail if JS/CSS exceeds threshold", "CI fails when bundle regresses.", "`.github/workflows/ci.yml`"),
    253: ("Internal links fail build via onBrokenLinks.", "External links not checked in CI.", "Issue #207.", "- Add lychee link checker job\n- Ignore known flaky domains", "Broken external links reported.", "`.github/workflows/ci.yml`"),
    256: ("No Sentry or error monitoring SDK.", "Client errors not tracked in production.", "Issue #257.", "- Add `@sentry/react` with DSN from env\n- Capture build-time release version", "Test error appears in Sentry dashboard.", "`documentation/src/theme/Root.tsx`"),
    257: ("No Web Vitals reporting.", "LCP/FID/CLS not tracked.", "Issues #188, #252.", "- Add `web-vitals` package reporting to analytics\n- Log in GA or custom endpoint", "Web Vitals visible in analytics.", "`documentation/src/pages/index.tsx`"),
    258: ("No uptime monitor configured.", "Outages may go unnoticed.", "None.", "- Configure UptimeRobot or GitHub status check on production URL\n- Alert on 5xx/down", "Monitor shows green for production.", "`DEPLOYMENT.md`"),
    259: ("GA not configured (see #80).", "Google Analytics missing.", "Issue #80.", "- Enable plugin-google-gtag in docusaurus.config.ts\n- Use GA4 measurement ID secret", "Real-time analytics shows traffic.", "`documentation/docusaurus.config.ts`"),
    260: ("No custom analytics events.", "Only page views if GA added.", "Issue #259.", "- Track search, copy-code, newsletter submit events\n- Document event catalog", "Events appear in GA4 debug view.", "`documentation/src/components/QuickStartSection/`"),
    261: ("No analytics dashboard.", "Metrics scattered.", "Issues #259, #260.", "- Create Looker/GA dashboard for docs team\n- Weekly popular pages report", "Dashboard linked from CONTRIBUTING.", "`DEPLOYMENT.md`"),
    262: ("Search plugin local-only.", "Search analytics not integrated.", "Issues #166, #259.", "- Emit search events to GA on query/submit\n- Track zero-result queries", "Search terms in analytics report.", "`documentation/docusaurus.config.ts`"),
    263: ("No feedback collection system.", "User feedback not gathered.", "Issue #79.", "- Implement DocFeedback widget\n- Store responses in GitHub Discussions or form", "Feedback submissions recorded.", "`documentation/src/components/`"),
    264: ("No A/B testing.", "Cannot experiment on CTAs or search.", "Issue #175.", "- Document feature flag approach\n- Optional PostHog or GA experiments", "A/B plan approved before implementation.", "`documentation/docs/planning/`"),
    265: ("No heatmap tool.", "Click patterns unknown.", "Issue #259.", "- Evaluate Hotjar/Clarity (privacy-compliant)\n- Load only after consent", "Heatmap captures homepage clicks.", "`documentation/docusaurus.config.ts`"),
    266: ("No funnel tracking.", "Conversion from home → docs → GitHub not measured.", "Issue #260.", "- Define funnel events in GA4\n- Track CTA clicks on homepage", "Funnel report in analytics.", "`documentation/src/pages/index.tsx`"),
    267: ("No alerting beyond GitHub defaults.", "Incident alerts not configured.", "Issues #258, #249.", "- Wire CI failure + uptime alerts to Slack/PagerDuty\n- Document on-call rotation", "Test alert received.", "`.github/workflows/ci.yml`"),
    268: ("GitHub Actions logs only.", "No centralized log aggregation.", "None.", "- Optional: forward workflow logs to Datadog/CloudWatch\n- Document log retention", "Logs searchable for deploy job.", "`.github/workflows/`"),
    269: ("DEPLOYMENT.md and CI_CD_PIPELINE.md exist.", "Monitoring runbooks incomplete.", "Issues #256–#258.", "- Add monitoring section to DEPLOYMENT.md\n- Link dashboards and alert playbooks", "On-call can follow runbook.", "`DEPLOYMENT.md`, `CI_CD_PIPELINE.md`"),
    270: ("No incident response plan.", "Outage procedure undefined.", "Issue #269.", "- Create INCIDENT_RESPONSE.md\n- Define severity levels and comms templates", "Tabletop exercise completed once.", "`DEPLOYMENT.md`"),
    271: ("Footer links to Stellar Discord; no Cookbook-specific Discord.", "Dedicated community Discord not set up.", "None.", "- Create Soroban Cookbook Discord server\n- Update footer link in docusaurus.config.ts", "Invite link works; channels created.", "`documentation/docusaurus.config.ts`"),
    272: ("GitHub Discussions not enabled/configured.", "No Q&A category on repo.", "None.", "- Enable Discussions on GitHub repo\n- Add categories: Q&A, Ideas, Show and tell", "Discussion templates live.", "`https://github.com/Soroban-Cookbook/Soroban_Cookbook_online`"),
    274: ("No CODE_OF_CONDUCT.md in repo root.", "Community standards not formalized.", "None.", "- Add Contributor Covenant CODE_OF_CONDUCT.md\n- Link from CONTRIBUTING and footer", "CoC linked on GitHub.", "`CONTRIBUTING.md`"),
    275: ("No `.github/ISSUE_TEMPLATE/` directory.", "Issue templates missing (PR template exists).", "Issue #276 — PR template done.", "- Add bug_report.yml and feature_request.yml\n- Config.yml for template chooser", "New issue shows template picker.", "`.github/pull_request_template.md`"),
    277: ("No moderation guidelines.", "Community moderation plan absent.", "Issues #271, #274.", "- Document moderation policy in CODE_OF_CONDUCT or COMMUNITY.md\n- Define escalation path", "Moderators have written guidelines.", "`CONTRIBUTING.md`"),
    278: ("No launch announcement draft.", "Launch comms not prepared.", "Green CI (#241).", "- Write launch post for GitHub Discussions + blog\n- Highlight homepage and getting-started", "Announcement reviewed by maintainers.", "`README.md`, `documentation/docs/index.md`"),
    279: ("No social media plan.", "Twitter/X, dev.to strategy undefined.", "Issue #278.", "- Create SOCIAL_MEDIA.md with post calendar\n- Draft threads linking key docs", "Schedule covers launch week.", "`documentation/static/img/soroban-social-card.png`"),
    280: ("Logo SVG exists; no press kit.", "Brand assets not packaged for media.", "Issue #38.", "- Create press-kit.zip: logos, screenshots, boilerplate\n- Host in repo or release asset", "Press kit downloadable.", "`documentation/static/img/logo.svg`"),
}
for n, data in PHASE7.items():
    ENRICHMENT[n] = dict(zip(["current", "gap", "deps", "approach", "verify", "links"], data))


def format_enrichment(data: dict[str, str]) -> str:
    approach = data["approach"]
    if approach and not approach.startswith("- "):
        approach = f"- {approach}"
    return (
        f"\n**Current state:** {data['current']}\n\n"
        f"**Gap analysis:** {data['gap']}\n\n"
        f"**Dependencies:** {data['deps']}\n\n"
        f"**Suggested approach:**\n{approach}\n\n"
        f"**Verification steps:** {data['verify']}\n\n"
        f"**Related code links:** {data['links']}\n"
    )


def default_enrichment(phase: int, num: int, title: str) -> dict[str, str]:
    phase_ctx = {
        1: ("design foundation", "documentation/src/css/", "documentation/src/components/"),
        2: ("core documentation", "documentation/docs/getting-started/", "documentation/docs/concepts/"),
        3: ("Rust pattern library", "examples/", "documentation/docs/patterns/"),
        4: ("UI/interactive features", "documentation/src/components/", "documentation/src/theme/"),
        5: ("search & SEO", "documentation/docusaurus.config.ts", "documentation/src/css/search-experience.css"),
        6: ("QA & security", ".github/workflows/ci.yml", "scripts/test-examples.sh"),
        7: ("CI/CD & launch", ".github/workflows/", "DEPLOYMENT.md"),
    }
    area, primary, secondary = phase_ctx.get(phase, ("project", "documentation/", "README.md"))
    return {
        "current": f"Partial or no implementation for “{title}”; scan `{primary}` for related artifacts.",
        "gap": f"Acceptance criteria for Issue #{num} (“{title}”) are not fully met.",
        "deps": "See PROJECT_PHASES.md and related issues in the same phase.",
        "approach": f"- Inventory existing work under `{primary}`\n- Implement missing deliverables for “{title}”\n- Wire into sidebar/config if applicable\n- Run phase-appropriate verification commands",
        "verify": f"Issue #{num} acceptance criteria checked; `cd documentation && bun run lint && bun run build`.",
        "links": f"`{primary}`, `{secondary}`",
    }


def enrich_phase(phase: int) -> tuple[int, int, list[int]]:
    path = ROOT / f"PHASE_{phase}_ISSUES.md"
    text = path.read_text(encoding="utf-8")
    parts = re.split(r"(?=^### Issue #\d+:)", text, flags=re.MULTILINE)
    header = parts[0]
    blocks = parts[1:]

    enriched = 0
    skipped: list[int] = []
    new_blocks: list[str] = []

    for block in blocks:
        m = ISSUE_PATTERN.search(block)
        if not m:
            new_blocks.append(block)
            continue
        num = int(m.group(1))
        title = m.group(2).strip()
        body = ENRICHMENT_RE.sub("\n", block)
        body = body.rstrip()
        data = ENRICHMENT.get(num) or default_enrichment(phase, num, title)
        body += format_enrichment(data)
        new_blocks.append(body)
        enriched += 1

    path.write_text(header + "".join(new_blocks), encoding="utf-8")
    return enriched, len(blocks), skipped


def main() -> None:
    total = 0
    all_skipped: list[int] = []
    modified: list[str] = []
    for phase in range(1, 8):
        count, blocks, skipped = enrich_phase(phase)
        total += count
        all_skipped.extend(skipped)
        if count:
            modified.append(f"PHASE_{phase}_ISSUES.md")
        print(f"Phase {phase}: enriched {count} issues")

    print(f"\nTotal enriched: {total}")
    print(f"Skipped: {len(all_skipped)} ({all_skipped or 'none'})")
    print(f"Modified: {', '.join(modified)}")


if __name__ == "__main__":
    main()
