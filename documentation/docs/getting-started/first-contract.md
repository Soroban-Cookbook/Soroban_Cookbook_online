---
time: 15
sidebar_position: 3
title: Your First Contract
description: Create, build, and test your first Soroban smart contract from scratch — a beginner-friendly introduction to contract development.
steps:
  - Creating a New Project
  - Understanding the Code
  - Building Your Contract
  - Testing Your Contract
---

# Your First Contract

Learn how to create, build, and test your first Soroban smart contract.

## Creating a New Project

Create a new Soroban contract project:

```bash
soroban contract init my-first-contract
cd my-first-contract
```

This creates a new project with:

- `Cargo.toml` - Project configuration
- `src/lib.rs` - Contract source code
- `Cargo.lock` - Dependency lock file

## Understanding the Code

Open `src/lib.rs` to see the basic contract structure:

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol};

#[contract]
pub struct HelloContract;

#[contractimpl]
impl HelloContract {
    pub fn hello(env: Env, to: Symbol) -> Symbol {
        symbol_short!("Hello")
    }
}
```

## Building Your Contract

Build the contract to WebAssembly:

```bash
soroban contract build
```

This creates a `.wasm` file in `target/wasm32-unknown-unknown/release/`

## Testing Your Contract

Soroban contracts use standard Rust testing:

```rust
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_hello() {
        let env = Env::default();
        let contract_id = env.register_contract(None, HelloContract);
        let client = HelloContractClient::new(&env, &contract_id);

        let result = client.hello(&symbol_short!("World"));
        assert_eq!(result, symbol_short!("Hello"));
    }
}
```

Run tests:

```bash
cargo test
```

## Next Steps

- [Contract Testing Guide](./contract-testing) - Learn how to write and run tests
- [Building and Compilation](./building-and-compilation) — compile your contract to WASM
- [Deploy to testnet](./deploy-testnet)
- [Learn about storage](../concepts/storage)
- [Explore patterns](../patterns/overview)

## Knowledge Check

Test what you've learned about creating your first Soroban contract.

<Quiz title="First Contract Knowledge Check" questions={[
  {
    id: "fc-q1",
    question: "What command initializes a new Soroban smart contract project?",
    options: [
      "soroban init my-first-contract",
      "soroban contract init my-first-contract",
      "cargo new my-first-contract",
      "soroban new my-first-contract",
    ],
    correctIndex: 1,
    explanation: "The correct command is `soroban contract init my-first-contract`. This initializes a new Soroban project with the proper Cargo.toml, src/lib.rs, and Cargo.lock structure.",
  },
  {
    id: "fc-q2",
    question: "What file format does Soroban compile contracts into?",
    options: [
      "Native binary (.exe)",
      "WebAssembly (.wasm)",
      "JavaScript (.js)",
      "LLVM IR (.ll)",
    ],
    correctIndex: 1,
    explanation: "Soroban contracts are compiled to WebAssembly (.wasm), enabling efficient and secure execution on the Stellar network.",
  },
  {
    id: "fc-q3",
    question: "How do you run tests for your Soroban contract?",
    options: [
      "soroban test",
      "cargo test",
      "rustc --test src/lib.rs",
      "npm test",
    ],
    correctIndex: 1,
    explanation: "Soroban uses standard Rust testing. You run `cargo test`, and tests are defined in a `#[cfg(test)] mod test` block within your contract source file.",
  },
]} />

## Resources

- [Soroban SDK Documentation](https://docs.rs/soroban-sdk)
- [Smart Contract Examples](https://github.com/stellar/soroban-examples)
