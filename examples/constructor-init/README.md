# Constructor Arguments (`__constructor`) vs. Delayed `initialize`

Two side-by-side contracts showing the two ways to bootstrap a Soroban
contract's setup state — the modern deploy-time `__constructor`, and the older
delayed `initialize` pattern — including tests for double initialization.

## What it demonstrates

- **`__constructor` (modern, recommended):** deploy-time arguments passed once in
  the same operation that creates the contract. The runtime invokes the
  constructor exactly once at deployment and strips it from the callable
  interface, so double initialization is impossible by construction — no guard
  flag needed.
- **Delayed `initialize` (legacy fallback):** for deployment flows that cannot
  pass a constructor (e.g. factory-deployed Wasm). Requires an
  `AlreadyInitialized` guard and functions that behave safely before setup runs.
- **Double-init tests:** the delayed path rejects a second `initialize`; the
  constructor path enforces single initialization at the SDK level.

New contracts should prefer `__constructor` rather than blindly copying the
older `initialize` + panic-on-double-init pattern.

## Build

```bash
stellar contract build --manifest-path examples/constructor-init/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/constructor_init.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh constructor-init

# Or invoke cargo directly
cargo test --manifest-path examples/constructor-init/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/constructor_init.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Your First Contract](https://soroban-cookbook.dev/docs/getting-started/first-contract) — the next step that links this example
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured