---
sidebar_position: 3
title: "Baseline: docs versioning starts at 22.0"
description: What documentation version 22.0 represents and how to use versioned docs going forward.
---

# Baseline: docs versioning starts at `22.0`

This isn't a migration between two SDK releases — it's the starting point. Documentation
versioning was introduced against `soroban-sdk` **22.0.0**, the version the cookbook's examples
target at the time versioning was enabled (see the `soroban-sdk` dependency in
[`examples/hello-world/Cargo.toml`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/examples/hello-world/Cargo.toml)).

## What this means for readers

- **`22.0`** (the default version served at `/docs/`) is frozen to match `soroban-sdk` 22.0.0.
  If you're building against that release, you're already reading the right docs.
- **Next 🚧** (`/docs/next/`) tracks in-progress documentation changes ahead of the next SDK
  release. Content there may describe upcoming behavior that isn't released yet.
- When the cookbook's examples are updated for a newer stable `soroban-sdk` release, a new
  version will be cut and a migration guide added here describing the `22.0 → <next>` changes.

## What this means for contributors

Going forward, don't edit `versioned_docs/version-22.0/` to reflect new SDK behavior — that
snapshot should stay frozen as the historical `22.0` record. Make ongoing changes in `docs/`
(the "Next" version), and see [Versioning Strategy](/docs/contributing/versioning-strategy) for
how and when to cut the next version.
