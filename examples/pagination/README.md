# Pagination

A bounded-iteration contract that paginates stored `Vec` and `Map` data with a strict `limit` ceiling so each call stays comfortably within Soroban instruction budgets.

## What it demonstrates

- Cursor-based pagination using `start` and `limit`
- Maximum-page enforcement to avoid unbounded loops and DoS-style resource spikes
- Safe slicing for both `Vec` and `Map` collections stored in persistent state

## Build

```bash
stellar contract build --manifest-path examples/pagination/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/pagination.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh pagination

# Or invoke cargo directly
cargo test --manifest-path examples/pagination/Cargo.toml
```

## Related documentation

- [Gas and Resources](https://soroban-cookbook.dev/docs/concepts/gas-and-resources) — budget-conscious iteration guidance
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
