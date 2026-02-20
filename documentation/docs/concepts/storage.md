# Storage Patterns

Soroban contracts store state in ledger-backed storage. Designing storage carefully improves performance, cost, and maintainability.

## What to Store

- Persistent contract state such as balances, configuration, and ownership
- Derived data only when recomputation is expensive
- Version markers when you plan contract upgrades

## Practical Guidelines

1. Keep keys deterministic and namespaced.
2. Separate global config from user-specific data.
3. Prefer compact value types to reduce footprint.
4. Define clear migration strategy for schema changes.

## Example Use Cases

- Token balances keyed by account
- Admin configuration keyed by a known symbol
- Nonce/counter state for replay protection

## Next

- [Authorization](./authorization.md)
- [Events](./events.md)
- [First Contract Walkthrough](../getting-started/first-contract.md)
