---
title: Soroban Token Standards Overview
description: Compare Stellar Asset Contract (SAC) and custom Soroban token designs, including when to use each model and how the cookbook token-transfer example differs.
keywords:
  - soroban token standards
  - stellar asset contract
  - sac vs custom token
  - soroban token design
  - token transfer contract
image: /img/soroban-social-card.png
---

# Soroban Token Standards Overview

Soroban token implementations generally follow two tracks:

- Stellar Asset Contract (SAC): Standardized token interface tied to Stellar assets.
- Custom token contracts: Application-specific logic and storage models.

## SAC vs custom token at a glance

| Dimension                  | SAC                                | Custom token                       |
| -------------------------- | ---------------------------------- | ---------------------------------- |
| Standard compatibility     | High, standardized interface       | Depends on your implementation     |
| Ecosystem interoperability | Strong default wallet/tool support | Requires explicit integration work |
| Flexibility                | Constrained by standard behavior   | Fully customizable rules           |
| Upgrade/control model      | Standard-led behavior              | Project-defined governance         |
| Time to implement          | Faster for common token needs      | More engineering effort            |

## When SAC is a strong fit

Use SAC when you want:

- Broad compatibility with existing Stellar tooling.
- Predictable token behavior for wallets and integrators.
- Lower implementation risk from custom business logic.

## When a custom token is a strong fit

Use custom contracts when you need:

- Non-standard transfer restrictions.
- Domain-specific authorization or compliance rules.
- Custom accounting, hooks, or policy engines.

## Cookbook custom example

The cookbook custom token example in [examples/token-transfer/src/lib.rs](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/examples/token-transfer/src/lib.rs) demonstrates a focused transfer model with:

- Persistent balance storage keyed by address.
- Explicit `mint`, `balance`, and `transfer` functions.
- Domain errors (`InsufficientBalance`, `InvalidAmount`, `SelfTransfer`).
- Unit tests that assert success and rollback behavior.

This pattern is effective when your business logic exceeds standard token semantics.

## Decision checklist

1. Need broad ecosystem compatibility with minimal custom behavior: choose SAC.
2. Need protocol-specific transfer or policy logic: choose custom.
3. Need both: start with SAC-compatible behavior, then isolate custom extensions in auxiliary contracts.

## Related reading

- [Pattern Library](../patterns/overview)
- [Advanced Soroban Testing Strategies](./testing-strategies.md)
