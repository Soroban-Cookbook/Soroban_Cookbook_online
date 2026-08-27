---
time: 30
title: Deploy to Mainnet
description: A risk-aware guide to deploying Soroban smart contracts to Stellar mainnet — pre-deploy checklist, release gating, security controls, and post-deploy monitoring.
sidebar_position: 6
---

Deploying to Stellar mainnet is a one-way door: **there is no undo**. Bugs ship with real financial consequences, and the cost to remediate a vulnerability after deployment is always higher than the cost to prevent it before. This guide walks through every stage of a production deployment — from pre-deploy verification through post-deploy monitoring — with explicit safety controls at each step.

> **Complete [Deploy to Testnet](./deploy-testnet.md) first.** Every step in this guide assumes your contract has been deployed, invoked, and fully validated on testnet.

---

## Stage 1: Pre-deploy checklist

Work through every item on this checklist before touching mainnet. Do not skip items and do not deploy if any item is unresolved.

### Code quality

- [ ] All unit tests pass: `cargo test`
- [ ] All integration tests pass against a local or testnet environment
- [ ] No compiler warnings in the production codebase (`RUSTFLAGS="-D warnings" cargo build`)
- [ ] Contract WASM size is within on-chain limits (≤ 64 KB compressed after `stellar contract optimize`)
- [ ] Dependency audit passed: `cargo audit` returns no high-severity findings

### Security review

- [ ] Every public function that mutates state is guarded by `require_auth` or equivalent
- [ ] All arithmetic uses `checked_*` methods or types with overflow protection
- [ ] State is updated **before** any cross-contract call (Checks-Effects-Interactions pattern)
- [ ] All user-supplied inputs are validated (amounts > 0, addresses not zero/self, no out-of-range values)
- [ ] No unbounded loops or collections that grow without limit
- [ ] At least one peer has reviewed the contract logic and the security assumptions
- [ ] Upgrade authority (if any) is locked to a hardware-wallet-controlled admin address

### Testnet validation

- [ ] Contract has been deployed to testnet and every function invoked at least once
- [ ] Error paths and edge cases tested (insufficient balance, unauthorized calls, boundary values)
- [ ] Cross-contract interactions validated end-to-end on testnet
- [ ] Events emitted as expected and decoded correctly
- [ ] Gas consumption per function is within expected budget
- [ ] Storage growth per operation is understood and bounded

### Operational readiness

