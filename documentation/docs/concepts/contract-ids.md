---
sidebar_position: 11
title: Contract IDs & Deploy Salt
description: How Soroban derives contract addresses from a deployer address and salt, and how to compute deployment addresses ahead of time for allowlists and factories.
---

# Contract IDs & Deploy Salt

Every Soroban contract has a **contract ID** — a `C...` StrKey address that uniquely identifies it on the network. Unlike an account address, a contract ID is not chosen; it is *derived* from the way the contract was created. Understanding that derivation lets you predict a contract's address before it is deployed, which matters for allowlisting, factory patterns, and reproducible deployments.

## What a Contract ID Is

A contract ID is a SHA-256 hash, encoded as a StrKey with the `C` prefix (contract addresses use version byte `2` in the StrKey scheme, the same way account addresses use `G`). The hash is computed from a **`ContractIdPreimage`**, which differs depending on how the contract was created:

- **Address-based deployment** (the common case — deploying from an account or another contract): the preimage is built from the *deployer's address* and a **32-byte salt**.
- **Asset-based deployment** (Stellar Asset Contracts): the preimage is built from the Stellar `Asset` itself, so a classic asset always maps to the same contract ID on a given network.

This cookbook focuses on address-based deployment, since that's what the [contract factory pattern](/docs/patterns/contract-factory) and manual `stellar contract deploy` both use.

## How the Address Is Derived

For an address-based deployment, the network combines three inputs into the final contract ID:

1. **Network ID** — the SHA-256 hash of the network passphrase (e.g. `"Test SDF Network ; September 2015"` for testnet). This is why the *same* deployer and salt produce *different* contract IDs on testnet vs. mainnet.
2. **Deployer address** — the account or contract address that submits the deployment.
3. **Salt** — a 32-byte value you choose.

Conceptually:

```text
contract_id = sha256(
  network_id
  || ContractIdPreimage::Address(deployer_address, salt)
)
```

Because every input is known *before* the deployment transaction executes, **the resulting contract ID is fully predictable** — you don't need to wait for the deployment to succeed to know the address it will produce.

### Why the Salt Matters

The salt is the only part of the preimage you control. It exists so that a single deployer address can deploy many contracts with distinct IDs — without it, every contract deployed by the same address would collide on the same ID (the network rejects deploying to an ID that's already in use).

Two consequences follow directly from this:

- **Same deployer + same salt + same network = same contract ID, every time.** This is what makes deployments reproducible: given the deployer and salt, you can compute the address in advance.
- **Same deployer + different salt = different contract ID.** A factory contract increments or otherwise varies the salt on every deployment specifically to avoid collisions (see [Salt Generation](/docs/patterns/contract-factory#salt-generation) in the factory pattern).

## Predicting an Address Before Deployment

Because the ID is deterministic, you can compute a contract's future address as soon as you know the deployer and the salt you intend to use — before you ever send the deployment transaction. This is useful for:

- **Allowlists** — registering a contract's address in another system (an admin panel, a token allowlist, a bridge) before the contract exists on-chain.
- **Circular references** — a contract that needs to know its own child's address (or vice versa) at initialization time, without a second transaction to wire them together.
- **Reproducible deployments** — CI/CD pipelines that need the same contract ID across repeated deployments to the same network, as long as the deployer and salt stay fixed.

### Computing the address with the CLI

The Stellar CLI can compute a deterministic contract ID from a deployer and salt without deploying anything:

```bash
stellar contract id wasm \
  --source my-testnet-account \
  --salt 0000000000000000000000000000000000000000000000000000000000000001 \
  --network testnet
```

This returns the `C...` address that a deployment from `my-testnet-account` using that exact salt (and network) will produce. Run it again with the same source and salt and you get the identical answer — nothing here depends on the deployment actually happening.

For Stellar Asset Contracts, the equivalent lookup is asset-based rather than salt-based:

```bash
stellar contract id asset \
  --asset USDC:GISSUERADDRESS... \
  --network testnet
```

### Computing the address in a contract

Inside a contract, the salt is whatever bytes you pass to the deployer. The [contract factory example](/docs/patterns/contract-factory) derives a fresh salt per deployment from a persistent counter, then deploys with it:

```rust
let salt_index: u64 = env
    .storage()
    .persistent()
    .get(&DataKey::DeployCounter)
    .unwrap_or(0);

let mut salt_bytes = [0u8; 32];
salt_bytes[..8].copy_from_slice(&salt_index.to_le_bytes());
let salt = BytesN::from_array(&env, &salt_bytes);

let child_address = env
    .deployer()
    .with_current_contract(salt)
    .deploy_v2(wasm_hash, ());
```

Because `with_current_contract(salt)` uses the **factory contract's own address** as the deployer, anyone who knows the factory's address and the salt it's about to use can compute `child_address` ahead of time — including off-chain, by replicating the same derivation the CLI performs. If your factory's salt scheme is a simple incrementing counter (as above), the next child address is predictable simply by reading `child_count()` and computing the ID for that index.

## Choosing a Salt Strategy

| Strategy | Predictability | Use When |
|---|---|---|
| Incrementing counter | Fully predictable given current count | Simple factories, sequential deployments |
| `sha256(deterministic input)` (e.g. user address, pool pair) | Predictable by anyone who knows the input | You want a stable, content-addressed ID (e.g. "the pool for token A/B") |
| Random / caller-supplied | Predictable only by whoever chose it | You want deployers to reserve an address in advance without revealing it publicly until deploy time |

Avoid deriving a salt from anything that isn't fixed at the time you need to predict the address (a future ledger timestamp, an oracle value, etc.) — see [Randomness & Entropy](/docs/concepts/randomness) for why unpredictable-until-deployment salts create the same problems as unpredictable randomness elsewhere in a contract.

## Related Reading

- [Contract Factory Pattern](/docs/patterns/contract-factory) — the deployment code this page's examples are drawn from
- [Contract Registry Pattern](/docs/patterns/contract-registry) — mapping stable names to deployed addresses when you'd rather not rely on salt prediction
- [Deploy to Testnet](/docs/getting-started/deploy-testnet) — the manual `stellar contract deploy` workflow
- [Soroban Deployer Docs](https://developers.stellar.org/docs/smart-contracts/deploying) — official reference for `ContractIdPreimage` and the deployer host functions
