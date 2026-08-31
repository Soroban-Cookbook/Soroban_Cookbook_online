# Soroban Cookbook Examples

Every directory here is a self-contained Rust crate with a Soroban contract and
its tests. CI runs `cargo test` for each one, so the code published on the
documentation site is always the code that compiles.

Each example has its own README covering what it demonstrates, how to build and
test it, how to deploy it to testnet, and which pattern page it supports.

## Running the examples

```bash
# Test every example (this is what CI runs)
./scripts/test-examples.sh

# Test a single example
./scripts/test-examples.sh counter
```

Contracts build to the shared workspace target directory,
`examples/target/wasm32-unknown-unknown/release/<crate_name>.wasm`.

## Index

| Example | What it covers | Pattern page |
| ------- | -------------- | ------------ |
| [`access-control`](access-control/README.md) | Role-Based Access Control | [Authorization Patterns](https://soroban-cookbook.dev/docs/patterns/authorization) |
| [`authorization`](authorization/README.md) | Owner and Admin Authorization | [Authorization Patterns](https://soroban-cookbook.dev/docs/patterns/authorization) |
| [`balance-snapshot`](balance-snapshot/README.md) | Balance Snapshots | [Token Snapshot Pattern](https://soroban-cookbook.dev/docs/patterns/token-snapshot) |
| [`batch-ops`](batch-ops/README.md) | Batched Operations | [Gas and Resources](https://soroban-cookbook.dev/docs/concepts/gas-and-resources) |
| [`constant-product-amm`](constant-product-amm/README.md) | Constant-Product AMM | [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) |
| [`constructor-init`](constructor-init/README.md) | Constructor args vs delayed initialize | [First Contract](https://soroban-cookbook.dev/docs/getting-started/first-contract) |
| [`contract-factory`](contract-factory/README.md) | Contract Factory | [Contract Factory Pattern](https://soroban-cookbook.dev/docs/patterns/contract-factory) |
| [`counter`](counter/README.md) | Counter | [Storage](https://soroban-cookbook.dev/docs/concepts/storage) |
| [`cross-contract`](cross-contract/README.md) | Cross-Contract Invocation Example | — |
| [`custom-account`](custom-account/README.md) | Custom Account (`__check_auth`) | [Authorization](https://soroban-cookbook.dev/docs/concepts/authorization) |
| [`emergency-stop`](emergency-stop/README.md) | Emergency Stop (Circuit Breaker) | [Lifecycle and Upgrades](https://soroban-cookbook.dev/docs/patterns/lifecycle-upgrades) |
| [`events-catalog`](events-catalog/README.md) | Event Catalog for Indexers | [Events](https://soroban-cookbook.dev/docs/concepts/events) |
| [`error-handling`](error-handling/README.md) | Error Handling | [Error Handling Pattern](https://soroban-cookbook.dev/docs/patterns/error-handling) |
| [`escrow-basic`](escrow-basic/README.md) | Basic Escrow | [Basic Escrow Pattern](https://soroban-cookbook.dev/docs/patterns/escrow-basic) |
| [`escrow-multiparty`](escrow-multiparty/README.md) | Multi-Party Escrow | [Multi-Party Escrow Pattern](https://soroban-cookbook.dev/docs/patterns/escrow-multiparty) |
| [`flash-loan`](flash-loan/README.md) | Flash Loan | [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) |
| [`hello-world`](hello-world/README.md) | Hello World | [Hello World Pattern](https://soroban-cookbook.dev/docs/patterns/hello-world) |
| [`htlc-swap`](htlc-swap/README.md) | Hashed Timelock Contract (HTLC) Swap | [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) |
| [`lending`](lending/README.md) | Collateralized Lending (LTV, oracle freshness, liquidation) | [DeFi Security Patterns](https://soroban-cookbook.dev/docs/security/defi-patterns) |
| [`multisig-wallet`](multisig-wallet/README.md) | Multisig Wallet | [Authorization](https://soroban-cookbook.dev/docs/concepts/authorization) |
| [`oracle-consumer`](oracle-consumer/README.md) | Oracle Consumer | [Oracle Consumer Pattern](https://soroban-cookbook.dev/docs/patterns/oracle-consumer) |
| [`pagination`](pagination/README.md) | Cursor-Based Pagination for Vec and Map Collections | [Gas and Resources](https://soroban-cookbook.dev/docs/concepts/gas-and-resources) |
| [`pausable-token`](pausable-token/README.md) | Pausable Token with Role-Based Access Control | [Authorization](https://soroban-cookbook.dev/docs/patterns/authorization) / [Lifecycle and Upgrades](https://soroban-cookbook.dev/docs/patterns/lifecycle-upgrades) |
| [`reentrancy-guard`](reentrancy-guard/README.md) | Reentrancy Guard | [Reentrancy Guard Pattern](https://soroban-cookbook.dev/docs/patterns/reentrancy-guard) |
| [`refundable-deposit`](refundable-deposit/README.md) | Refundable Deposit | [Authorization Patterns](https://soroban-cookbook.dev/docs/patterns/authorization) |
| [`simple-dao`](simple-dao/README.md) | Simple DAO | [Proposal Lifecycle](https://soroban-cookbook.dev/docs/patterns/proposal-lifecycle) |
| [`simple-voting`](simple-voting/README.md) | Simple Voting | [Proposal Lifecycle](https://soroban-cookbook.dev/docs/patterns/proposal-lifecycle) |
| [`staking`](staking/README.md) | Staking with Epoch Rewards | [Staking Pattern](https://soroban-cookbook.dev/docs/patterns/staking) |
| [`storage-ttl`](storage-ttl/README.md) | Storage TTL / Rent | [Storage Patterns](https://soroban-cookbook.dev/docs/concepts/storage) |
| [`timelock-vault`](timelock-vault/README.md) | Timelock Vault | [Timelock Vault Pattern](https://soroban-cookbook.dev/docs/patterns/timelock-vault) |
| [`tiny-contract`](tiny-contract/README.md) | Tiny contract for WASM size benchmarking | [Optimization Playbook](https://soroban-cookbook.dev/docs/patterns/optimization-playbook) |
| [`token-snapshot`](token-snapshot/README.md) | Token Snapshot | [Token Snapshot Pattern](https://soroban-cookbook.dev/docs/patterns/token-snapshot) |
| [`token-transfer`](token-transfer/README.md) | Token Transfer with Allowance Mechanism | — |
| [`token-vesting`](token-vesting/README.md) | Linear Token Vesting | [Timelock Vault Pattern](https://soroban-cookbook.dev/docs/patterns/timelock-vault) |
| [`token-wrapper`](token-wrapper/README.md) | Token Wrapper with Transfer Fee | [Token Standards](https://soroban-cookbook.dev/docs/patterns/token-standards) |
| [`twap-helper`](twap-helper/README.md) | Time-Weighted Average Price (TWAP) Helper | [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) |
| [`upgradeable`](upgradeable/README.md) | Upgradeable Contract | [Lifecycle and Upgrades](https://soroban-cookbook.dev/docs/patterns/lifecycle-upgrades) |

## Adding an example

See [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example)
for the crate layout, the README template, and the checklist to run before
opening a pull request.
