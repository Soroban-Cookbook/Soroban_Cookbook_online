---
sidebar_position: 6
title: Authorization
description: Implement secure authorization patterns in Soroban contracts — identity validation, role-based access control, and permission management for sensitive operations.
---

# Authorization

Authorization in Soroban ensures only expected identities can execute sensitive contract actions.

## Typical Access Patterns

- Owner/admin-only functions
- Role-based permissions for operators
- User-signed operations for account-scoped actions

## Best Practices

1. Validate caller identity before mutating state.
2. Keep privileged surfaces small and explicit.
3. Emit events for sensitive operations.
4. Add tests for unauthorized access attempts.

## Common Protected Operations

- Setting admins or governance parameters
- Mint/burn operations in token-like contracts
- Upgrading contract logic or config

## Custom accounts

Application contracts typically call `require_auth` on a caller's `Address`. When that address is a **contract account**, the Soroban host delegates authentication to the account's `__check_auth` implementation.

That is a different trust and threat model than `require_auth` on a normal app contract alone. For diagrams, nonce/replay behavior, and policy pitfalls, see **[Custom Accounts](./custom-accounts.md)**.

## Related Examples

The [multisig-wallet pattern](/docs/patterns/multisig-wallet) demonstrates M-of-N authorization, where a configurable threshold of signers must approve a transaction before it can be executed. See the [source code](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/multisig-wallet) for implementation details.

## Nested Calls and Authorization Trees

When your contract calls another contract that calls `require_auth` (for example, a vault calling a token's `transfer`), Soroban verifies the *entire* signed call chain — the root invocation plus every nested `sub_invocation` — not just a single signature. This is the [Authorization Trees and Sub-Invocations](./authorization-trees.md) concept: exact arguments, exact call paths, and `Error(Auth, InvalidAction)` when anything mismatches. See that page for the two-level walkthrough, `mock_auths` / `mock_all_auths` testing patterns, and debugging guidance.

## Custom Accounts

Most contracts in this cookbook authorize callers with `Address::require_auth()`, which delegates all signature checking to the network — the caller is either a standard `G...` account or an existing contract, and the host verifies its signature before your contract code even runs.

A **custom account** is different: it's a contract that *is* the identity being authorized. When code calls `require_auth()` against a custom account's `C...` address, the host invokes that contract's `__check_auth` function (via the `CustomAccountInterface` trait) and lets the contract decide, in its own logic, whether the call is authorized. This is how session keys, multisig wallets, spend policies, and recovery schemes get built on Soroban — they're just custom accounts with different `__check_auth` logic.

This is not a wallet product, and a minimal example should not be treated as one — production custom accounts need careful review of replay protection, fee handling, and policy edge cases. The [`examples/custom-account/`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/custom-account) example shows the shape of the interface: verifying a single Ed25519 signature and enforcing a spend-limit policy on top of it, with tests covering a valid signature, a rejected (invalid) signature, and a valid signature that still gets rejected for exceeding the policy limit.

## Next

- [Custom Accounts](./custom-accounts.md)
- [Authorization Trees and Sub-Invocations](./authorization-trees.md) — how authorization propagates across nested cross-contract calls
- [Security Fundamentals](../security/fundamentals.md)
- [Token Pattern Security Audit](../security/token-audit.md)
- [Storage Patterns)](./storage.md)
- [Events](./events.md)

## Key handling & network risk

Any step in this page that asks you to run `stellar contract deploy` (or any command that signs with a Stellar secret key) carries the same two operational risks:

- **Key handling.** Do **not** commit a secret key (`S…`) or a seed phrase to your repo, paste it into a script, or export it as a long-lived shell variable. Prefer a named identity via the Stellar CLI (`stellar keys generate --global <alias>`), or — for browser dapps — let a wallet extension such as Freighter hold the key. The dapp should only ever see signed transaction XDR, never the secret itself. See [API Security](../getting-started/api-security.md) for the same rule applied to browser bundles.
- **Network risk.** Testnet (`Test SDF Network ; September 2015`) and mainnet (`Public Global Stellar Network ; September 2015`) share the same passphrase format but **are not** the same network. A contract ID you deploy on testnet is unreachable from mainnet, and funds sent to a mainnet contract cannot be recovered from a testnet deployment. Public RPC endpoints are convenient for tutorials but are not a substitute for running your own RPC or carefully verifying a third party's RPC for production traffic. Before any mainnet command in this guide, re-read [Deploy to Mainnet](../getting-started/deploy-mainnet.md) and confirm the network passphrase matches your intent.
