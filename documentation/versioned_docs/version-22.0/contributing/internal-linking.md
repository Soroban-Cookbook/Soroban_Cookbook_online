---
title: Internal Linking Strategy
description: How to structure cross-links across the Soroban Cookbook for SEO, discoverability, and reader navigation.
sidebar_position: 3
---

Internal links connect related pages so readers and search engines can discover content in context. This guide defines the cookbook's linking model and how to keep it healthy in CI.

---

## Goals

1. **Navigation** — readers always have a clear next step and related reading.
2. **SEO** — crawlers map topical clusters (getting started → concepts → patterns → security).
3. **Maintainability** — required links are declared in one registry and checked automatically.

---

## Hub-and-spoke model

Four **hub pages** anchor each major section. Every leaf page should link back to its hub and to at least one peer or downstream page.

| Hub | URL | Role |
|-----|-----|------|
| Docs home | `/docs/` | Entry point; links to all major sections |
| Core Concepts | `/docs/concepts/overview` | Concept index |
| Pattern Library | `/docs/patterns/overview` | Pattern catalog |
| Security | `/docs/security/fundamentals` | Security baseline |

**Category hubs** (implicit via sidebar): Getting Started (`/docs/getting-started/setup`), Contributing (`/docs/contributing`).

---

## Link format

Prefer **root-relative doc paths** so links survive file moves and match Docusaurus routing:

```markdown
[Storage Patterns](/docs/concepts/storage)
```

Acceptable alternatives in existing pages (audit normalizes these):

- `[Storage Patterns](./storage.md)` from sibling concept pages
- `[Storage Patterns](../concepts/storage.md)` from other sections

Avoid bare filenames without path context in new content. Use descriptive anchor text — not "click here".

---

## Required page sections

Every tutorial, concept, pattern, and security page should end with a navigation block:

```markdown
---

## Related links

- [Next Page Title](/docs/path/to/page) — one-line description
- [Related Topic](/docs/path/to/other) — why it matters
```

Accepted section headings (pick one):

- `## Related links` (preferred for new content)
- `## Next steps` / `## Next Steps` — learning-path pages
- `## Related Topics` / `## Related Patterns` — pattern pages

Include **2–4 internal links** minimum. At least one should point forward in the learning path or to a security doc when handling value or auth.

---

## Learning paths

### Getting Started

`/docs/getting-started/setup` → first contract → building → local testing → deploy testnet → deploy mainnet → contract interaction

Branch: [Debugging](/docs/getting-started/debugging) and [Testing errors](/docs/getting-started/testing-errors) from any build/test page.

### Core Concepts

`/docs/concepts/introduction` → overview → best practices → storage → authorization → events → gas & resources → cross-contract invocation

### Patterns

`/docs/patterns/overview` → hello world → custom types → authorization → optimization → lifecycle upgrades → proposal lifecycle

Cross-link [Error handling](/docs/patterns/error-handling) and [Error recovery](/docs/patterns/error-recovery) from overview and concepts.

### Security

`/docs/security/fundamentals` → [Token audit](/docs/security/token-audit) → [Governance](/docs/security/governance)

Link security docs from deploy-mainnet, authorization, and token-related patterns.

---

## Registry and CI

Required links per page live in `documentation/scripts/link-registry.json` in the repository.

When you add or restructure a doc:

1. Add an entry to `link-registry.json` with `requiredLinks` and `minInternalLinks`.
2. Add a `## Related links` section to the page.
3. Update the relevant **hub page** if the page is a major topic.
4. Run the audit:

```bash
cd documentation
bun run audit:links
```

The CI **Lint & Format** job runs this check on every pull request.

---

## External links

Docusaurus `onBrokenLinks: 'throw'` validates **internal** doc routes at build time. **External** URLs are checked separately:

```bash
cd documentation
bun run check:external-links
```

- Scans `docs/` and `src/` for `http(s)://` links in markdown and JSX.
- Writes a report to `reports/external-links.md` (gitignored; uploaded as a CI artifact).
- Skips localhost, RPC endpoints, and template placeholders (`[...]`, `<...>`).
- Ignored URLs are listed in `scripts/external-link-ignore.json`.
- Fails CI when any checked URL returns a non-success HTTP status.

When adding external links, prefer stable official docs (Stellar, Rust, GitHub) over short-lived third-party URLs.

---

## Checklist for new pages

- [ ] Frontmatter `title` and `description` set (SEO metadata).
- [ ] Linked from at least one hub or sibling page (no orphans).
- [ ] `## Related links` section with 2–4 internal links.
- [ ] Entry added to `link-registry.json`.
- [ ] Hub page updated if this is a flagship topic.
- [ ] `bun run audit:links` passes.
- [ ] `bun run check:external-links` passes (or no new external URLs added).

---

## Related links

- [Contributing Guide](/docs/contributing) — contribution workflow
- [Pattern Library](/docs/patterns/overview) — pattern hub
- [Core Concepts](/docs/concepts/overview) — concepts hub
- [Security Fundamentals](/docs/security/fundamentals) — security hub
