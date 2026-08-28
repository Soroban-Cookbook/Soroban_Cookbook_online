---
title: Adding a Tested Code Example
description: How to contribute a new Soroban code example that is validated automatically by CI.
sidebar_position: 2
---

Every code example in the Soroban Cookbook lives in the `examples/` directory at the root of the repository. Each example is a self-contained Rust crate with its own `Cargo.toml` and `src/lib.rs`. The CI pipeline runs `cargo test` for every example on every pull request, so all published snippets are always verified.

## Directory layout

```
examples/
├── Cargo.toml          ← workspace manifest (lists all examples)
├── hello-world/
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs      ← contract code + #[cfg(test)] module
├── counter/
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs
└── <your-example>/
    ├── Cargo.toml
    └── src/
        └── lib.rs
```

## Step-by-step guide

### 1. Create the example directory

Pick a short, kebab-case name that matches the documentation page it supports:

```bash
mkdir -p examples/<your-example>/src
```

### 2. Write `Cargo.toml`

Copy the template below and replace `<your-example>` with your directory name:

```toml
[package]
name = "<your-example>"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
soroban-sdk = { version = "22.0.0", features = ["testutils"] }

[dev-dependencies]
soroban-sdk = { version = "22.0.0", features = ["testutils"] }

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true
```

### 3. Write `src/lib.rs`

Include the contract implementation **and** a `#[cfg(test)]` module with at least one test per public function. Use `env.mock_all_auths()` when your functions call `require_auth`.

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct MyExample;

#[contractimpl]
impl MyExample {
    pub fn do_something(env: Env) -> u32 {
        42
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_do_something() {
        let env = Env::default();
        let id = env.register(MyExample, ());
        let client = MyExampleClient::new(&env, &id);
        assert_eq!(client.do_something(), 42);
    }
}
```

### 4. Register in the workspace

Open `examples/Cargo.toml` and add your new crate to the `members` list:

```toml
[workspace]
members = [
    "hello-world",
    "counter",
    "token-transfer",
    "<your-example>",   # ← add this line
]
resolver = "2"
```

### 5. Run locally before pushing

```bash
# Test only your new example
./scripts/test-examples.sh <your-example>

# Test all examples
./scripts/test-examples.sh
```

Both commands print a clear pass/fail result for each crate.

### 6. Link to the docs

In your documentation page (`.md` or `.mdx`), reference the example naturally in code fences. The tested source in `examples/` is the source of truth; keep the two in sync.

## CI integration

The `test-examples` job in `.github/workflows/ci.yml` runs `./scripts/test-examples.sh` on every pull request and push to `main`. A failing example blocks the PR from merging.

If your PR introduces a new example, CI will automatically pick it up because the script discovers every sub-directory in `examples/` that contains a `Cargo.toml`.

## Checklist before submitting

- [ ] `examples/<your-example>/Cargo.toml` exists and lists `soroban-sdk` as a dependency
- [ ] `examples/<your-example>/src/lib.rs` compiles with `cargo build`
- [ ] Every public function has at least one test in `#[cfg(test)]`
- [ ] `cargo test --manifest-path examples/<your-example>/Cargo.toml` exits 0
- [ ] `<your-example>` is listed in `examples/Cargo.toml`
- [ ] The documentation page references the same code

## Troubleshooting

**`cargo` not found**
Install Rust: https://www.rust-lang.org/tools/install

**`soroban_sdk` version mismatch**
Check the latest version on [docs.rs](https://docs.rs/soroban-sdk/latest) and update `Cargo.toml` accordingly.

**Test compilation errors**
Make sure `[lib] crate-type` includes `"rlib"`. Without it, the test harness cannot link the crate.

**`env.register` vs `env.register_contract`**
Use `env.register(MyContract, ())` (SDK ≥ 21). The older `env.register_contract` was removed in recent releases.

## Marking blocks as illustrative

Not every rust block in the docs needs a tested example. Anti-patterns,
conceptual snippets, and partial code fragments that exist only to explain
a concept should be marked with the `illustrative` info string:

````markdown
```rust illustrative
// This is an anti-pattern — do not copy this into production.
pub fn bad_example(env: Env) {
    // ...
}
```
````

The `scripts/check-snippets.sh` audit script treats any block tagged
`rust illustrative` as intentionally untested and skips it. Blocks tagged
with plain ` ```rust ` must have a matching directory under `examples/`.

### When to use `illustrative`

- Anti-pattern examples showing what **not** to do
- Partial snippets that only show one function or concept in isolation
- Pseudocode or architecture diagrams in code form
- Versioned migration examples that require complex setup

### When to write a full tested example

- Complete contracts with at least one public function
- Any snippet shown in a "Contract" + "Test" tab pair
- Code referenced as a starting point for contributors

---

## Related links

- [Contributing Guide](/docs/contributing) — full contribution workflow
- [Pattern Library](/docs/patterns/overview) — where examples are documented
- [Internal Linking Strategy](/docs/contributing/internal-linking) — link new pages into the site graph
