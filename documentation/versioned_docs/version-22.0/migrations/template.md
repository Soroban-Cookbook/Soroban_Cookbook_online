---
sidebar_position: 2
title: "Template: Migrating from X to Y"
description: Template for writing a new migration guide when cutting a documentation version.
---

:::info Template
Copy this file to `docs/migrations/migrating-<from>-to-<to>.md` (e.g.
`migrating-22-0-to-23-0.md`) when cutting a new documentation version, fill in each section, then
link it from [`docs/migrations/index.md`](./index.md). Delete this callout in the copy.
:::

# Migrating from `<from-version>` to `<to-version>`

One-paragraph summary of the SDK release this covers and who should read this guide (e.g. "any
contract using X pattern").

## Breaking changes

- **`old_api_name` → `new_api_name`** — what changed and why.
- List every breaking change readers need to act on. Link to the relevant pattern/concept page
  where the new API is documented.

## Deprecations

- APIs that still work but will be removed in a future release, and their replacement.

## New capabilities

- Notable additions in the new version that aren't required to migrate but are worth knowing
  about, with a link to where they're documented.

## Step-by-step upgrade

1. Update `soroban-sdk` in `Cargo.toml` to the new version.
2. Run `cargo build` / `cargo test` and address compiler errors from the breaking changes above.
3. Any project-specific steps (regenerating bindings, redeploying, etc.).

## Need help?

If you hit an issue not covered here, ask in the [Soroban Cookbook Discord](https://discord.gg/YNBu3jKEF)
or [open an issue](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues).
