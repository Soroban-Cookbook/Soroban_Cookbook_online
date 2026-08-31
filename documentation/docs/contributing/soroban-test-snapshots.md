---
title: Reviewing Soroban Test Snapshots
description: Regenerate and review Soroban SDK test snapshots without accepting unrelated JSON changes.
sidebar_position: 3
---

import OptimizedImage from '@site/src/components/OptimizedImage';

Soroban SDK test snapshots are committed JSON records of the observable state left by a test environment. They make authorization, ledger, and event changes visible in version control so reviewers can distinguish an intentional contract change from unrelated generated-file churn.

These fixtures are different from the on-chain [Token Snapshot pattern](/docs/patterns/token-snapshot). The files covered here are test artifacts under an example crate's `test_snapshots/` directory.

## How the files are written

The token-transfer example enables the Soroban SDK `testutils` feature. Its workspace lockfile currently resolves `soroban-sdk` 27.0.6.

In that SDK version, snapshot capture is enabled by default. When the final reference to a test `Env` is dropped, the SDK writes meaningful state to:

```text
test_snapshots/<test-module>/<test-name>.N.json
```

`N` distinguishes multiple `Env` values created by the same test. The SDK does not write a file when the environment contains no ledger entries, authorizations, or events.

This repository does **not** use `UPDATE_EXPECT`, `SOROBAN_SNAPSHOT_DIR`, or another environment variable to approve snapshot changes. Run the target test normally, then review the resulting Git diff. The behavior is defined by the repository's locked SDK version; re-check the pinned dependency and [SDK source](https://github.com/stellar/rs-soroban-sdk/blob/v27.0.6/soroban-sdk/src/env.rs#L2053-L2100) after an SDK upgrade.

From the repository root, regenerate only the token-transfer fixture for the named test:

```bash
cargo test --locked --manifest-path examples/token-transfer/Cargo.toml test_transfer_moves_tokens
git status --short -- examples/token-transfer/test_snapshots/
git diff -- examples/token-transfer/test_snapshots/tests/test_transfer_moves_tokens.1.json
```

Use a narrow test filter first. A full example-suite run can rewrite many fixtures after an SDK or protocol upgrade, making the important behavioral change harder to review.

## Read a real token-transfer fixture

The committed `test_transfer_moves_tokens.1.json` fixture records a transfer of 400 units. This is an exact excerpt from its `auth` section:

```json
"auth": [
  [],
  [],
  [
    [
      "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4",
      {
        "function": {
          "contract_fn": {
            "contract_address": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
            "function_name": "transfer",
            "args": [
              {
                "address": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4"
              },
              {
                "address": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHK3M"
              },
              {
                "i128": "400"
              }
            ]
          }
        },
        "sub_invocations": []
      }
    ]
  ],
  [],
  []
]
```

The non-empty entry says that the generated `...AAFCT4` address authorized `transfer(from, to, 400)`. The sibling `ledger` section records the final balances as 600 and 400 and keeps total supply at 1,000. Those ledger values are final test state, not a before-and-after diff; Git supplies the diff between fixture revisions.

Generated addresses in these fixtures are deterministic test values, not funded accounts or credentials.

## Read a real historical diff

Project commit [`b353bf9`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/commit/b353bf9c072e3379b02fb2140aff0f3177ecd758), whose subject added token-contract metadata support, regenerated this same token-transfer fixture under protocol 27. The relevant historical patch is:

```diff
@@ -22,10 +23,7 @@
                 {
-                  "i128": {
-                    "hi": 0,
-                    "lo": 400
-                  }
+                  "i128": "400"
                 }
@@ -38,7 +36,7 @@
   "ledger": {
-    "protocol_version": 22,
+    "protocol_version": 27,
```

The authorization amount remains 400; only its JSON representation changes. The accompanying protocol context shifts from 22 to 27, but that shift alone is not evidence of a token-behavior change. A reviewer should verify both changes instead of treating every regenerated line as automatically correct.

<OptimizedImage
  src="/img/tutorials/soroban-test-snapshot-diff.png"
  alt="Real token-transfer snapshot diff from commit b353bf9 showing the authorization amount 400 changing JSON representation and the protocol version changing from 22 to 27"
  width={1440}
  height={900}
  loading="lazy"
/>

## What to review in the JSON

| Section      | Review questions                                                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generators` | Did address, nonce, or muxed-ID allocation change for a reason? Generator churn can change many downstream identifiers without changing contract logic.               |
| `auth`       | Did the expected address authorize the expected function and arguments? Check missing, added, reordered, or nested `sub_invocations`.                                 |
| `ledger`     | Do contract-data keys, values, durability, and `live_until` values match the test? Separate behavioral storage changes from protocol, TTL, and serialization context. |
| `events`     | Did the expected stable system or contract event topics, data, order, and count change? Diagnostic events are intentionally excluded from SDK test snapshots.         |

The currently committed token-transfer JSON fixtures end with `"events": []`, while the Rust event tests separately assert emitted events through `env.events().all()`. Do not read an empty fixture field as proof that contract code emitted no event, and do not replace focused event assertions with snapshot review.

For failed calls, confirm rollback as well as the returned error. For example, the insufficient-balance fixture preserves the sender's balance and total supply and contains no successful authorization entry.

## Review workflow

1. Start from a clean checkout and run the narrowest relevant test.
2. Limit `git status` and `git diff` to that example's `test_snapshots/` directory.
3. Map every changed authorization, ledger entry, event, and generator value to the test or dependency change that caused it.
4. Investigate unexpected file count, large unrelated rewrites, local paths, credentials, or nondeterministic values before staging anything.
5. Run the same targeted test again and confirm the fixture diff is stable.
6. Commit a reviewed fixture with the code or dependency change that requires it; never accept generated JSON only to make a working tree look clean.

For the direct-transfer example, a complete review should confirm:

- exactly one successful transfer authorization for the sender;
- transfer arguments matching the test's sender, recipient, and amount;
- final balances of 600 and 400 with total supply unchanged at 1,000;
- no unrelated allowance or storage-key changes; and
- any event-fixture change agrees with the explicit Rust event assertions.

## Related links

- [Contributing to Soroban Cookbook](/docs/contributing) — project workflow and validation checklist
- [Adding a Tested Code Example](/docs/contributing/add-tested-example) — example-crate structure and test commands
- [Local Testing and Simulation](/docs/getting-started/local-testing-and-simulation) — broader local-test setup and debugging guidance
