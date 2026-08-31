---
sidebar_position: 40
title: Reviewing Test Snapshots
description: How to manage and review test_snapshots updates in Soroban Cookbook examples.
---

# Reviewing Test Snapshots

Many examples in the Soroban Cookbook use snapshot testing to verify contract behavior, including authorization, events, and storage modifications. These snapshots are stored in `test_snapshots/` directories within each example.

While snapshot testing is powerful, it can lead to accidental "snapshot noise" if snapshots are blindly updated without review. CI cannot distinguish between legitimate logic updates and unintended snapshot churn.

## How Snapshots Work

When a test runs, it may capture the state of the environment (such as storage changes or emitted events) and compare it to a previously saved snapshot. If the logic changes, the snapshot will no longer match, and the test will fail.

To update snapshots intentionally after a logic change, you typically run the tests with an `UPDATE_EXPECT=1` environment variable.

## What to Review

When reviewing a Pull Request that modifies `test_snapshots/`, pay close attention to the following:

- **Authorization (Auth):** Verify that any changes to authorization footprints are intended and do not introduce security risks.
- **Events:** Ensure that the contract is still emitting the expected events with the correct topics and data.
- **Storage:** Check that storage reads, writes, and bumps are behaving as expected, and no unintended storage bloat is introduced.

Always read the diff of the snapshot files to confirm that the changes align with the intended logic modifications in the PR.

## CI Hints

To quickly see if a PR introduces snapshot churn, you can review the diff stat locally:

```bash
git diff --stat examples/**/test_snapshots
```

If you notice unexpected changes in these directories, it might indicate accidental snapshot noise rather than deliberate updates.

*Optional:* If your PR changes snapshots, consider adding a `snapshots` label to signal to reviewers that they should pay special attention to those files.
