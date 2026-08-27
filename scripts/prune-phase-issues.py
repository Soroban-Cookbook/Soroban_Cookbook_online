#!/usr/bin/env python3
"""Agent 2: Remove completed issues from PHASE_*_ISSUES.md files."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Issues to remove: issue_num -> reason (evidence path)
REMOVALS: dict[str, dict[int, str]] = {
    "PHASE_1_ISSUES.md": {
        1: "design-tokens.css defines color palette, dark mode variants, and CSS variables",
        2: "Typography scale in design-tokens.css + documentation/docs/design-system/typography.mdx",
        3: "Spacing scale (--space-*) in design-tokens.css + spacing-layout.css",
        4: "Button system in src/components/buttons/ and UI/Button/ + design-system/buttons.mdx",
        5: "Card components: PatternCard, BaseCard, FeatureCard, GradientCard, ActionCard",
        6: "Badge/Tag in src/components/Badge/ + design-system/badges-tags.mdx",
        7: "Icon component in src/components/UI/Icon/ + docs/components/iconography.mdx",
        8: "Transition tokens and utilities in design-tokens.css and custom.css",
        9: "breakpoints.css + documentation/docs/responsive/breakpoints.mdx",
        10: "ThemeToggle component + static/js/themeInit.js for persisted dark mode",
        11: "Hero section in src/pages/index.tsx",
        12: "HomepageFeatures component on landing page",
        13: "PatternPreview component with category filtering on homepage",
        14: "Stats component on landing page",
        15: "Testimonials component + docs/components/testimonials.mdx",
        16: "QuickStartSection with syntax-highlighted code on homepage",
        17: "NewsletterSignup component on landing page",
        19: "Navbar with docs sidebar, GitHub link, search (docusaurus.config.ts themeConfig.navbar)",
        20: "ActionCard and button variants for CTAs",
        21: "Docusaurus docs template: sidebar, TOC, editUrl, prev/next navigation",
        22: "PatternDoc components (PatternMeta, PatternSection) used in pattern pages",
        23: "Local search plugin + search-experience.css for /search results page",
        24: "Custom 404 page at src/pages/404.tsx",
        25: "Loading components: DocSkeleton, Spinner in src/components/Loading/",
        26: "EmptyState component + design-system/empty-states.mdx",
        28: "Table styling via --ifm-table-* tokens in custom.css",
        29: "Alert and Callout components + design-system/alerts-callouts.mdx",
        30: "Breadcrumbs provided by Docusaurus theme",
        31: "OptimizedImage component with lazy loading",
        32: "Font preload headTags in docusaurus.config.ts + fonts.css",
        37: "OpenGraph and Twitter Card meta tags in docusaurus.config.ts headTags",
        39: "Print styles in custom.css @media print block",
        40: "Design system docs: buttons, typography, badges-tags, alerts-callouts, empty-states",
    },
    "PHASE_2_ISSUES.md": {
        41: "documentation/docs/concepts/introduction.md — What is Soroban?",
        43: "documentation/docs/getting-started/setup-linux.md",
        44: "documentation/docs/getting-started/setup-windows.md",
        45: "documentation/docs/getting-started/first-contract.md",
        47: "documentation/docs/getting-started/building-and-compilation.md",
        49: "documentation/docs/getting-started/deploy-testnet.md",
        50: "documentation/docs/getting-started/deploy-mainnet.md",
        51: "documentation/docs/getting-started/contract-interaction.md",
        53: "documentation/docs/concepts/best-practices.md",
        54: "documentation/docs/getting-started/debugging.md — 20+ common errors with solutions",
        56: "documentation/docs/concepts/storage.md",
        57: "documentation/docs/concepts/authorization.md + patterns/authorization.mdx",
        58: "documentation/docs/concepts/events.md",
        59: "documentation/docs/concepts/error-handling.md + patterns/error-handling.mdx",
        60: "documentation/docs/patterns/custom-types.mdx",
        61: "documentation/docs/concepts/cross-contract-invocation.md",
        62: "documentation/docs/concepts/gas-and-resources.md",
        63: "documentation/docs/patterns/lifecycle-upgrades.mdx",
        64: "documentation/docs/security/fundamentals.md",
        65: "documentation/docs/patterns/optimization-playbook.mdx",
        70: "documentation/docs/getting-started/debugging.md",
        71: "scripts/test-examples.sh + CI test-examples job in .github/workflows/ci.yml",
        76: "Table of contents via Docusaurus docs right sidebar",
        78: "documentation/docs/contributing.md",
    },
    "PHASE_3_ISSUES.md": {
        120: "documentation/docs/patterns/optimization-playbook.mdx documents gas-efficient patterns",
    },
    "PHASE_4_ISSUES.md": {
        124: "Tabbed code examples via @theme/Tabs in pattern pages (e.g. hello-world.mdx)",
        131: "Pattern card hover lift effects in cards.module.css",
    },
    "PHASE_5_ISSUES.md": {
        161: "@easyops-cn/docusaurus-search-local integrated (local search alternative to Algolia)",
        162: "Search index config in docusaurus.config.ts plugins section",
        163: "Search results styling in src/css/search-experience.css",
        164: "Autocomplete provided by docusaurus-search-local plugin",
        170: "Fuzzy/typo-tolerant search via Lunr in docusaurus-search-local",
        172: "Local Lunr index — no external search latency",
        173: "Mobile-friendly search styles in search-experience.css",
        177: "OpenGraph meta tags in docusaurus.config.ts headTags",
        178: "Twitter Card meta tags in docusaurus.config.ts headTags",
        181: "Canonical URLs generated by Docusaurus per page",
        182: "sitemap.xml via @docusaurus/plugin-sitemap in preset-classic",
        183: "robots.txt generated by Docusaurus build",
    },
    "PHASE_6_ISSUES.md": {
        212: "examples/ compile and pass tests; CI test-examples job runs scripts/test-examples.sh",
        215: "CI pipeline runs lint, typecheck, build, and example tests (.github/workflows/ci.yml)",
    },
    "PHASE_7_ISSUES.md": {
        241: ".github/workflows/ci.yml and deploy.yml GitHub Actions workflows",
        242: "build-docs job verifies build on every PR/push",
        243: "test-examples job runs contract tests in CI",
        244: "lint-format job runs ESLint and Prettier checks",
        247: ".github/workflows/deploy.yml — production deploy to GitHub Pages",
        273: "documentation/docs/contributing.md contributor guidelines",
        276: ".github/pull_request_template.md",
    },
}


def parse_issue_blocks(content: str) -> list[tuple[int, int, int]]:
    """Return list of (issue_num, start_line, end_line) for each issue block."""
    lines = content.splitlines(keepends=True)
    blocks: list[tuple[int, int, int]] = []
    pattern = re.compile(r"^### Issue #(\d+):")
    starts: list[tuple[int, int]] = []

    for i, line in enumerate(lines):
        m = pattern.match(line)
        if m:
            starts.append((int(m.group(1)), i))

    for idx, (num, start) in enumerate(starts):
        end = starts[idx + 1][1] if idx + 1 < len(starts) else len(lines)
        # Trim trailing --- separator before next section header
        while end > start and lines[end - 1].strip() in ("", "---"):
            end -= 1
        if end > start and lines[end - 1].strip() == "---":
            end -= 1
        blocks.append((num, start, end))

    return blocks


def remove_issues(content: str, to_remove: dict[int, str]) -> tuple[str, list[tuple[int, str]]]:
    blocks = parse_issue_blocks(content)
    if not blocks:
        return content, []

    lines = content.splitlines(keepends=True)
    remove_set = set(to_remove.keys())
    removed: list[tuple[int, str]] = []

    # Build new content by keeping non-removed blocks
    # Find header end (before first issue or first section after header)
    first_issue_start = blocks[0][1]
    header = "".join(lines[:first_issue_start])

    kept_sections: list[str] = []
    current_section_header: str | None = None
    section_issues_kept: list[str] = []

    # Re-parse with section awareness
    section_pattern = re.compile(r"^## .+\(Issues #(\d+)-(\d+)\)")
    i = first_issue_start
    while i < len(lines):
        sec_m = section_pattern.match(lines[i])
        if sec_m:
            if section_issues_kept:
                kept_sections.append("".join(section_issues_kept))
                section_issues_kept = []
            current_section_header = lines[i]
            i += 1
            continue

        issue_m = re.match(r"^### Issue #(\d+):", lines[i])
        if issue_m:
            num = int(issue_m.group(1))
            block_end = len(lines)
            for bnum, bstart, bend in blocks:
                if bnum == num:
                    block_end = bend
                    break
            if num in remove_set:
                removed.append((num, to_remove[num]))
                i = block_end
                # skip trailing blank lines and ---
                while i < len(lines) and lines[i].strip() in ("", "---"):
                    i += 1
                continue
            else:
                if current_section_header and not section_issues_kept:
                    section_issues_kept.append(current_section_header)
                    if i > 0 and lines[i - 1].strip() == "---":
                        pass  # --- already consumed
                    current_section_header = None
                section_issues_kept.append("".join(lines[i:block_end]))
                if block_end < len(lines) and lines[block_end - 1].strip() != "---":
                    section_issues_kept.append("\n---\n\n")
                i = block_end
                continue
        i += 1

    if section_issues_kept:
        kept_sections.append("".join(section_issues_kept))

    # Everything after last issue block (Summary section)
    last_block_end = blocks[-1][2]
    footer = "".join(lines[last_block_end:])
    # Clean footer: remove leading --- if present
    footer = re.sub(r"^(---\n\n?)+", "", footer)

    body = "\n---\n\n".join(s.strip("\n") for s in kept_sections if s.strip())
    if body:
        body = body + "\n\n"

    new_content = header + body + footer
    return new_content, sorted(removed, key=lambda x: x[0])


def build_completed_summary(removed: list[tuple[int, str]]) -> str:
    if not removed:
        return ""
    lines = ["# Completed Issues (removed)", ""]
    lines.append(
        "The following issues were removed because acceptance criteria are met in the current codebase:"
    )
    lines.append("")
    for num, reason in removed:
        lines.append(f"- **Issue #{num}** — {reason}")
    lines.append("")
    lines.append("---")
    lines.append("")
    return "\n".join(lines)


def update_total_issues(content: str, remaining: int) -> str:
    content = re.sub(
        r"(\*\*Total Issues\*\*: )\d+",
        rf"\g<1>{remaining}",
        content,
        count=2,
    )
    return content


def process_file(filename: str) -> dict:
    path = ROOT / filename
    content = path.read_text()
    to_remove = REMOVALS.get(filename, {})

    new_content, removed = remove_issues(content, to_remove)
    remaining = 40 - len(removed)

    # Insert or replace completed summary
    summary = build_completed_summary(removed)
    if summary:
        if "# Completed Issues (removed)" in new_content:
            new_content = re.sub(
                r"# Completed Issues \(removed\).*?---\n\n",
                summary,
                new_content,
                count=1,
                flags=re.DOTALL,
            )
        else:
            # Insert after title block (after first ---)
            new_content = re.sub(
                r"(^# .+\n\n\*\*Objective\*\*:.*?\n\n\*\*Total Issues\*\*: \d+\n\n---\n\n)",
                r"\1" + summary,
                new_content,
                count=1,
                flags=re.DOTALL,
            )

    new_content = update_total_issues(new_content, remaining)
    path.write_text(new_content)

    return {
        "file": filename,
        "removed": len(removed),
        "remaining": remaining,
        "removed_ids": [n for n, _ in removed],
    }


def main() -> None:
    results = [process_file(f) for f in sorted(REMOVALS.keys())]
    total_removed = sum(r["removed"] for r in results)
    total_remaining = sum(r["remaining"] for r in results)
    print(f"Processed {len(results)} files")
    print(f"Total removed: {total_removed}, remaining: {total_remaining}")
    for r in results:
        print(f"  {r['file']}: removed {r['removed']}, remaining {r['remaining']}")


if __name__ == "__main__":
    main()
