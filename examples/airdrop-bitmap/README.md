# Airdrop Bitmap Example

Compact bitmap-based allowlist claim tracking for Soroban airdrops.

## Overview

This example demonstrates a lightweight airdrop allowlist using a bitfield
storage pattern. Each allowlist participant has exactly one bit tracked —
once set, further claims from the same address are prevented (panic on
duplicate). This is ideal for small allowlists where Merkle proof overhead
is unnecessary.

## Key Concepts

- **Bitmap**: A `Vec<u8>` where each bit position represents one claimer.
- **Bit indexing**: Derived from the claimer's address hash (`claimer.hash()`).
- **Double-claim guard**: `claim()` panics if the bit is already set, preventing
  replay or double-disbursement.
- **Scalable allocation**: The bitmap `Vec` is resized dynamically if the
  computed bit index exceeds the current allocation.

## Usage

### Initialize

```rust
let bitmap = AirdropBitmap::new(&env, 100); // allow up to ~100 claimants
```

### Claim Airdrop

```rust
AirdropBitmap::claim(&env, &claimer_address);
// Panics if `claimer` has already claimed.
```

### Check Claim Status

```rust
let has_claimed = AirdropBitmap::has_claimed(&env, &claimer_address);
```

## Testing

Run:

```bash
cargo test --manifest-path examples/airdrop-bitmap/Cargo.toml
```

Tests verify:
- First claim succeeds
- Duplicate claim panics (double-claim guard)
- Multiple independent claimants can each claim once
- `has_claimed` correctly tracks state

## Design Notes

- This pattern is distinct from Merkle-proof allowlists (issue #303) — it
  uses direct bit tracking with O(1) check time and no proof generation.
- Best suited for allowlists of up to a few hundred participants.
- For larger allowlists, consider hashing the bitmap or using a Bloom filter
  pattern with configurable false-positive rates.