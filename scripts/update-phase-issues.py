#!/usr/bin/env python3
"""Prune completed issues from PHASE_*_ISSUES.md and enrich remaining ones."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

COMPLETED: dict[int, set[int]] = {
    1: {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30, 32, 33, 34, 35, 37, 39, 40},
    2: {41, 43, 44, 45, 47, 49, 50, 51, 53, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 70, 71, 76, 78},
    3: {120},
    4: {124, 127, 131, 150, 151},
    5: {162, 163, 164, 177, 178, 182, 196, 198, 199},
    6: {212, 215, 236},
    7: {241, 242, 243, 244, 247, 254, 255, 273, 276},
}

REMOVED_SUMMARIES: dict[int, dict[int, str]] = {
    1: {
        1: "design-tokens.css + design-system docs",
        2: "fonts.css, typography docs, font preload",
        3: "spacing-layout.css + design tokens",
        4: "Button components in src/components/buttons/ and UI/Button/",
        5: "Card components (BaseCard, PatternCard, etc.)",
        6: "Badge component + badges-tags.css",
        7: "Icon component + lucide-react",
        8: "Transition tokens in design-tokens.css",
        9: "breakpoints.css + responsive docs",
        10: "ThemeToggle + themeInit.js + colorMode config",
        11: "Homepage hero in index.tsx",
        13: "PatternPreview component on homepage",
        14: "Stats component with animated counters",
        15: "Testimonials component + docs",
        16: "QuickStartSection component",
        17: "NewsletterSignup component",
        18: "Footer configured in docusaurus.config.ts",
        20: "ActionCard + hero CTAs",
        21: "Docusaurus classic doc template",
        22: "PatternDoc component + pattern MDX pages",
        23: "Local search plugin + search-experience.css",
        24: "Custom 404 page + NotFound theme",
        26: "EmptyState component + docs",
        27: "Prism themes + copy feedback in QuickStartSection",
        28: "Table styling in custom.css",
        29: "Alert/Callout components + docs",
        30: "Docusaurus built-in breadcrumbs",
        32: "Self-hosted fonts with preload",
        33: "Production CSS minification via Docusaurus build",
        34: "mobile-menu.css polish",
        35: "Hover animations in card/button CSS",
        37: "OG/Twitter meta tags in docusaurus.config.ts",
        39: "Print styles in custom.css",
        40: "design-system/* and components-demo page",
    },
    2: {
        41: "concepts/introduction.md",
        43: "getting-started/setup-linux.md",
        44: "getting-started/setup-windows.md",
        45: "getting-started/first-contract.md + hello-world example",
        47: "getting-started/building-and-compilation.md",
        49: "getting-started/deploy-testnet.md",
        50: "getting-started/deploy-mainnet.md",
        51: "getting-started/contract-interaction.md",
        53: "concepts/best-practices.md",
        56: "concepts/storage.md",
        57: "concepts/authorization.md + patterns/authorization.mdx",
        58: "concepts/events.md",
        59: "concepts/error-handling.md + patterns/error-handling.mdx",
        60: "patterns/custom-types.mdx",
        61: "concepts/cross-contract-invocation.md",
        62: "concepts/gas-and-resources.md",
        63: "patterns/lifecycle-upgrades.mdx",
        64: "security/fundamentals.md",
        65: "patterns/optimization-playbook.mdx",
        70: "getting-started/debugging.md",
        71: "scripts/test-examples.sh + CI test-examples job",
        76: "Docusaurus auto-TOC on doc pages",
        78: "contributing.md + CONTRIBUTING.md",
    },
    3: {120: "patterns/optimization-playbook.mdx"},
    4: {
        124: "Tabs in patterns/hello-world.mdx",
        127: "Badge component + PatternMeta difficulty display",
        131: "PatternCard hover styles",
        150: "Print styles in custom.css",
        151: "mobile-menu.css",
    },
    5: {
        162: "docusaurus-search-local plugin config",
        163: "search-experience.css + search index pages",
        164: "Navbar autocomplete from search plugin",
        177: "OpenGraph headTags in docusaurus.config.ts",
        178: "Twitter card meta tags",
        182: "Auto-generated sitemap.xml on build",
        196: "Homepage content sections in index.tsx",
        198: "Tag/badge CSS + pattern doc tags",
        199: "PatternPreview on homepage",
    },
    6: {
        212: "scripts/test-examples.sh + examples/ tests",
        215: "CI jobs for lint, typecheck, build, test-examples",
        236: "HTTPS via GitHub Pages + https URL in config",
    },
    7: {
        241: ".github/workflows/ci.yml + deploy.yml",
        242: "build-docs CI job with artifact verification",
        243: "test-examples + lint/typecheck CI jobs",
        244: "lint-format CI job + eslint/prettier scripts",
        247: "deploy.yml GitHub Pages pipeline",
        254: "upload-artifact in CI with retention",
        255: "DEPLOYMENT.md + CI_CD_PIPELINE.md",
        273: "contributing.md + CONTRIBUTING.md",
        276: ".github/pull_request_template.md",
    },
}

GAPS: dict[int, str] = {
    12: "HomepageFeatures exists but is not used on homepage; hero uses plain bullets.",
    19: "Basic navbar only; no dropdowns or integrated ThemeToggle.",
    25: "Skeleton/Spinner exist but no progress-bar variant or site-wide usage.",
    31: "OptimizedImage exists; missing static PNG/WebP assets referenced in config.",
    36: "Partial ARIA/skip-link work; no automated WCAG audit or CI.",
    38: "favicon referenced in config; static/img lacks generated icon set.",
    42: "No dedicated macOS setup page (only generic setup.md).",
    46: "testing-errors.md is partial; no comprehensive contract testing guide.",
    48: "No dedicated local testing/simulation guide.",
    52: "No standalone development tools overview page.",
    54: "TROUBLESHOOTING_CATALOG.md covers site ops, not 20+ Soroban contract errors.",
    55: "No video scripts or recording plan.",
    66: "Time snippets only in other docs; no dedicated scheduling guide.",
    67: "No randomness/entropy documentation.",
    68: "Token standards not documented beyond overview list.",
    69: "No advanced testing strategies doc (fuzzing, integration).",
    72: "Copy button in QuickStartSection only; no reusable enhanced snippet component.",
    73: "No Mermaid plugin in package.json.",
    74: "Playground planning in .kiro/specs only; not published.",
    75: "No site-wide SEO/search optimization audit documented.",
    77: "No doc version selector or archived versions.",
    79: "No 'Was this helpful?' feedback widget.",
    80: "No analytics integration in site config.",
    81: "token-transfer example exists but no full pattern doc page.",
    111: "Cross-contract concept doc only; no working example crate.",
    112: "Lifecycle doc discusses upgrades; no proxy pattern example.",
    115: "authorization.mdx is doc-only; no ACL example crate.",
    119: "Reentrancy discussed in docs; no guard contract implementation.",
    121: "Local Lunr search only; no custom filters/categories UI.",
    122: "Homepage category filter only; no site-wide pattern filter page.",
    123: "Copy-with-feedback limited to QuickStartSection.",
    125: "No custom collapsible doc sections beyond admonitions.",
    126: "No tutorial progress tracking UI.",
    128: "No estimated-time metadata on patterns/tutorials.",
    129: "Static prerequisites only; no interactive checklist.",
    130: "No RelatedPatterns component at page bottom.",
    132: "Default Docusaurus breadcrumbs only.",
    133: "No sidebar scroll-spy beyond default TOC.",
    134: "No floating quick-nav component.",
    135: "No keyboard shortcut system.",
    136: "No live code preview component.",
    137: "No Monaco editor integration.",
    138: "No browser/server compilation playground.",
    139: "No in-browser test runner for playground.",
    140: "No shareable playground links.",
    141: "No interactive diagram components.",
    142: "No side-by-side code comparison tool.",
    143: "No inline comment show/hide toggle.",
    144: "No pattern parameter customizer form.",
    145: "No export-as-project feature.",
    146: "No styled video embed component.",
    147: "No interactive quiz component.",
    148: "No user progress persistence.",
    149: "No bookmark feature.",
    152: "No dedicated full-screen mobile search UX.",
    153: "No mobile horizontal-scroll enhancements for code blocks.",
    154: "Table CSS tokens only; no card-based responsive tables.",
    155: "No swipe gesture navigation.",
    156: "No dedicated mobile performance pass documented.",
    157: "No manifest.json or service worker (PWA).",
    158: "No explicit user font-size scaling controls.",
    159: "OptimizedImage underused; missing WebP static assets.",
    160: "No mobile testing procedures doc.",
    161: "Uses docusaurus-search-local instead of Algolia DocSearch.",
    165: "No difficulty/category/tag search filters.",
    166: "No search analytics tracking.",
    167: "Search keyboard navigation not explicitly tested.",
    168: "No localStorage search history.",
    169: "Default plugin ranking only.",
    170: "Fuzzy search depends on plugin defaults; not tuned.",
    171: "No search-by-code-snippet feature.",
    172: "Hashed index only; no explicit perf tuning doc.",
    173: "Minimal mobile CSS for search page.",
    174: "No user-facing search tips page.",
    175: "No A/B testing framework for search.",
    176: "Global OG tags exist; not all pages have unique meta descriptions.",
    179: "soroban-social-card.png referenced but missing from static/img.",
    180: "Static OG image only; no per-page generator.",
    181: "No explicit canonical URL configuration.",
    183: "No robots.txt in documentation/static/.",
    184: "No JSON-LD structured data.",
    185: "No heading hierarchy audit report.",
    186: "Some cross-links exist; no formal internal linking strategy.",
    187: "Alt text not verified site-wide.",
    188: "No Lighthouse CI or Core Web Vitals targets enforced.",
    189: "Responsive CSS exists; no mobile-first SEO audit.",
    190: "No rich snippet validation.",
    191: "Custom 404 exists but lacks SEO-specific optimization.",
    192: "No redirects configuration.",
    193: "No breadcrumb JSON-LD schema.",
    194: "No FAQ schema markup.",
    195: "No SEO audit report in repo.",
    197: "patterns/overview.md lists categories; no dedicated landing pages.",
    200: "No behavior-based content recommendations.",
    201: "No Jest/Vitest in documentation/package.json.",
    202: "No React component test suite.",
    203: "No frontend integration test suite.",
    204: "No Playwright config or e2e tests.",
    205: "No visual regression testing.",
    206: "No axe-core or automated a11y CI.",
    207: "onBrokenLinks at build time only; no dedicated link-check CI job.",
    208: "No code coverage targets.",
    209: "No frontend testing strategy doc.",
    210: "Homepage uses inline samplePatterns; no reusable mock fixtures.",
    211: "Lighthouse CI listed as future work; not implemented.",
    213: "browserslist only; no cross-browser test runs.",
    214: "No device testing documentation or automation.",
    216: "No manual QA checklist document.",
    217: "No UAT process documented.",
    218: "No completed mobile responsiveness audit report.",
    219: "Dark mode implemented but no consistency audit documented.",
    220: "NewsletterSignup has validation; no formal test pass documented.",
    221: "Navigation flow testing not documented.",
    222: "No completed technical content review sign-off.",
    223: "Grammar/spelling pass not documented as complete.",
    224: "Only 3 example crates CI-tested; most doc snippets unverified.",
    225: "Setup guides lack screenshots per acceptance criteria.",
    226: "No video content to review.",
    227: "Error messages not systematically tested.",
    228: "Loading states not tested/documented.",
    229: "No PWA/offline testing.",
    230: "No browser console audit report.",
    231: "No security audit report for custom code.",
    232: "No npm audit/Dependabot/Snyk in CI.",
    233: "XSS prevention not documented.",
    234: "Newsletter POST has no CSRF token (static site).",
    235: "No CSP headers configured.",
    237: "No X-Frame-Options etc. for GitHub Pages.",
    238: "No API rate limiting for newsletter endpoint.",
    239: "No auth system to review.",
    240: "No privacy policy or cookie consent.",
    245: "No PR preview deployment workflow.",
    246: "Only production GitHub Pages deploy; no staging environment.",
    248: "No documented rollback procedure.",
    249: "No Slack/Discord deploy notifications.",
    250: "No dependabot.yml.",
    251: "No security scan step in workflows.",
    252: "No performance budgets in CI.",
    253: "Build-time onBrokenLinks only; no separate link checker.",
    256: "No Sentry integration.",
    257: "No Web Vitals monitoring.",
    258: "No uptime monitoring configured.",
    259: "No Google Analytics in site config.",
    260: "No custom analytics events (copy code, etc.).",
    261: "No analytics dashboard.",
    262: "No search analytics integration.",
    263: "No feedback forms beyond newsletter.",
    264: "No A/B testing infrastructure.",
    265: "No heatmap integration.",
    266: "No conversion funnel tracking.",
    267: "No alerting system configured.",
    268: "No log aggregation setup.",
    269: "No monitoring runbook.",
    270: "No incident response plan.",
    271: "Footer links to Stellar Discord only; no project Discord.",
    272: "GitHub Discussions referenced but not configured in repo.",
    274: "No CODE_OF_CONDUCT.md.",
    275: "No .github/ISSUE_TEMPLATE/ directory.",
    277: "No community moderation plan documented.",
    278: "No launch announcement post.",
    279: "No social media strategy documented.",
    280: "No press kit in repo.",
}

CURRENT: dict[int, str] = {
    127: "Badge styles in badges-tags.mdx; PatternMeta shows difficulty via Badge variant.",
    12: "HomepageFeatures and FeatureCard exist under src/components/ but are not on index.tsx.",
    71: "scripts/test-examples.sh runs cargo test for hello-world, counter, token-transfer.",
    212: "scripts/test-examples.sh + CI test-examples job cover 3 Rust examples.",
    241: "ci.yml and deploy.yml provide lint, build, test, and GitHub Pages deploy.",
}

PHASE_HEADERS: dict[int, tuple[str, str]] = {
    1: (
        "Phase 1: Design & Website Foundation - GitHub Issues",
        "Create a beautiful, modern website with excellent UI/UX and establish the visual foundation",
    ),
    2: (
        "Phase 2: Core Documentation Development - GitHub Issues",
        "Create comprehensive getting started guides and core concept documentation",
    ),
    3: (
        "Phase 3: Pattern Library Implementation - GitHub Issues",
        "Build production-ready smart contract patterns with tests and documentation",
    ),
    4: (
        "Phase 4: UI/UX Polish & Interactive Features - GitHub Issues",
        "Enhance user experience with interactive components and mobile optimization",
    ),
    5: (
        "Phase 5: Search, SEO & Discoverability - GitHub Issues",
        "Make content easily discoverable through search and SEO optimization",
    ),
    6: (
        "Phase 6: Testing, QA & Security - GitHub Issues",
        "Ensure quality, security, and reliability across the site and examples",
    ),
    7: (
        "Phase 7: Launch Preparation & Infrastructure - GitHub Issues",
        "Prepare for public launch with CI/CD, monitoring, and community setup",
    ),
}

ISSUE_HEADER = re.compile(r"^### Issue #(\d+):\s*(.+)$", re.MULTILINE)
ENRICHMENT_FIELDS = (
    "**Current state:**",
    "**Gap analysis:**",
    "**Dependencies:**",
    "**Suggested approach:**",
    "**Verification steps:**",
    "**Related code links:**",
)


def strip_enrichment(body: str) -> str:
    for field in ENRICHMENT_FIELDS:
        idx = body.find(field)
        if idx != -1:
            body = body[:idx]
    return body.rstrip()


def strip_acceptance_trailing_sep(body: str) -> str:
    body = body.rstrip()
    if body.endswith("---"):
        body = body[:-3].rstrip()
    return body


def default_enrichment(phase: int, num: int, title: str) -> dict[str, str]:
    phase_paths = {
        1: ("documentation/src/components/", "documentation/src/css/"),
        2: ("documentation/docs/getting-started/", "documentation/docs/concepts/"),
        3: ("examples/", "documentation/docs/patterns/"),
        4: ("documentation/src/components/", "documentation/src/pages/"),
        5: ("documentation/docusaurus.config.ts", "documentation/src/css/search-experience.css"),
        6: (".github/workflows/ci.yml", "scripts/test-examples.sh"),
        7: (".github/workflows/", "DEPLOYMENT.md"),
    }
    primary, secondary = phase_paths.get(phase, ("documentation/", "README.md"))
    gap = GAPS.get(num, f"Acceptance criteria for “{title}” are not met in the current codebase.")
    current = CURRENT.get(
        num,
        f"Partial or no implementation found; check `{primary}` for related work.",
    )
    slug = re.sub(r"[^a-z0-9]+", "-", title.split(" - ")[0].lower()).strip("-")
    deps = "None" if phase == 1 else f"See completed issues in PHASE_{phase}_ISSUES.md summary."
    if num >= 136 and num <= 145:
        deps = "Issue #74 (Interactive Code Playground Planning)"
    if num >= 91 and num <= 110 and phase == 3:
        deps = "Phase 2 concept docs (#57 authorization, #59 error handling) recommended first."
    return {
        "current": current,
        "gap": gap,
        "deps": deps,
        "approach": (
            f"- Audit `{primary}` for existing partial work\n"
            f"- Implement deliverables for `{slug}`\n"
            f"- Add tests/docs and wire into sidebar or CI where applicable\n"
            f"- Run verification commands below before closing"
        ),
        "verify": (
            f"Issue #{num} acceptance criteria met; "
            f"run `bun run lint && bun run build`"
            + (" and `bash scripts/test-examples.sh`" if phase == 3 or num in {71, 212, 224} else "")
            + "."
        ),
        "links": f"`{primary}`, `{secondary}`",
    }


def enrich_block(phase: int, num: int, title: str, body: str) -> str:
    body = strip_enrichment(strip_acceptance_trailing_sep(body))
    data = default_enrichment(phase, num, title)
    enrichment = (
        f"\n\n**Current state:** {data['current']}\n\n"
        f"**Gap analysis:** {data['gap']}\n\n"
        f"**Dependencies:** {data['deps']}\n\n"
        f"**Suggested approach:**\n{data['approach']}\n\n"
        f"**Verification steps:** {data['verify']}\n\n"
        f"**Related code links:** {data['links']}\n"
    )
    return body + enrichment + "\n---\n"


def parse_issues(text: str) -> dict[int, tuple[str, str]]:
    """Return {issue_num: (title, raw_body_without_header)} from any messy file."""
    issues: dict[int, tuple[str, str]] = {}
    for match in ISSUE_HEADER.finditer(text):
        num = int(match.group(1))
        title = match.group(2).strip()
        start = match.end()
        next_match = ISSUE_HEADER.search(text, start)
        end = next_match.start() if next_match else len(text)
        body = text[start:end].strip()
        issues[num] = (title, body)
    return issues


def process_phase(phase: int) -> tuple[int, int]:
    path = ROOT / f"PHASE_{phase}_ISSUES.md"
    all_issues = parse_issues(path.read_text(encoding="utf-8"))
    completed = COMPLETED[phase]
    removed_notes = REMOVED_SUMMARIES.get(phase, {})

    removed_list: list[str] = []
    kept_blocks: list[str] = []

    ISSUE_TITLES: dict[int, str] = {
        1: "Define Color Palette & Design System",
        2: "Typography System Setup",
        3: "Spacing & Layout System",
        4: "Button Component System",
        5: "Card Component Design",
        6: "Badge & Tag System",
        7: "Icon System & Library",
        8: "Animation & Transition Guidelines",
        9: "Responsive Breakpoint System",
        10: "Dark Mode Implementation Strategy",
        11: "Hero Section Redesign",
        12: "Feature Cards Section",
        13: "Pattern Showcase Preview",
        14: "Statistics/Metrics Section",
        15: "Testimonials/Community Section",
        16: "Quick Start Preview Section",
        17: "Newsletter/Updates Signup",
        18: "Footer Design & Implementation",
        19: "Navigation Menu Enhancement",
        20: "Call-to-Action (CTA) Components",
        21: "Documentation Page Template",
        22: "Pattern Page Template",
        23: "Search Results Page Design",
        24: "404 Error Page Design",
        25: "Loading States & Skeletons",
        26: "Empty States Design",
        27: "Code Block Enhancement",
        28: "Table Design & Styling",
        29: "Alert/Callout Components",
        30: "Breadcrumb Navigation",
        31: "Image Optimization System",
        32: "Font Loading Optimization",
        33: "CSS Optimization & Minification",
        34: "Mobile Menu Polish",
        35: "Micro-interactions & Animations",
        36: "Accessibility Audit & Fixes",
        37: "Social Media Preview Cards",
        38: "Favicon & App Icons",
        39: "Print Stylesheet",
        40: "Design Documentation & Style Guide",
    }

    for num in sorted(completed):
        title = all_issues[num][0] if num in all_issues else ISSUE_TITLES.get(num, f"Issue #{num}")
        reason = removed_notes.get(num, "implemented in codebase")
        removed_list.append(f"- **#{num}** {title} — {reason}")

    for num in sorted(all_issues.keys()):
        title, body = all_issues[num]
        if num in completed:
            continue
        kept_blocks.append(f"### Issue #{num}: {title}\n" + enrich_block(phase, num, title, body))

    remaining = len(kept_blocks)
    removed = len(removed_list)
    original_total = removed + remaining

    title_line, objective = PHASE_HEADERS[phase]
    summary = "\n".join(
        [
            f"# {title_line}",
            "",
            f"**Objective**: {objective}",
            "",
            f"**Total Issues**: {remaining}",
            "",
            "---",
            "",
            "# Completed Issues (removed)",
            "",
            f"The following **{removed}** issues were removed because they are substantially implemented in the codebase:",
            "",
            *removed_list,
            "",
            f"**Remaining open issues:** {remaining}",
            "",
            "---",
            "",
        ]
    )

    path.write_text(summary + "\n".join(kept_blocks), encoding="utf-8")
    return removed, remaining, original_total


def update_project_phases(counts: dict[int, tuple[int, int, int]]) -> None:
    path = ROOT / "PROJECT_PHASES.md"
    text = path.read_text(encoding="utf-8")

    phase_notes = []
    total_removed = 0
    total_remaining = 0
    for phase in range(1, 8):
        removed, remaining, total = counts[phase]
        total_removed += removed
        total_remaining += remaining
        pct = int((removed / total) * 100) if total else 0
        phase_notes.append(f"- Phase {phase}: {removed}/{total} completed ({pct}%), **{remaining} open**")

    tracker = "\n".join(
        [
            "## Issue Backlog Status",
            "",
            "Cross-referenced against codebase after CI remediation (June 2026):",
            "",
            *phase_notes,
            "",
            f"**Totals:** {total_removed} issues removed, **{total_remaining} open** (from {total_removed + total_remaining} tracked).",
            "",
        ]
    )

    if "## Issue Backlog Status" in text:
        text = re.sub(
            r"## Issue Backlog Status[\s\S]*?(?=## Progress Tracking)",
            tracker + "\n",
            text,
        )
    else:
        text = text.replace(
            "## Progress Tracking",
            tracker + "\n## Progress Tracking",
        )

    if counts[1][1] <= 10:
        text = text.replace(
            "- [ ] Phase 1: Foundation & Content Strategy",
            "- [x] Phase 1: Foundation & Content Strategy (design foundation largely complete)",
        )
    if counts[2][1] <= 16:
        text = text.replace(
            "- [ ] Phase 2: Core Documentation Development",
            "- [x] Phase 2: Core Documentation Development (core docs largely complete)",
        )
    if counts[7][0] >= 8:
        text = text.replace(
            "- [ ] Phase 7: Launch Preparation & CI/CD",
            "- [~] Phase 7: Launch Preparation & CI/CD (CI/CD core done; monitoring/community open)",
        )

    text = re.sub(r"\*\*Last Updated\*\*:.*", "**Last Updated**: June 22, 2026", text)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    counts: dict[int, tuple[int, int, int]] = {}
    for phase in range(1, 8):
        removed, remaining, total = process_phase(phase)
        counts[phase] = (removed, remaining, total)
        print(f"Phase {phase}: removed {removed}, remaining {remaining}, total {total}")

    update_project_phases(counts)
    total_r = sum(r for _, r, _ in counts.values())
    total_d = sum(d for d, _, _ in counts.values())
    print(f"\nTotal removed: {total_d}, total remaining: {total_r}")


if __name__ == "__main__":
    main()
