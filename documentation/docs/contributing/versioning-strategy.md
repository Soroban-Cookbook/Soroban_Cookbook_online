---
sidebar_position: 11
title: Versioning Strategy
description: How the Soroban Cookbook documentation is versioned alongside Soroban SDK releases.
---

The Soroban Cookbook tracks the Soroban (`soroban-sdk`) release cadence. Because contract
patterns, CLI flags, and API surfaces can change between SDK releases, the docs site is
versioned using [Docusaurus's built-in docs versioning](https://docusaurus.io/docs/versioning)
so readers can find guidance that matches the SDK version they're actually building against.

## How versions are structured

| Version | Meaning | Served at |
| --- | --- | --- |
| **Next 🚧** | Unreleased/in-progress docs tracking `main`. May describe upcoming SDK changes before they ship. | `/docs/next/` |
| **Latest numbered version** (e.g. `22.0`) | The most recent frozen snapshot, matching a stable `soroban-sdk` release. This is the default version served at the site root. | `/docs/` |
| **Older numbered versions** | Archived snapshots, kept for readers who haven't upgraded yet. | `/docs/<version>/` |

The version dropdown in the navbar (top right) lets readers switch between all of these.

## When to cut a new version

Cut a new documentation version when a new **stable** `soroban-sdk` release ships and the
cookbook's examples/guides have been updated to match it. Patch releases of the SDK that don't
change documented behavior generally don't need a new docs version.

1. Make sure `docs/` (the "Next" version) reflects the new SDK release accurately.
2. From `documentation/`, run:

   ```bash
   npm run docusaurus docs:version <sdk-major.minor>
   ```

   For example, `npm run docusaurus docs:version 23.0`. This snapshots the current contents of
   `docs/` into `versioned_docs/version-<version>/` and `versioned_sidebars/`, and adds the
   version to `versions.json`.
3. Add a migration guide under [`docs/migrations/`](/docs/migrations) describing what changed
   for readers upgrading from the previous version — see the
   [migration guide template](/docs/migrations/template) as a starting point.
4. Link the new migration guide from `docs/migrations/index.md`.
5. Open a PR with the new `versioned_docs/`, `versioned_sidebars/`, `versions.json`, and the
   migration guide together.

## Archiving old versions

Docusaurus keeps every cut version buildable and browsable indefinitely by default. If a version
becomes too old to be worth maintaining/building (for example, it no longer reflects a supported
SDK release), remove it from the `onlyIncludeVersions` allowlist in `docusaurus.config.ts` (or
delete its `versioned_docs/`, `versioned_sidebars/`, and `versions.json` entry) rather than
editing its content — archived versions should stay frozen as historical snapshots.

## Version-specific content

Most pages apply to every version equally. When a page needs to say something different per
version (for example, a CLI flag renamed between SDK releases), edit the copy that lives in that
version's own `docs/` or `versioned_docs/version-<x>/` tree — each version's files are
independent copies, so changes to `docs/` (Next) never retroactively affect frozen versions.

## Related

- [Migration guides](/docs/migrations)
- [Docusaurus versioning docs](https://docusaurus.io/docs/versioning)
