# Merkle Proof Airdrop Example

Merkle-proof verified airdrop claims: the contract stores only a 32-byte
Merkle root over the allowlist, and claimers prove their inclusion with a
proof generated off-chain.

## What it demonstrates

- **Commit-reveal allowlists**: an admin commits to the whole allowlist by
  storing one Merkle root, computed off-chain over the sorted leaf list.
- **On-chain proof verification**: `claim()` recomputes the root from the
  submitted leaf (index, claimant, amount) and its sibling hashes, then
  compares it to the stored commitment.
- **Domain separation**: leaves are hashed with a `merkle-airdrop-v1` domain
  tag so proofs cannot be replayed across different airdrop contracts.
- **Deterministic odd-node rule**: an odd trailing node is hashed with
  itself (the Bitcoin convention); the operator and the contract must agree
  on this rule.
- **One-time claims**: a packed-byte bitmap (`Map<u32, u8>`) marks claimed
  leaf indices, so each allowlist entry is claimable exactly once.
- **Recovery path**: the admin can `reset()` a bad deployment only while
  nothing has been claimed.

## How it works

1. Off-chain, the operator builds a Merkle tree over the allowlist leaves —
   `sha256("merkle-airdrop-v1" ‖ index ‖ claimant ‖ amount)` per leaf — and
   calls `init(admin, root)`.
2. Each claimant gets their leaf plus the sibling hashes and left/right
   flags along their path to the root (from the operator or a tree explorer).
3. `claim(leaf, sibling_hashes, sibling_is_left)` re-derives the root; on
   match the entry is marked claimed and a `claim` event is published.

Storage cost is O(1) on-chain regardless of allowlist size. For small
allowlists (up to a few hundred entries) the bitmap approach in
[`airdrop-bitmap`](../airdrop-bitmap/README.md) skips proof generation
entirely.

## Build

```bash
stellar contract build --manifest-path examples/merkle-proof/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/merkle_proof.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh merkle-proof

# Or invoke cargo directly
cargo test --manifest-path examples/merkle-proof/Cargo.toml
```

The tests cover both the happy path and the failure surface:

- valid proof claims and marks the index claimed
- tampered proof (flipped sibling flag) rejected
- proof from a different tree / forged leaf rejected
- double claim rejected
- claim before `init` rejected
- `init` twice rejected
- `init` without admin authorization rejected
- forged all-zero proof rejected
- hash/position vector length mismatch rejected
- `reset` before claims succeeds and allows re-init; `reset` after a claim
  is rejected and state survives
- deep (8-leaf, depth-3) tree and odd-node (5-leaf) tree claims

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/merkle_proof.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Authorization](https://soroban-cookbook.dev/docs/concepts/authorization) — how `require_auth` gates claims
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured

## Origin

This example is original to the Soroban Cookbook repository.
