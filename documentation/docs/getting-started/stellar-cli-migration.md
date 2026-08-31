---
time: 15
sidebar_position: 1.8
title: Stellar CLI vs Legacy Soroban CLI Migration Guide
description: Complete command mapping and migration guide from legacy soroban-cli (soroban) to the unified stellar-cli (stellar).
keywords:
  - stellar cli
  - soroban cli
  - cli migration
  - stellar contract
  - soroban command mapping
  - stellar-cli vs soroban-cli
image: /img/soroban-social-card.png
---

# Stellar CLI vs Legacy Soroban CLI

This guide provides a comprehensive migration overview and command mapping table between the historical **`soroban-cli`** (invoked as `soroban`) and the current, official **`stellar-cli`** (invoked as `stellar`).

---

## Background & Unification

During early Soroban testnet releases, smart contract tooling was distributed in a standalone crate called `soroban-cli` providing the `soroban` binary.

To unify smart contract and classic network operations under a single, cohesive developer toolchain, the Stellar Development Foundation renamed and expanded the package to **`stellar-cli`**, accessed via the **`stellar`** binary.

```bash
# Current, recommended installation
cargo install --locked stellar-cli --features opt
```

> [!NOTE]
> All guides and examples across the Soroban Cookbook standardize on the `stellar` binary. If you encounter older documentation or scripts referencing `soroban`, use the mapping table below to find the exact modern equivalent.

---

## Command Mapping Table

| Category | Legacy `soroban` Command | Modern `stellar` Command | Description / Notes |
| :--- | :--- | :--- | :--- |
| **Installation** | `cargo install --locked soroban-cli` | `cargo install --locked stellar-cli --features opt` | Installs CLI with Wasm optimization support |
| **Version** | `soroban --version` | `stellar --version` | Displays installed CLI version and commit hash |
| **Help & Docs** | `soroban contract --help` | `stellar contract --help` | Displays command usage and available subcommands |
| **Project Init** | `soroban contract init <name>` | `stellar contract init <name>` | Scaffolds a new smart contract workspace |
| **Contract Build** | `soroban contract build` | `stellar contract build` | Compiles Rust code into an optimized `.wasm` binary |
| **Contract Optimize** | `soroban contract optimize ...` | `stellar contract optimize ...` | Runs `wasm-opt` passes to reduce bytecode size |
| **Generate Keypair** | `soroban keys generate --global <name>` | `stellar keys generate --global <name>` | Generates and secures a new public/secret keypair |
| **List Keypairs** | `soroban keys list` / `soroban keys ls` | `stellar keys ls` | Lists all locally stored identities |
| **Show Public Key** | `soroban keys show <name>` | `stellar keys address <name>` | Outputs the `G...` Stellar address for an identity |
| **Fund Account** | `soroban config identity fund <name> ...` | `stellar keys fund <name> --network testnet` | Uses Friendbot to fund testnet/futurenet account |
| **Add Network** | `soroban network add --name testnet ...` | `stellar network add --global testnet ...` | Configures RPC endpoint and network passphrase |
| **List Networks** | `soroban network ls` | `stellar network ls` | Displays all configured network endpoints |
| **Deploy Contract** | `soroban contract deploy --wasm <file> ...` | `stellar contract deploy --wasm <file> ...` | Deploys Wasm bytecode and returns Contract ID (`C...`) |
| **Install Bytecode** | `soroban contract install --wasm <file> ...` | `stellar contract install --wasm <file> ...` | Uploads Wasm bytecode without initializing instance |
| **Invoke Function** | `soroban contract invoke --id <id> -- <fn>` | `stellar contract invoke --id <id> -- <fn>` | Invokes a public contract method |
| **Simulate Execution**| `soroban contract invoke ... --simulate` | `stellar contract invoke ... --simulate` | Performs dry-run simulation without submitting tx |
| **Local Sandbox** | `soroban contract invoke --wasm <file> ...` | `stellar contract invoke --wasm <file> ...` | Executes contract in local sandbox without network |
| **Inspect Contract** | `soroban contract inspect --id <id>` | `stellar contract inspect --id <id>` | Inspects functions, types, and contract metadata |
| **Read Contract Info**| `soroban contract info --id <id>` | `stellar contract info --id <id>` | Fetches on-chain bytecode hash and metadata |
| **Fetch Events** | `soroban events --id <id> ...` | `stellar events --id <id> ...` | Streams or queries contract event logs |
| **Manage Snapshots** | `soroban snapshot ...` | `stellar snapshot ...` | Exports/imports local ledger snapshots |