- [ ] Contract ID will be recorded and backed up immediately after deployment
- [ ] Admin keypair is stored in a hardware wallet or multi-sig
- [ ] Monitoring strategy is in place (see [Stage 4](#stage-4-post-deploy-monitoring))
- [ ] Incident response plan is documented: who is notified, how the contract is paused or migrated
- [ ] Team has reviewed the [Security Fundamentals](../security/fundamentals.md) guide

---

## Stage 2: Configure for mainnet

### Generate and secure a mainnet keypair

Never reuse your testnet keypair on mainnet. Generate a dedicated mainnet identity:

```bash
stellar keys generate --global mainnet-deployer
```

View the public key:

```bash
stellar keys address mainnet-deployer
```

**Store the seed phrase offline.** The deployer key only needs to exist long enough to deploy and initialize the contract. After initialization, transfer admin rights to a hardware wallet address and delete or archive the deployer key.

### Fund the deployer account

Purchase XLM and send it to your deployer public key. You need enough XLM to cover:

- The **base reserve** (currently 0.5 XLM per ledger entry)
- **Transaction fees** for the deploy and initialization calls (typically a few stroop each)
- A buffer for unexpected retry fees

Check your balance before proceeding:

```bash
stellar account balance \
  --account mainnet-deployer \
  --network mainnet
```

### Add the mainnet network

```bash
stellar network add \
  --name mainnet \
  --rpc-url https://mainnet.stellar.validationcloud.io/v1/<your-key> \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

Public RPC endpoints are available from multiple providers (Validation Cloud, Ankr, Stellar Foundation). Use an endpoint you trust, or run your own Horizon/Soroban RPC node for production workloads.

Verify the network is configured:

```bash
stellar network ls
```

---

## Stage 3: Deploy

### Build the production artifact

Always build fresh immediately before deploying. Do not deploy a WASM file built earlier on a different machine.

```bash
cd my-contract
stellar contract build
```

Verify the artifact:

```bash
ls -lh target/wasm32-unknown-unknown/release/my_contract.optimized.wasm
```

Record the SHA-256 hash of the artifact you are about to deploy. This hash is your audit trail:

```bash
sha256sum target/wasm32-unknown-unknown/release/my_contract.optimized.wasm
```

### Simulate the deployment first

Before spending real XLM, simulate the transaction to catch configuration errors:

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/my_contract.optimized.wasm \
  --source mainnet-deployer \
  --network mainnet \
  --sim-only
```

If simulation fails, investigate the error before proceeding.

### Deploy to mainnet

```bash
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/my_contract.optimized.wasm \
  --source mainnet-deployer \
  --network mainnet)

echo "Contract ID: $CONTRACT_ID"
```

> **Record the Contract ID immediately.** Write it to a file, your incident runbook, and your monitoring configuration. A lost Contract ID cannot be recovered — you would need to re-deploy.

```bash
echo "$CONTRACT_ID" > mainnet-contract-id.txt
```

### Initialize the contract

Most production contracts require an initialization call to set the admin address, initial state, or configuration:

```bash
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source mainnet-deployer \
  --network mainnet \
  -- initialize \
  --admin <hardware-wallet-public-key> \
  --other-param <value>
```

> **Set the admin to a hardware wallet or multi-sig address**, not the deployer keypair. The deployer keypair should have no further power after initialization.

### Verify the deployment

Confirm the contract is live and the initialization is correct:

```bash
# Inspect the on-chain contract metadata
stellar contract inspect \
  --id "$CONTRACT_ID" \
  --network mainnet
```

Invoke a read-only function to verify state:

```bash
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source mainnet-deployer \
  --network mainnet \
  -- get_admin
```

Cross-check on a block explorer:

- [Stellar Expert (mainnet)](https://stellar.expert/explorer/public)
- Search for your Contract ID or deployer account address

---

## Stage 4: Post-deploy monitoring

Deployment is not the end of your responsibilities — it is the beginning. A contract that no one is watching is a contract waiting to be exploited.

### What to monitor

| Signal                            | Why it matters                                                 |
| --------------------------------- | -------------------------------------------------------------- |
| Transaction volume per function   | Sudden spikes may indicate an exploit attempt or bot activity  |
| Failed transaction rate           | Rising errors can signal unexpected inputs or state corruption |
| Contract balance / token holdings | Unexplained outflows require immediate investigation           |
| Event emissions                   | Missing or unexpected events reveal logic anomalies            |
| Admin actions                     | Any unauthorized admin call is a critical incident             |
| Storage growth                    | Unbounded growth leads to eventual DoS via fee escalation      |

### How to monitor

**Stellar Expert alerts** — set up address watchers on [stellar.expert](https://stellar.expert/explorer/public) for your contract address and admin address.

**Horizon streaming** — subscribe to the transactions endpoint for your contract:

```bash
curl "https://horizon.stellar.org/accounts/<CONTRACT_ID>/transactions?cursor=now" \
  -H "Accept: text/event-stream"
```

**Custom scripts** — poll the Soroban RPC for ledger entry changes and event history:

```bash
# Fetch recent events for your contract
stellar events \
  --id "$CONTRACT_ID" \
  --network mainnet \
  --count 100
```

**Third-party services** — platforms such as Nansen, Dune, or custom Grafana dashboards can be pointed at Stellar data feeds for sustained production monitoring.

### Setting up alerts

At minimum, configure alerts for:

1. Any call to admin-only functions (mint, upgrade, set_admin)
2. Token balance dropping below a threshold
3. Transaction failure rate exceeding 5 % in a 10-minute window
4. Storage entry count growing faster than expected

---

## Stage 5: Incident response

Even well-audited contracts encounter unexpected situations. Have a plan before you need it.

### Pause mechanisms

If your contract implements a pause flag, keep the admin keypair accessible for emergency use:

```bash
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source admin-hardware-wallet \
  --network mainnet \
  -- set_paused --paused true
```

If your contract does not implement pause, your options are limited to:

- Revoking allowances / approvals at the token level
- Communicating the issue publicly so users stop interacting
- Deploying a migration path if the contract is upgradeable

### Migration / upgrade

If your contract uses the [upgrade pattern](../patterns/lifecycle-upgrades.mdx):

```bash
# Build the patched contract
stellar contract build

# Upload the new WASM (gets a new hash)
stellar contract upload \
  --wasm target/wasm32-unknown-unknown/release/my_contract.optimized.wasm \
  --source admin-hardware-wallet \
  --network mainnet

# Invoke the upgrade entry point with the new hash
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source admin-hardware-wallet \
  --network mainnet \
  -- upgrade --new_wasm_hash <new-hash>
```

> **Test every upgrade on testnet first**, even under time pressure. A broken upgrade transaction on mainnet may be unrecoverable.

### Communication

- Announce incidents on your project's social channels promptly
- Provide a timeline and impact assessment within 24 hours
- Do not downplay the severity — users need accurate information to protect themselves

---

## Mainnet vs testnet: key differences

| Aspect                  | Testnet                     | Mainnet                     |
| ----------------------- | --------------------------- | --------------------------- |
| XLM value               | Free (Friendbot)            | Real monetary value         |
| Reset risk              | Network resets periodically | Permanent — no resets       |
| Contract ID persistence | May be lost after reset     | Permanent                   |
| Fee urgency             | Low                         | Can spike during congestion |
| Explorer                | testnet.stellar.expert      | stellar.expert              |
| RPC endpoint            | soroban-testnet.stellar.org | Provider-specific           |
| Error cost              | Low (no real value)         | High (may be irreversible)  |

---

## Security controls summary

| Control                  | Requirement                            |
| ------------------------ | -------------------------------------- |
| Testnet validation       | Mandatory — all functions tested       |
| Security review          | Mandatory — at least one peer reviewer |
| `cargo audit`            | Mandatory — no high-severity findings  |
| Admin key storage        | Hardware wallet or multi-sig           |
| Deployer key lifecycle   | Create → deploy → initialize → retire  |
| Artifact hash recorded   | Mandatory — recorded before deploy     |
| Post-deploy verification | Mandatory — inspect + read-only call   |
| Monitoring in place      | Mandatory — before going live          |
| Incident response plan   | Documented before going live           |

---

## Complete mainnet deployment checklist

Copy this checklist into your release notes for every mainnet deployment.

### Pre-deploy

- [ ] `cargo test` passes
- [ ] `cargo audit` passes
- [ ] Security review completed and sign-off obtained
- [ ] Testnet validation complete (all functions, error paths, edge cases)
- [ ] WASM artifact built fresh and hash recorded
- [ ] Mainnet account funded with sufficient XLM
- [ ] Admin address is a hardware wallet or multi-sig

### Deploy

- [ ] `--sim-only` simulation passes
- [ ] Contract deployed and Contract ID recorded in at least two places
- [ ] Initialization call succeeded
- [ ] Admin set to hardware wallet / multi-sig (not deployer)
- [ ] Deployer key decommissioned or archived
- [ ] On-chain verification via inspector and block explorer

### Post-deploy

- [ ] Monitoring active (transactions, balances, events, admin actions)
- [ ] Alerts configured for anomalies
- [ ] Incident response plan communicated to team
- [ ] Contract ID and admin address published in project documentation

---

## Next steps

- [Contract Interaction](./contract-interaction.md) — invoke functions on your deployed contract
- [Security Fundamentals](../security/fundamentals.md) — vulnerability classes and mitigation patterns
- [Gas and Resource Management](../concepts/gas-and-resources.md) — control on-chain costs
- [Contract Lifecycle and Upgrades](../patterns/lifecycle-upgrades.mdx) — plan for future upgrades safely

## Additional resources

- [Stellar Expert block explorer](https://stellar.expert/explorer/public)
- [Stellar Status page](https://status.stellar.org)
- [Soroban CLI reference](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli)
- [Stellar Discord — #soroban channel](https://discord.gg/stellardev)
