# Custom Types

An example crate demonstrating `#[contracttype]` enums, structs, and storage
round-trips — how to model rich domain data and persist it in contract storage
without losing type information.

## What it demonstrates

- Declaring `#[contracttype]` enums (unit, tuple, and struct variants) and
  how each maps to host values
- Composing types: a struct that embeds an enum field
- Storing and retrieving typed values with `env.storage()`, asserting that the
  value read back equals the value written
- Failing loudly when a stored value is read back as the wrong type

## Build

```bash
stellar contract build --manifest-path examples/custom-types/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/custom_types_example.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh custom-types

# Or invoke cargo directly
cargo test --manifest-path examples/custom-types/Cargo.toml
```

## Related documentation

- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
