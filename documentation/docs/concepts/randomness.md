---
sidebar_position: 12
title: Randomness & Entropy
description: Understand on-chain randomness limitations, secure entropy sources, and safe patterns for Soroban smart contracts — including VDFs, commit-reveal schemes, and oracles.
---

# Randomness & Entropy

Generating unpredictable randomness on a deterministic blockchain is inherently difficult. Every validator must independently agree on the same result, which means no validator can observe "true" randomness from an external source without a trusted bridge. This page covers the sources of randomness available to Soroban contracts, their security properties, and recommended patterns for building safe randomized logic.

## On-Chain Randomness Challenges

Blockchains are deterministic by design — every node replays the same transactions and must reach the same final state. This makes traditional randomness (e.g., `/dev/random` or a hardware entropy source) unavailable inside a contract.

The core problem: **any value visible on-chain is also visible to all participants before they act**. If an attacker can predict or influence the randomness used by your contract, they can exploit it for financial gain.

## Sources of Entropy in Soroban

### Ledger Timestamp / Sequence Number

`env.ledger().sequence()` and `env.ledger().timestamp()` are deterministic values fixed at the start of each ledger. They are trivial for anyone to read and must never be used as the sole source of randomness.

```rust
// ❌ BAD: Predictable — anyone can read the ledger sequence
let pseudo_random = env.ledger().sequence() % 100;
```

### Contract Storage State

Values stored in previous transactions can introduce some variety, but an attacker can observe or even set those values. Using storage alone is not safe for high-stakes randomness.

### Transaction Source / Invoker

`env.invoker()` and transaction metadata are known ahead of time and can be chosen by an attacker. They add no real entropy.

### Cross-Contract Oracle Calls

A trusted oracle contract can deliver randomness from an off-chain source (e.g., a verifiable random function). This is the most secure approach when the oracle is properly decentralised and audited.

```rust
// ✅ GOOD: Request randomness from a trusted oracle
pub fn roll_dice(env: Env, oracle: Address) -> u32 {
    oracle.require_auth();
    let random_value: u32 = env.storage().get(&Symbol::new(&env, "oracle_random")).unwrap_or(0);
    (random_value % 6) + 1
}
```

## Cryptographic Randomness Approaches

### Verifiable Random Functions (VRFs)

A VRF generates a pseudorandom output and a proof that can be verified by anyone. The output is unpredictable as long as the secret key is not compromised. VRF-based oracles (e.g., Chainlink) are a practical choice for Soroban contracts that need high-assurance randomness.

**Flow:**
1. Contract requests randomness from a VRF oracle.
2. Oracle produces output + proof off-chain.
3. Oracle submits the result on-chain; the contract verifies the proof.
4. Contract uses the verified random value.

### Commit-Reveal Schemes

A commit-reveal protocol lets participants commit to a value (without revealing it), then reveal it later. The final randomness is derived from the combination of all revealed values.

**Flow:**
1. Each participant submits a hash of their secret value (`commit`).
2. After all commitments are in, participants reveal their secrets.
3. The contract computes `random = hash(secret_1 || secret_2 || ... || secret_n)`.

Commit-reveal prevents participants from choosing their secret based on others' values, but it requires multiple rounds and cannot prevent last-mover bias entirely.

```rust
use soroban_sdk::{contract, contractimpl, Env, Symbol, Vec, BytesN};

const COMMIT_ROUND: Symbol = symbol_short!("commit");
const REVEAL_ROUND: Symbol = symbol_short!("reveal");

#[contract]
pub struct Lottery;

#[contractimpl]
impl Lottery {
    pub fn commit(env: Env, participant: Address, commitment: BytesN<32>) {
        participant.require_auth();
        env.storage().set(&commitment, &participant);
    }

    pub fn reveal(env: Env, participant: Address, secret: BytesN<32>) {
        participant.require_auth();
        let expected = env.crypto().sha256(&secret);
        // Verify commitment matches; then use secret as entropy source
    }
}
```

### Hash-of-Future-Ledger Approach

