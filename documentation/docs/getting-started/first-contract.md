# Your First Contract

Learn how to create, build, locally execute, and verify your first Soroban smart contract. This tutorial will walk you through building a simple "Hello World" contract.

## 1. Scaffolding a New Project

Create a new Soroban contract project using the CLI:

```bash
soroban contract init my-first-contract
cd my-first-contract
```

This generates a boilerplate project with the following structure:

- `Cargo.toml`: The configuration file for your Rust project, listing dependencies like `soroban-sdk`.
- `src/lib.rs`: The main contract source code and tests.
- `Cargo.lock`: Auto-generated file containing exact dependency versions.

> **Beginner Tip:** If you're new to Rust, the `Cargo.toml` file is similar to a `package.json` in Node.js. It's where you define your project name, version, and dependencies.

## 2. Writing the Contract Code

Open `src/lib.rs` and replace its contents with the following code. We'll build a contract that returns a personalized greeting.

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, vec, Env, Symbol, Vec};

#[contract]
pub struct HelloContract;

#[contractimpl]
impl HelloContract {
    pub fn hello(env: Env, to: Symbol) -> Vec<Symbol> {
        vec![&env, symbol_short!("Hello"), to]
    }
}
```

### Line-by-Line Explanation

- `#![no_std]`: This ensures the Rust standard library is excluded. Soroban contracts run in a constrained WebAssembly environment where the full standard library isn't available.
- `use soroban_sdk::{...}`: Imports essential types and macros from the Soroban SDK. `Env` provides access to the environment, `Symbol` is a short string, and `Vec` is a growable array.
- `#[contract]`: This macro marks the `HelloContract` struct as the entry point for a Soroban smart contract.
- `pub struct HelloContract;`: Defines an empty struct to which we'll attach our contract functions.
- `#[contractimpl]`: This macro tells the compiler that the following block implements functions that are part of the smart contract interface.
- `pub fn hello(...) -> Vec<Symbol>`: A public function named `hello` that takes the execution environment (`env`) and a `to` parameter (a `Symbol`), returning a vector of symbols.
- `vec![&env, symbol_short!("Hello"), to]`: Constructs and returns a new vector containing the strings "Hello" and whatever was passed as `to`. The `symbol_short!` macro is used for short strings (up to 9 characters).

## 3. Building Your Contract

Compile the contract to WebAssembly (Wasm) using the Soroban CLI:

```bash
soroban contract build
```

This command invokes the Rust compiler and creates a `.wasm` file located at `target/wasm32-unknown-unknown/release/my_first_contract.wasm`. This `.wasm` file is the deployable binary.

## 4. Testing Your Contract

Soroban contracts use standard Rust testing practices. Add this block to the bottom of your `src/lib.rs`:

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

        let words = client.hello(&symbol_short!("Dev"));
        assert_eq!(
            words,
            vec![&env, symbol_short!("Hello"), symbol_short!("Dev"),]
        );
    }
}
```

Run the tests using standard Cargo commands:

```bash
cargo test
```

## 5. Local Execution and Output Verification

You don't need to deploy to a network to run your contract. You can invoke it locally using the `soroban contract invoke` command:

```bash
soroban contract invoke \
  --wasm target/wasm32-unknown-unknown/release/my_first_contract.wasm \
  --id 1 \
  -- \
  hello \
  --to Dev
```

**Output Verification:**
If everything is set up correctly, your terminal should output the resulting vector:

```json
["Hello", "Dev"]
```

## Common Mistakes & Troubleshooting

- **`"symbol_short!"` errors:** The `symbol_short!` macro only works for strings up to 9 characters long. If you use a longer string, use the `Symbol::new(&env, "long_string")` method instead.
- **Missing `target/` directory:** Ensure you ran `soroban contract build` and not just `cargo build`. The soroban CLI ensures it builds specifically for the `wasm32-unknown-unknown` target.
- **Clippy / Cargo Formatting:** If you get compilation warnings or errors, run `cargo fmt` to fix code formatting and `cargo clippy` to catch common mistakes.

## Next Steps

- [Deploy to testnet](./deploy-testnet)
- [Learn about storage](../concepts/storage)
- [Explore patterns](../patterns/overview.md)

## Resources

- [Soroban SDK Documentation](https://docs.rs/soroban-sdk)
- [Smart Contract Examples](https://github.com/stellar/soroban-examples)
