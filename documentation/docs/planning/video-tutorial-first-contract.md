---
title: Video Tutorial Script - First Contract
description: Complete script and production plan for "Your First Soroban Contract" video tutorial
sidebar_label: Video - First Contract
---

# Video Tutorial Script: Your First Soroban Contract

**Duration:** 12-15 minutes  
**Target Audience:** Developers who completed the Getting Started tutorial  
**Difficulty Level:** Beginner  
**Prerequisite:** [Getting Started video](./video-tutorial-getting-started)

## Video Objectives

By the end of this video, viewers will:
- Create a Soroban smart contract project from scratch
- Understand the basic contract structure and macros
- Write, build, and run tests for a contract
- Know how to deploy to Testnet

## Script Structure

### Opening (0:00 - 0:45)

**[VISUAL: VS Code with an empty workspace]**

**Narrator:**
"In the last video, we set up our Soroban development environment. Now let's use it. By the end of this tutorial, you'll have a working smart contract deployed on Stellar Testnet."

**[VISUAL: Quick preview — code being written, tests passing, deployment confirmation]**

**Narrator:**
"We'll build a simple counter contract — it stores a number, lets you increment it, and returns the current count. Simple on the surface, but it demonstrates every foundational concept you need."

---

### Section 1: Creating the Project (0:45 - 2:00)

**[VISUAL: Terminal opens]**

**Narrator:**
"Let's start by creating a new project. Open your terminal:"

**[VISUAL: Command appears with typing animation]**

```bash
soroban contract init my-counter
cd my-counter
```

**[VISUAL: Directory tree reveals in explorer panel]**

**Narrator:**
"Soroban just created our project. Let's look at what we got:"

**[VISUAL: File tree highlighted with annotations]**

```
my-counter/
├── Cargo.toml          ← Project manifest and dependencies
├── Cargo.lock          ← Exact dependency versions
└── src/
    └── lib.rs          ← Our contract code lives here
```

**Narrator:**
"Open this in VS Code:"

```bash
code .
```

---

### Section 2: Understanding Cargo.toml (2:00 - 3:00)

**[VISUAL: VS Code opens Cargo.toml]**

**Narrator:**
"Let's look at Cargo.toml first. This is the heart of a Rust project."

**[VISUAL: File content with highlights]**

```toml
[package]
name = "my-counter"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]   ← This makes it compile to WebAssembly

[dependencies]
soroban-sdk = { version = "22", features = ["alloc"] }
```

**Narrator:**
"`cdylib` tells Rust to produce a dynamic library — which becomes our WASM file. The `soroban-sdk` gives us everything we need to write contracts."

**[CALLOUT: "Always pin your soroban-sdk version in production contracts"]**

---

### Section 3: Writing the Contract (3:00 - 6:30)

**[VISUAL: VS Code opens src/lib.rs, replacing default content]**

**Narrator:**
"Now let's write our counter contract. Open src/lib.rs and replace its contents."

**[VISUAL: File being typed out line by line, narrator explains each section]**

#### Step 1: The Boilerplate

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol};
```

**Narrator:**
"`#![no_std]` tells Rust we don't have a standard library — we're running in a constrained environment. Then we import the tools we need from the Soroban SDK."

#### Step 2: The Contract Struct

```rust
#[contract]
pub struct Counter;
```

**Narrator:**
"The `#[contract]` macro marks this struct as a Soroban smart contract. The struct itself is empty — our state lives in contract storage, not in the struct."

**[CALLOUT: "In Soroban, contract state is stored on the ledger, not in the struct itself"]**

#### Step 3: The Implementation

```rust
#[contractimpl]
impl Counter {
    const COUNT_KEY: Symbol = symbol_short!("COUNT");

    pub fn increment(env: Env) -> i32 {
        let current: i32 = env.storage()
            .instance()
            .get(&Self::COUNT_KEY)
            .unwrap_or(0);
        let new_count = current + 1;
        env.storage()
            .instance()
            .set(&Self::COUNT_KEY, &new_count);
        new_count
    }

    pub fn get_count(env: Env) -> i32 {
        env.storage()
            .instance()
            .get(&Self::COUNT_KEY)
            .unwrap_or(0)
    }

    pub fn reset(env: Env) {
        env.storage()
            .instance()
            .set(&Self::COUNT_KEY, &0_i32);
    }
}
```

**Narrator:**
"The `#[contractimpl]` macro exposes these functions as the contract's public interface."

**[VISUAL: Annotated diagram appearing over the code]**

"Let's walk through `increment`:
- We read the current count from contract storage using the key 'COUNT'
- `unwrap_or(0)` means if no value exists yet, default to zero
- We add 1 and write it back
- Then return the new value

`get_count` is a read-only view — it reads and returns without modifying state.

`reset` sets the counter back to zero."

---

### Section 4: Understanding Storage (6:30 - 7:30)

**[VISUAL: Diagram of storage types]**

**Narrator:**
"Notice we used `env.storage().instance()`. Soroban has three storage types — instance, persistent, and temporary."

**[VISUAL: Table appearing]**

