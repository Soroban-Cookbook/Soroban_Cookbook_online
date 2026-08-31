# Pausable Token with Role-Based Access Control

A token contract that composes Role-Based Access Control (RBAC) and an Emergency Stop (circuit breaker), demonstrating strict separation of administrative, operational, and incident-response privileges.

## What it demonstrates

- **Role Separation & Composition**: Assigning distinct roles (`Admin`, `Pauser`, `Manager`, `User`) to eliminate composition bugs where operational roles accidentally gain emergency pause powers or pausers gain mint privileges.
- **Circuit Breaker Guarding**: Applying `fail_if_paused` across token mutations (`transfer`, `transfer_from`, `mint`, `burn`, `approve`) while preserving continuous read-only query availability.
- **Incident Response Flow**: Allowing dedicated `Pauser` keys to quickly halt contract operations during emergencies without requiring full admin multi-sig keys.

## Role Permission Matrix

| Role | Granted By | `pause` / `unpause` | `mint` | `transfer` / `approve` / `burn` | `grant_role` / `revoke_role` | Description |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Admin** | Constructor | ✅ | ✅ | ✅ (as holder) | ✅ | Super-administrator. Manages roles and high-level configuration. |
| **Pauser** | Admin | ✅ | ❌ | ✅ (as holder) | ❌ | Incident-response role. Triggers emergency circuit breaker during active incidents. |
| **Manager** | Admin | ❌ | ✅ | ✅ (as holder) | ❌ | Operational role. Mints tokens, but **cannot pause or unpause**. |
| **User** | Default | ❌ | ❌ | ✅ (when unpaused) | ❌ | Standard token holder. Performs token transfers and approvals. |

### Composition Bug Pitfalls

1. **Admin vs Pauser Separation**: Admin actions typically require multi-sig or timelock governance. Pausing often requires fast automated bots or security operations monitoring. Separating `Pauser` from `Admin` prevents holding super-admin privileges on hot keys.
2. **Manager vs Pauser Isolation**: Operational managers (e.g. daily treasury or bridge minters) should not have the ability to freeze the contract, and emergency responders must not be capable of inflating token supply.
3. **Continuous Query Access**: Even while paused, read-only queries (`balance`, `allowance`, `total_supply`, `is_paused`, `get_role`, metadata) remain open so users and external systems can verify contract state.

## Build

```bash
stellar contract build --manifest-path examples/pausable-token/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/pausable_token.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh pausable-token

# Or invoke cargo directly
cargo test --manifest-path examples/pausable-token/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/pausable_token.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Authorization & Access Control](https://soroban-cookbook.dev/docs/patterns/authorization) — role-based access control pattern
- [Lifecycle and Upgrades](https://soroban-cookbook.dev/docs/patterns/lifecycle-upgrades) — emergency pause and circuit breaker pattern
- [Token Standards](https://soroban-cookbook.dev/docs/patterns/token-standards) — custom token standards and capabilities
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
