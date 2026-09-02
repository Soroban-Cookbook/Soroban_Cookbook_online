# TTL Bumper

Automated TTL maintenance contract for Stellar / Soroban infrastructure.

Soroban `persistent` storage entries expire when their Time-To-Live (TTL, in
ledgers) reaches zero.  For long-lived infrastructure contracts — oracle feeds,
node reconciliation state, registry entries — expiry silently deletes on-chain
state and breaks dependent systems.

The **TTL Bumper** lets a keeper bot call `bump_keys` to batch-extend the TTL
of multiple registered keys in a single transaction, earning a small XLM bounty
for each key successfully extended.

## What it demonstrates

- **Registry pattern** — admin registers/deregisters target keys with per-key
  threshold and target TTL metadata (split into `registry.rs` module)
- **Batch execution** — up to `MAX_BATCH_SIZE = 20` keys per transaction with
  deterministic resource cost; larger fleets split across multiple calls
- **Keeper incentives** — bounty pool funded by admin; keepers earn
  `bounty_per_key` stroops per at-risk key extended
- **Bounty exhaustion prevention** — bumps only pay out when
  `simulated_ttl ≤ threshold`; healthy keys are skipped without a bounty
- **Admin-only configuration** — `register_key`, `deregister_key`,
  `fund_bounty_pool`, and `set_bounty_per_key` are all guarded by
  `admin.require_auth()`
- **Keeper auth** — `bump_keys` requires the keeper to sign the call
- **Event emission** — pool funding, key registration/deregistration, and
  successful bumps all emit on-chain events for off-chain indexers

## Build

```bash
stellar contract build --manifest-path examples/ttl-bumper/Cargo.toml
```

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh ttl-bumper

# Or invoke cargo directly
cargo test --manifest-path examples/ttl-bumper/Cargo.toml
```

## Deploy and Usage

```bash
# 1. Deploy
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/ttl_bumper.wasm \
  --source admin-key \
  --network testnet

# 2. Initialise (1 000 stroops bounty per key extended)
stellar contract invoke --id <ID> --source admin-key --network testnet \
  -- init --admin <ADMIN_ADDRESS> --bounty_per_key_amount 1000

# 3. Fund the bounty pool
stellar contract invoke --id <ID> --source admin-key --network testnet \
  -- fund_bounty_pool --amount 10000000

# 4. Register a key for maintenance
stellar contract invoke --id <ID> --source admin-key --network testnet \
  -- register_key \
  --contract <TARGET_CONTRACT> \
  --key_name PriceData \
  --threshold 500 \
  --extend_to 518400

# 5. Keeper submits a batch bump (cron job / bot)
stellar contract invoke --id <ID> --source keeper-key --network testnet \
  -- bump_keys \
  --keeper <KEEPER_ADDRESS> \
  --targets '[{"contract":"<TARGET_CONTRACT>","key_name":"PriceData","simulated_ttl":450}]'
```

## Architecture

```
Admin ──► register_key(contract, key_name, threshold, extend_to)
Admin ──► fund_bounty_pool(amount)
Admin ──► set_bounty_per_key(amount)

Keeper Bot (cron) ──► bump_keys(keeper, [BumpTarget…])
                          │
                          ├─ for each target:
                          │    look up registry
                          │    if ttl ≤ threshold → extend + credit bounty
                          │    else → skip (no bounty paid)
                          │
                          └─ emit "bumped" event with keys_extended + earned
```

## Storage layout

| Key | Storage | Description |
|-----|---------|-------------|
| `DataKey::Admin` | Instance | Admin address |
| `DataKey::BountyPool` | Persistent | Pool balance (stroops) |
| `DataKey::BountyPerKey` | Persistent | Bounty per extension (stroops) |
| `DataKey::Count` | Persistent | Total registered entries |
| `DataKey::Entry(contract, key)` | Persistent | `RegistryEntry` metadata |
| `CtrKey::KeeperBalance(addr)` | Persistent | Accrued bounty per keeper |

## Related documentation

- [Soroban Storage TTL](https://developers.stellar.org/docs/smart-contracts/storage)
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview)
- [Batch Operations Pattern](https://soroban-cookbook.dev/docs/patterns/batch-ops)