| Type        | Lifetime           | Use Case                       |
|-------------|-------------------|--------------------------------|
| `instance`  | Contract lifetime  | Contract-level state           |
| `persistent`| Until removed      | User data, balances            |
| `temporary` | End of transaction | Scratch space                  |

**Narrator:**
"For a shared counter that belongs to the contract itself, instance storage is perfect. For per-user data like balances, you'd use persistent storage."

**[VISUAL: Link to full storage documentation]**

---

### Section 5: Writing Tests (7:30 - 10:00)

**[VISUAL: VS Code, adding test module at bottom of lib.rs]**

**Narrator:**
"Now let's write tests. In Soroban, tests run in a simulated environment with full ledger access — no running node required."

**[VISUAL: Code being written]**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_initial_count_is_zero() {
        let env = Env::default();
        let contract_id = env.register_contract(None, Counter);
        let client = CounterClient::new(&env, &contract_id);

        assert_eq!(client.get_count(), 0);
    }

    #[test]
    fn test_increment_increases_count() {
        let env = Env::default();
        let contract_id = env.register_contract(None, Counter);
        let client = CounterClient::new(&env, &contract_id);

        assert_eq!(client.increment(), 1);
        assert_eq!(client.increment(), 2);
        assert_eq!(client.increment(), 3);
    }

    #[test]
    fn test_reset_returns_to_zero() {
        let env = Env::default();
        let contract_id = env.register_contract(None, Counter);
        let client = CounterClient::new(&env, &contract_id);

        client.increment();
        client.increment();
        assert_eq!(client.get_count(), 2);

        client.reset();
        assert_eq!(client.get_count(), 0);
    }
}
```

**Narrator:**
"Three things happen in every test:"

**[VISUAL: Each line highlighted as mentioned]**

"1. `Env::default()` creates a simulated Stellar ledger
2. `register_contract` deploys our contract to that environment
3. `CounterClient` is auto-generated by the SDK — it's a type-safe client for calling our contract

This testing model means you can test every edge case without touching a live network."

---

### Section 6: Running the Tests (10:00 - 10:45)

**[VISUAL: Terminal]**

**Narrator:**
"Run the tests:"

```bash
cargo test
```

**[VISUAL: Compilation and test output]**

```
running 3 tests
test tests::test_initial_count_is_zero ... ok
test tests::test_increment_increases_count ... ok
test tests::test_reset_returns_to_zero ... ok

test result: ok. 3 passed; 0 failed
```

**Narrator:**
"All three tests pass. Notice the tests ran in milliseconds — no blockchain, no waiting. That's the power of Soroban's testing model."

---

### Section 7: Building for Deployment (10:45 - 11:30)

**[VISUAL: Terminal]**

**Narrator:**
"Now let's build the deployable WASM file:"

```bash
soroban contract build
```

**[VISUAL: Compilation output]**

```
Compiling my-counter v0.1.0
Finished release [optimized] target(s)
```

**Narrator:**
"Our compiled contract is in:"

```bash
ls target/wasm32-unknown-unknown/release/my_counter.wasm
```

**[VISUAL: File size shown]**

**Narrator:**
"That's our contract — a few kilobytes of WebAssembly ready to deploy."

---

### Section 8: Deploying to Testnet (11:30 - 13:30)

**[VISUAL: Terminal]**

**Narrator:**
"Let's deploy to Testnet. First we need a test account. The Soroban CLI can create one:"

```bash
soroban keys generate --global my-account --network testnet
```

**[VISUAL: Public key output]**

**Narrator:**
"Fund it with the friendbot — Testnet has a faucet that gives you free test tokens:"

```bash
soroban keys fund my-account --network testnet
```

**[VISUAL: Success response]**

**Narrator:**
"Now deploy the contract:"

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/my_counter.wasm \
  --source my-account \
  --network testnet
```

**[VISUAL: Contract ID appears]**

**Narrator:**
"That long string is your contract's address on Testnet. Copy it — we'll use it to call the contract."

**[VISUAL: Contract ID highlighted, CBCOPY animation]**

**Narrator:**
"Let's call it! Try incrementing the counter:"

```bash
soroban contract invoke \
  --id <YOUR_CONTRACT_ID> \
  --source my-account \
  --network testnet \
  -- increment
```

**[VISUAL: Return value "1" appears]**

**Narrator:**
"The contract returned 1. Call it again and you'll get 2. Your contract is live on Testnet."

---

### Section 9: Reading Contract State (13:30 - 14:00)

**[VISUAL: Terminal]**

**Narrator:**
"You can also read state without making a transaction:"

```bash
soroban contract invoke \
  --id <YOUR_CONTRACT_ID> \
  --source my-account \
  --network testnet \
  -- get_count
```

**[VISUAL: Current count returned]**

**Narrator:**
"Read-only calls don't cost fees or require signing in the same way. Perfect for querying state."

---

### Closing & Next Steps (14:00 - 15:00)

**[VISUAL: Split screen — code on left, achievement summary on right]**

**Narrator:**
"Look at what you just did: wrote a smart contract in Rust, tested it in a simulated environment, built it to WebAssembly, and deployed it to a live test network."