A simple but weak approach: use the hash of a future ledger as the entropy source. This is unpredictable at the moment of commitment (you cannot know a future ledger hash), but a validator or block proposer could influence which transactions are included, creating a subtle bias.

```rust
// ⚠️ RISKY: Subject to validator bias
let future_sequence = env.ledger().sequence() + 10;
// ... wait for that ledger ...
let entropy = env.ledger().hash(); // Still predictable after the fact
```

## Predictability Concerns

| Source | Predictable by | Verdict |
|---|---|---|
| `ledger().sequence()` | Anyone | Unsafe |
| `ledger().timestamp()` | Anyone (within seconds) | Unsafe |
| `invoker()` | Caller | Unsafe |
| `crypto().sha256(user_input)` | User who chose input | Unsafe alone |
| Oracle VRF | Oracle operator (if decentralised, hard to bias) | Safe |
| Commit-reveal (n participants) | Last revealer (last-mover bias) | Moderate |

## Common Patterns

### Pattern 1: Oracle-Based Randomness (Recommended for High-Value)

Use a dedicated randomness oracle that exposes a VRF. The contract stores a request ID, the oracle fulfills it in a follow-up transaction, and the contract verifies the proof before using the random value.

**Trade-offs:** Requires trusting the oracle; adds latency (at least one ledger between request and fulfilment).

### Pattern 2: Commit-Reveal (Good for Multi-Party Games)

Each participant contributes entropy, making collusion harder. Best suited for games, raffles, or distributed decision-making where multiple parties are already interacting.

**Trade-offs:** Multiple rounds needed; last participant to reveal gets a small informational advantage.

### Pattern 3: Single-Use Derived Entropy (Low-Value, Low-Cost)

For non-critical use cases (e.g., UI cosmetic shuffling, non-financial sorting), a combination of `ledger().timestamp()` and a nonce stored by the contract may be acceptable — but understand that a motivated validator could bias the result.

## Security Implications

1. **Front-running:** If randomness is derived from a value visible in the mempool, an attacker can observe the transaction and act first.
2. **Validator bias:** Validators who see all pending transactions can choose whether to include or reorder them, affecting ledger-derived entropy.
3. **Oracle manipulation:** A compromised or centralised oracle can return arbitrary values. Always verify the oracle's proof and consider using multiple independent sources.
4. **Replay attacks:** If the same random value is reused across contexts, an attacker can reproduce past outcomes. Always bind randomness to a unique context (contract ID, round number, user).

### Mitigation Checklist

- [ ] Never use `ledger().sequence()` or `ledger().timestamp()` as the sole randomness source.
- [ ] Use a VRF oracle for any randomness that affects financial outcomes.
- [ ] Verify oracle proofs on-chain when using external randomness.
- [ ] Bind random values to a unique context (round, game ID, nonce).
- [ ] For commit-reveal schemes, enforce a minimum number of participants and a reveal deadline.

## Example: Simple Coin Flip (Oracle-Based)

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol, Address};

const RANDOM: Symbol = symbol_short!("random");

#[contract]
pub struct CoinFlip;

#[contractimpl]
impl CoinFlip {
    /// Request a coin flip. The oracle calls back with the result.
    pub fn flip(env: Env, oracle: Address, user: Address) {
        user.require_auth();
        // Store the user for callback
        env.storage().set(&Symbol::short("player"), &user);
        // Request randomness from oracle (simplified)
        oracle.require_auth();
        let result: u32 = env.storage().get(&RANDOM).unwrap_or(0);
        let outcome = if result % 2 == 0 { "heads" } else { "tails" };
        env.storage().set(&Symbol::short("outcome"), &Symbol::new(&env, outcome));
    }

    pub fn get_outcome(env: Env) -> Symbol {
        env.storage().get(&Symbol::short("outcome")).unwrap()
    }
}
```

## Learn more

- [Security Fundamentals](/docs/security/fundamentals) — general security practices for Soroban contracts
- [Cross-Contract Invocation](/docs/concepts/cross-contract-invocation) — safe patterns for calling external contracts (including oracles)
- [Authorization](/docs/concepts/authorization) — access control patterns for sensitive operations
