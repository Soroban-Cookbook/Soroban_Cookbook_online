---
title: Code Security Audit
sidebar_position: 3
description: Formal security audit checklist for the Soroban Cookbook documentation site.
---

# Code Security Audit

This audit checklist covers the custom code that powers the Soroban Cookbook documentation site. The site is a static Docusaurus application, so the main risks are documentation integrity, build-chain compromise, unsafe client-side code, and dependencies with known vulnerabilities.

Use this page before major releases, dependency upgrades, or deployment changes.

---

## Audit Scope

### In scope

- `documentation/package.json` and `documentation/package-lock.json`
- Docusaurus configuration in `documentation/docusaurus.config.ts`
- Sidebar and docs routing in `documentation/sidebars.ts`
- Custom React components under `documentation/src`
- MDX and Markdown content under `documentation/docs`
- Static assets under `documentation/static`
- Build, lint, typecheck, and end-to-end test scripts

### Out of scope

- Soroban smart contract examples outside the documentation app
- External Stellar, Soroban, Discord, or GitHub services linked from the docs
- The hosting provider's internal infrastructure

---

## Static Site Threat Model

### Assets to protect

- Published documentation content and example code snippets
- Search index and generated static assets
- Build and deployment credentials
- Users who browse the site and follow linked commands
- Contributor trust in release and preview builds

### Trust boundaries

| Boundary | Risk | Audit action |
| --- | --- | --- |
| Contributor content to docs build | Malicious MDX, unsafe links, misleading commands | Review new MDX/Markdown for scripts, embeds, and shell commands before merge |
| Package registry to build machine | Compromised dependency or transitive dependency | Install from the committed lockfile and review audit output before release |
| Docusaurus build to static host | Generated assets differ from reviewed source | Build from a clean checkout and keep build logs for release candidates |
| Browser to external links | Phishing or unsafe third-party navigation | Prefer official Stellar/Soroban links and review external URLs in changed docs |
| Local search index to browser | Accidental exposure of draft or private content | Confirm only public docs are included in the generated index |

### Expected attacker capabilities

- Open a pull request with hostile MDX, links, commands, or static assets
- Attempt dependency confusion or lockfile tampering
- Inject unsafe client-side behavior through custom React components
- Abuse external links or images to mislead readers
- Trigger build failures or excessive asset sizes to disrupt deployment

---

## Dependency Review Checklist

Run this review whenever `documentation/package.json` or `documentation/package-lock.json` changes.

- [ ] Install dependencies from the lockfile, not from unconstrained ranges.
- [ ] Confirm Docusaurus packages stay on the same major and compatible minor version.
- [ ] Review `@easyops-cn/docusaurus-search-local` changes because it generates a client-side search index.
- [ ] Review `sharp` upgrades because it runs native image-processing code during the build.
- [ ] Review Playwright, ESLint, TypeScript, and Prettier upgrades as build-time tooling only.
- [ ] Run an audit command and record any high or critical findings before release.
- [ ] If an audit finding is not exploitable for a static docs site, document the reason in the PR.

Recommended commands:

```bash
cd documentation
npm ci
npm audit --omit=dev
npm run typecheck
npm run lint
npm run build
```

If the project is being developed with Bun, the equivalent install and build checks are:

```bash
cd documentation
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run build
```

---

## Custom Code Review Checklist

Use this checklist for changes under `documentation/src`, `documentation/docusaurus.config.ts`, and `documentation/sidebars.ts`.

### React components

- [ ] No use of `dangerouslySetInnerHTML` unless the source is hardcoded, reviewed, and sanitized.
- [ ] No direct DOM writes with untrusted content.
- [ ] No browser storage for secrets, wallet keys, access tokens, or private user data.
- [ ] External links use clear labels and do not disguise destination domains.
- [ ] Components render safely when props are missing, empty, or unexpectedly long.
- [ ] Error states do not expose local filesystem paths, environment variables, or build metadata.

### Docusaurus configuration

- [ ] No custom scripts are injected from unreviewed third-party domains.
- [ ] Search, theme, and plugin configuration include only public documentation content.
- [ ] Deployment URLs and organization metadata point to official project destinations.
- [ ] Redirects and route aliases do not send users to untrusted domains.
- [ ] Generated social images and favicons are sourced from committed static assets.

### Markdown and MDX content

- [ ] Shell commands are explicit about testnet/mainnet context where it matters.
- [ ] Commands that transfer funds, deploy contracts, or change network state include a warning.
- [ ] Code samples avoid placeholder private keys, seeds, tokens, or real credentials.
- [ ] External image and badge URLs are necessary, stable, and trusted.
- [ ] Embedded HTML does not include scripts, inline event handlers, or remote forms.

---

## Release Audit Record

Copy this record into a release PR or security review issue.

```markdown
## Security audit record

- Reviewer:
- Date:
- Commit or PR:
- Dependency files changed: yes/no
- Custom React/Docusaurus code changed: yes/no
- MDX/Markdown command snippets changed: yes/no

### Commands run

- [ ] npm ci
- [ ] npm audit --omit=dev
- [ ] npm run typecheck
- [ ] npm run lint
- [ ] npm run build

### Findings

| Severity | Area | Finding | Resolution |
| --- | --- | --- | --- |
| | | | |

### Sign-off

- [ ] No high or critical dependency findings remain unexplained.
- [ ] No unsafe custom HTML, script injection, or untrusted embeds were introduced.
- [ ] Static-site threat model still matches the deployed architecture.
```

---

## Current Baseline Notes

- The documentation app is expected to generate static assets only; it should not require a server-side runtime after build.
- The primary runtime dependencies are Docusaurus, React, local search, fonts, and rendering helpers.
- The highest-value review areas are dependency upgrades, custom React components, external links, and command snippets that readers may copy into a terminal.
- Dependency automation and recurring vulnerability scans are tracked separately from this code audit checklist.