**[VISUAL: Animated checklist completing]**
- ✓ Contract written
- ✓ Tests passing
- ✓ Built to WASM
- ✓ Deployed to Testnet

**Narrator:**
"From here, explore the Soroban Cookbook for real-world patterns. Try the token contract, the authorization guide, or the timelock vault."

**[VISUAL: Cards for next tutorials]**

**Narrator:**
"The counter is simple by design — but the same patterns scale to any contract you can imagine. See you in the next one."

**[VISUAL: End screen with links]**

---

## Visual Aids Needed

### Graphics & Animations

1. **Project structure diagram** — Annotated file tree
2. **Storage types table** — Animated comparison
3. **Code annotation overlays** — Arrows pointing to macros and keywords
4. **Test execution flow** — Env → Register → Client → Call
5. **Deploy pipeline diagram** — Code → WASM → Testnet
6. **Achievement checklist** — Animated completion screen
7. **"What's Next" cards** — Link cards to follow-on content

### Screen Recordings Required

1. **Project creation** — soroban init through directory exploration
2. **Cargo.toml walkthrough** — Editor with highlights
3. **Contract code writing** — Live typing with pauses to explain
4. **Test writing** — Adding test module
5. **cargo test run** — Full compilation and output
6. **soroban contract build** — Compilation output
7. **Testnet deployment** — Key generation through invoke
8. **State reading** — get_count call

### Text Overlays

- Macro explanations (#[contract], #[contractimpl], etc.)
- Storage type labels
- Command flags explained
- Contract ID callout
- Error messages and fixes

---

## Recording Technical Specs

Same specs as Getting Started video:
- **Video:** 1920x1080 @ 30fps, MP4 H.264
- **Audio:** 48kHz, 16-bit stereo
- **Terminal:** Dark theme, Fira Code 16pt
- **Editor:** VS Code with One Dark Pro

### Additional Recommendations
- Use a two-pane layout when showing code + terminal side by side
- Zoom in on code sections with tight font sizes
- Record deploy steps in one take to show real wait times

---

## Talking Points for Narrator

### Key Messages to Emphasize

1. **Speed** — "Tests in milliseconds, no node required"
2. **Safety** — "Test everything before it touches the network"
3. **Progression** — "Same patterns scale to any contract"
4. **Simplicity** — "Simple example, real concepts"
5. **Encouragement** — "You just deployed to a live network"

### Concepts to Explain Clearly

- `#![no_std]` — why and what it means
- Struct vs. storage — state lives on the ledger, not in the struct
- `unwrap_or(0)` — safe default handling
- Generated client — magic of SDK, type-safe calls
- Testnet vs. Mainnet — safe to experiment freely

### Common Questions to Preemptively Answer

- "Where does counter state go?" → Ledger storage, not in the struct
- "What does the WASM file contain?" → Your compiled contract logic
- "Can I use this on Mainnet?" → Yes, same process with real funds
- "How do I handle errors?" → Next tutorial — error handling patterns

---

## Production Checklist

### Pre-Production
- [ ] Script reviewed by developer with current SDK version
- [ ] All commands tested on clean machine
- [ ] Visual assets designed
- [ ] Code validated and compiles cleanly
- [ ] Testnet account funded for recording

### Recording
- [ ] Full screen recordings of all commands
- [ ] Code writing sections captured with pauses
- [ ] Test run captured (clean output)
- [ ] Deploy sequence captured (real API calls)
- [ ] Voiceover recorded

### Post-Production
- [ ] Edit and sync narration to screen recording
- [ ] Add callout overlays and annotations
- [ ] Trim dead time (compilation waits can be sped up 3-4x)
- [ ] Add transitions and graphics
- [ ] Review with developer for accuracy

### Quality Assurance
- [ ] Every command verified to work as shown
- [ ] SDK version matches code shown
- [ ] Links in end screen working
- [ ] Captions accurate and timed

---

## Timeline

### Week 1: Pre-Production
- **Day 1:** Script technical review with developer
- **Day 2:** Update commands to latest SDK version
- **Day 3-4:** Visual asset creation and animation design
- **Day 5:** Test all commands on clean environment

### Week 2: Production
- **Day 1-2:** Screen recording sessions (code + terminal)
- **Day 3:** Voiceover recording
- **Day 4-5:** Review footage and audio

### Week 3: Post-Production
- **Day 1-3:** Editing, annotations, graphics integration
- **Day 4:** Audio mix and color grade
- **Day 5:** Internal QA review

### Week 4: Launch
- **Day 1-2:** Developer technical review
- **Day 3:** Accessibility check (captions, contrast)
- **Day 4:** Upload and embed in docs
- **Day 5:** Launch and community announcement

---

## Related Resources

- [Getting Started Setup](/docs/getting-started/setup) — Written companion guide
- [First Contract Doc](/docs/getting-started/first-contract) — Step-by-step written version
- [Storage Concepts](/docs/concepts/storage) — Deep dive into storage types
- [Testing Strategies](/docs/concepts/testing-strategies) — Advanced testing patterns
- [Deploy to Testnet](/docs/getting-started/deploy-testnet) — Full deployment guide