---

## Detailed Command Comparisons

### 1. Project Initialization & Compilation

#### Legacy:
```bash
soroban contract init my-token
cd my-token
soroban contract build
```

#### Modern (`stellar`):
```bash
stellar contract init my-token
cd my-token
stellar contract build
```

The output Wasm file is generated at `target/wasm32-unknown-unknown/release/my_token.wasm`.

---

### 2. Identity Management & Testnet Funding

#### Legacy:
```bash
soroban keys generate --global alice
soroban config identity fund alice --network testnet
soroban account balance --account alice --network testnet
```

#### Modern (`stellar`):
```bash
# Generate keypair
stellar keys generate --global alice

# Fund with testnet Friendbot
stellar keys fund alice --network testnet

# Inspect public address
stellar keys address alice
```

---

### 3. Deploying & Interacting with Contracts

#### Legacy:
```bash
CONTRACT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/my_token.wasm \
  --source alice \
  --network testnet)

soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source alice \
  --network testnet \
  -- mint \
  --to $(soroban keys show alice) \
  --amount 1000
```

#### Modern (`stellar`):
```bash
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/my_token.wasm \
  --source alice \
  --network testnet)

stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source alice \
  --network testnet \
  -- mint \
  --to $(stellar keys address alice) \
  --amount 1000
```

---

## Migration Steps for Developers

If you are upgrading an existing development machine from legacy `soroban-cli` to `stellar-cli`:

1. **Uninstall legacy `soroban-cli`** (optional, to avoid confusion):
   ```bash
   cargo uninstall soroban-cli
   ```

2. **Install current `stellar-cli`**:
   ```bash
   cargo install --locked stellar-cli --features opt
   ```

3. **Verify installation**:
   ```bash
   stellar --version
   ```

4. **Add a Shell Alias (Optional)**:
   If you have legacy scripts or muscle memory using `soroban`, you can alias `soroban` to `stellar` in your shell profile (`~/.zshrc`, `~/.bashrc`, or PowerShell `$PROFILE`):
   ```bash
   alias soroban='stellar'
   ```

---

## Frequently Asked Questions

### Is `soroban-cli` still maintained?
No. `soroban-cli` is deprecated in favor of `stellar-cli`. All new features, security updates, protocol fixes, and performance enhancements are released exclusively in `stellar-cli`.

### Do my existing identities and network configs transfer over?
Yes. Both CLIs store identities and network configurations in standard platform config locations (`~/.config/soroban` or `~/.config/stellar`). `stellar-cli` automatically reads existing identities generated with earlier tools.

### What does `--features opt` do during installation?
The `--features opt` flag embeds `wasm-opt` (via binaryen) directly into `stellar-cli`, allowing `stellar contract build` and `stellar contract optimize` to automatically shrink your contract bytecode down to minimum gas size without requiring manual C++ toolchain installations.

---

## Related Documentation

- [Environment Setup](./setup.md) — complete setup guide for all platforms
- [Building & Compilation](./building-and-compilation.md) — advanced Wasm optimization
- [Deploy to Testnet](./deploy-testnet.md) — full deployment walkthrough
- [Contract Interaction](./contract-interaction.md) — CLI and SDK invocation patterns
