---
title: Keeping Code Snippets in Sync (Snippet-Drift Check)
description: How to use the src= convention to keep Rust fences in pattern docs permanently in sync with their example files.
sidebar_position: 3
---

# Keeping Code Snippets in Sync

## The problem

Pattern documentation often includes Rust code fences that are copied from
the `examples/` directory. Without a guard, the MDX and the actual source
can diverge silently — a contributor updates the example crate, forgets to
update the docs, and readers encounter outdated code.

## The convention

Any Rust fence that should stay byte-for-byte in sync with an example file
must include a `src=` attribute in its info string:

````markdown
```rust src=counter/src/lib.rs
…exact copy of examples/counter/src/lib.rs…
```
````

The path after `src=` is always **relative to the `examples/` directory**.
The CI job `check-snippet-drift` compares the fence body against the
referenced file and fails the build when they differ.

## What CI checks

`scripts/check-snippet-drift.sh` scans every `*.mdx` file in
`documentation/docs/patterns/` and for each `src=`-tagged fence:

1. Resolves the path to `examples/<src-value>`.
2. Loads the file content.
3. Normalises both the fence body and the file (strips trailing whitespace,
   removes leading/trailing blank lines).
4. Fails if the normalised texts differ, printing a diff.

Fences **without** a `src=` attribute are not touched by this check.
They are still subject to the separate `check-snippets.sh` audit, which
verifies that a matching example crate exists.

## When to add `src=`

| Situation | Action |
|-----------|--------|
| Full file shown verbatim in docs | Add `src=<crate>/src/lib.rs` |
| Illustrative / anti-pattern snippet | Use ` ```rust illustrative ` (no `src=`) |
| Partial excerpt shown for explanation | Plain ` ```rust ` (no `src=`), no drift check |

Only add `src=` when the fence **is** (or should be) a complete, unmodified
copy of the referenced file. Partial excerpts should stay as plain
` ```rust ` blocks — they are intentionally not drift-checked.

## Adding a synced snippet

1. Write (or update) your example in `examples/<name>/src/lib.rs`.
2. Run `cargo test --manifest-path examples/<name>/Cargo.toml` to confirm it
   passes.
3. Copy the **entire file** into your MDX fence and add the `src=` attribute:

   ````markdown
   ```rust src=<name>/src/lib.rs
   <paste file content here>
   ```
   ````

4. Run the drift check locally:

   ```bash
   bash scripts/check-snippet-drift.sh
   ```

   A passing run prints `[pass]` for every tagged fence.

5. Open a PR. CI will re-run the check automatically.

## Fixing a drift failure

When CI reports a drift, the diff shows exactly which lines differ:

```
[fail]  counter.mdx — src=counter/src/lib.rs — DRIFTED from …/examples/counter/src/lib.rs

  Diff (snippet vs file):
  < old line in MDX
  > new line in example file
```

You have two options:

- **Update the MDX** to match the current example file (most common).
- **Update the example file** if the docs intentionally show a newer API and
  the example crate has fallen behind.

Either way, re-run `bash scripts/check-snippet-drift.sh` locally to confirm
the fix before pushing.

## Running the check locally

```bash
# Check all pattern files
bash scripts/check-snippet-drift.sh

# Check a single file
bash scripts/check-snippet-drift.sh counter.mdx
```

Exit code 0 means all tagged snippets are in sync. Exit code 1 means at
least one snippet has drifted.

## Reference

- Proof-of-convention pattern: [Counter](../patterns/counter)
- Related check (tested vs illustrative): [`scripts/check-snippets.sh`](../contributing/add-tested-example)
- CI job definition: `.github/workflows/ci.yml` → `check-snippet-drift` job
